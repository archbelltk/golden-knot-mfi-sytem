import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  type CreateLoanProductInput,
  type CurrentUser,
  type LoanDisclosurePreviewInput,
  type UpdateLoanProductInput,
} from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegulatoryParamsService } from '../regulatory-params/regulatory-params.service';
import { AmortizationService } from '../loan-accounts/amortization.service';

// Stateless — no injected dependencies — so it's cheap to instantiate directly
// here rather than wiring a cross-module import for a single calculation.
const amortization = new AmortizationService();

const MAX_RATE_KEY = 'MAX_INTEREST_RATE';

@Injectable()
export class LoanProductsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private regulatoryParams: RegulatoryParamsService,
  ) {}

  async create(input: CreateLoanProductInput, actor: CurrentUser) {
    const cap = await this.regulatoryParams.findCurrent(
      MAX_RATE_KEY,
      input.currency,
    );
    if (
      cap &&
      typeof cap.value === 'number' &&
      input.interestRate > cap.value
    ) {
      throw new BadRequestException(
        `Interest rate ${input.interestRate} exceeds the configured RBZ cap of ${cap.value} for ${input.currency}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.loanProduct.create({
        data: {
          name: input.name,
          code: input.code,
          currency: input.currency,
          interestType: input.interestType,
          interestRate: input.interestRate,
          feeSchedule: input.feeSchedule,
          minTenorMonths: input.minTenorMonths,
          maxTenorMonths: input.maxTenorMonths,
          repaymentFrequency: input.repaymentFrequency,
          gracePeriodDays: input.gracePeriodDays,
        },
      });

      await this.auditService.record(
        {
          entityType: 'LoanProduct',
          entityId: product.id,
          action: AuditAction.CREATE,
          actorId: actor.id,
          actorRole: actor.role,
          after: product,
        },
        tx,
      );

      return product;
    });
  }

  findAll(includeInactive = false) {
    return this.prisma.loanProduct.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.loanProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Loan product not found');
    return product;
  }

  async update(id: string, input: UpdateLoanProductInput, actor: CurrentUser) {
    const before = await this.findOne(id);

    const currency = input.currency ?? before.currency;
    const interestRate = input.interestRate ?? Number(before.interestRate);
    if (input.interestRate !== undefined) {
      const cap = await this.regulatoryParams.findCurrent(MAX_RATE_KEY, currency);
      if (cap && typeof cap.value === 'number' && interestRate > cap.value) {
        throw new BadRequestException(
          `Interest rate ${interestRate} exceeds the configured RBZ cap of ${cap.value} for ${currency}`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.loanProduct.update({
        where: { id },
        data: {
          name: input.name,
          currency: input.currency,
          interestType: input.interestType,
          interestRate: input.interestRate,
          feeSchedule: input.feeSchedule,
          minTenorMonths: input.minTenorMonths,
          maxTenorMonths: input.maxTenorMonths,
          repaymentFrequency: input.repaymentFrequency,
          gracePeriodDays: input.gracePeriodDays,
          isActive: input.isActive,
        },
      });

      await this.auditService.record(
        {
          entityType: 'LoanProduct',
          entityId: product.id,
          action: AuditAction.UPDATE,
          actorId: actor.id,
          actorRole: actor.role,
          before,
          after: product,
        },
        tx,
      );

      return product;
    });
  }

  /**
   * Only permitted when nothing has ever been written against this product —
   * loan applications/accounts snapshot the product's terms onto themselves,
   * so once either exists the product is load-bearing for real financial
   * records and must be retired via `isActive`, never deleted.
   */
  async remove(id: string, actor: CurrentUser) {
    const product = await this.findOne(id);

    const [applicationCount, accountCount] = await Promise.all([
      this.prisma.loanApplication.count({ where: { productId: id } }),
      this.prisma.loanAccount.count({ where: { productId: id } }),
    ]);
    if (applicationCount > 0 || accountCount > 0) {
      throw new ConflictException(
        'This product has loan applications or accounts against it and cannot be deleted — deactivate it instead.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.loanProduct.delete({ where: { id } });

      await this.auditService.record(
        {
          entityType: 'LoanProduct',
          entityId: id,
          action: AuditAction.DELETE,
          actorId: actor.id,
          actorRole: actor.role,
          before: product,
        },
        tx,
      );
    });
  }

  /**
   * Powers the mandatory pre-application disclosure (SRS 3.1.4 / 3.2.2):
   * effective rate, total cost of credit, and full schedule, computed the
   * same way disbursement will compute it, before the client commits.
   */
  async disclosurePreview(input: LoanDisclosurePreviewInput) {
    const product = await this.findOne(input.productId);
    if (
      input.tenorMonths < product.minTenorMonths ||
      input.tenorMonths > product.maxTenorMonths
    ) {
      throw new BadRequestException(
        `Tenor must be between ${product.minTenorMonths} and ${product.maxTenorMonths} months for this product`,
      );
    }

    const today = new Date();
    const schedule = amortization.generateSchedule({
      principal: input.principal,
      monthlyRate: Number(product.interestRate),
      tenorMonths: input.tenorMonths,
      interestType: product.interestType,
      repaymentFrequency: product.repaymentFrequency,
      disbursementDate: today,
      feeSchedule: product.feeSchedule as {
        type: 'FLAT' | 'PERCENT_OF_PRINCIPAL';
        amount: number;
      }[],
    });

    const totalInterest = round2(
      schedule.reduce((sum, l) => sum + l.interestDue, 0),
    );
    const totalFees = round2(schedule.reduce((sum, l) => sum + l.feesDue, 0));
    const totalRepayable = round2(input.principal + totalInterest + totalFees);
    const nominalAnnualRatePercent = round2(
      Number(product.interestRate) * 12 * 100,
    );

    return {
      product: {
        id: product.id,
        name: product.name,
        currency: product.currency,
      },
      principal: input.principal,
      tenorMonths: input.tenorMonths,
      totalInterest,
      totalFees,
      totalRepayable,
      nominalAnnualRatePercent,
      schedule,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

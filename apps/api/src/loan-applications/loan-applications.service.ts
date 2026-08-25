import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalDecision,
  ApprovalLevel,
  AuditAction,
  LoanAccountStatus,
  LoanApplicationStatus,
  Role,
  type CreateLoanApplicationInput,
  type CurrentUser,
  type LoanApplicationDecisionInput,
} from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  assertBranchAccess,
  scopedBranchId,
} from '../common/utils/branch-scope';

const LEVEL_ORDER: ApprovalLevel[] = [
  ApprovalLevel.LOAN_OFFICER,
  ApprovalLevel.BRANCH_MANAGER,
  ApprovalLevel.CREDIT_COMMITTEE,
];

const STATUS_FOR_LEVEL: Record<ApprovalLevel, LoanApplicationStatus> = {
  LOAN_OFFICER: LoanApplicationStatus.PENDING_LOAN_OFFICER,
  BRANCH_MANAGER: LoanApplicationStatus.PENDING_BRANCH_MANAGER,
  CREDIT_COMMITTEE: LoanApplicationStatus.PENDING_CREDIT_COMMITTEE,
};

const ROLE_FOR_LEVEL: Record<ApprovalLevel, Role> = {
  LOAN_OFFICER: Role.LOAN_OFFICER,
  BRANCH_MANAGER: Role.BRANCH_MANAGER,
  CREDIT_COMMITTEE: Role.CREDIT_COMMITTEE,
};

@Injectable()
export class LoanApplicationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private async determineRequiredLevel(
    productId: string,
    currency: string,
    amount: number,
  ): Promise<ApprovalLevel> {
    const thresholds = await this.prisma.approvalThreshold.findMany({
      where: {
        OR: [{ productId }, { productId: null }],
        AND: [{ OR: [{ currency: currency as never }, { currency: null }] }],
      },
    });

    const matching = thresholds.filter(
      (t) =>
        amount >= Number(t.minAmount) &&
        (t.maxAmount === null || amount <= Number(t.maxAmount)),
    );
    if (matching.length === 0) return ApprovalLevel.LOAN_OFFICER;

    return matching.reduce((highest, t) => {
      const level = t.requiredLevel;
      return LEVEL_ORDER.indexOf(level) > LEVEL_ORDER.indexOf(highest)
        ? level
        : highest;
    }, ApprovalLevel.LOAN_OFFICER);
  }

  async create(input: CreateLoanApplicationInput, actor: CurrentUser) {
    const product = await this.prisma.loanProduct.findUnique({
      where: { id: input.productId },
    });
    if (!product) throw new NotFoundException('Loan product not found');

    const client = await this.prisma.client.findUnique({
      where: { id: input.clientId },
    });
    if (!client) throw new NotFoundException('Client not found');
    assertBranchAccess(actor, client.branchId);

    if (
      input.requestedTenorMonths < product.minTenorMonths ||
      input.requestedTenorMonths > product.maxTenorMonths
    ) {
      throw new BadRequestException(
        `Tenor must be between ${product.minTenorMonths} and ${product.maxTenorMonths} months for this product`,
      );
    }

    const requiredLevel = await this.determineRequiredLevel(
      input.productId,
      product.currency,
      input.requestedPrincipal,
    );

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.loanApplication.create({
        data: {
          clientId: input.clientId,
          productId: input.productId,
          requestedPrincipal: input.requestedPrincipal,
          requestedTenorMonths: input.requestedTenorMonths,
          status: STATUS_FOR_LEVEL[ApprovalLevel.LOAN_OFFICER],
          requiredLevel,
          currentLevel: ApprovalLevel.LOAN_OFFICER,
          // Zod's `acknowledgeDisclosure: z.literal(true)` already rejects the
          // request before this point if the disclosure wasn't acknowledged.
          disclosureAcknowledgedAt: new Date(),
          disclosureAcknowledgedBy: actor.id,
        },
      });

      await this.auditService.record(
        {
          entityType: 'LoanApplication',
          entityId: application.id,
          action: AuditAction.CREATE,
          actorId: actor.id,
          actorRole: actor.role,
          after: application,
        },
        tx,
      );

      return application;
    });
  }

  async decide(
    id: string,
    input: LoanApplicationDecisionInput,
    actor: CurrentUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.loanApplication.findUnique({
        where: { id },
        include: { product: true, client: true },
      });
      if (!application)
        throw new NotFoundException('Loan application not found');
      assertBranchAccess(actor, application.client.branchId);

      if (
        application.currentLevel !== input.level ||
        application.status !== STATUS_FOR_LEVEL[input.level]
      ) {
        throw new BadRequestException(
          `Application is not currently pending decision at level ${input.level}`,
        );
      }
      if (
        actor.role !== Role.ADMIN &&
        actor.role !== ROLE_FOR_LEVEL[input.level]
      ) {
        throw new ForbiddenException(
          `Only a ${ROLE_FOR_LEVEL[input.level]} can decide at this level`,
        );
      }

      await tx.loanApproval.create({
        data: {
          loanApplicationId: id,
          level: input.level,
          approverId: actor.id,
          decision: input.decision,
          comment: input.comment,
        },
      });

      let nextStatus: LoanApplicationStatus;
      let nextLevel: ApprovalLevel | null = null;

      if (input.decision === ApprovalDecision.REJECTED) {
        nextStatus = LoanApplicationStatus.REJECTED;
      } else if (input.decision === ApprovalDecision.RETURNED) {
        nextStatus = LoanApplicationStatus.DRAFT;
      } else {
        const isFinalLevel =
          LEVEL_ORDER.indexOf(input.level) >=
          LEVEL_ORDER.indexOf(application.requiredLevel);
        if (isFinalLevel) {
          nextStatus = LoanApplicationStatus.APPROVED;
        } else {
          nextLevel = LEVEL_ORDER[LEVEL_ORDER.indexOf(input.level) + 1];
          nextStatus = STATUS_FOR_LEVEL[nextLevel];
        }
      }

      const updated = await tx.loanApplication.update({
        where: { id },
        data: { status: nextStatus, currentLevel: nextLevel },
      });

      await this.auditService.record(
        {
          entityType: 'LoanApplication',
          entityId: id,
          action:
            input.decision === ApprovalDecision.APPROVED
              ? AuditAction.APPROVE
              : AuditAction.REJECT,
          actorId: actor.id,
          actorRole: actor.role,
          before: { status: application.status },
          after: { status: updated.status, decision: input.decision },
        },
        tx,
      );

      if (nextStatus === LoanApplicationStatus.APPROVED) {
        const loanAccount = await tx.loanAccount.create({
          data: {
            loanApplicationId: id,
            clientId: application.clientId,
            productId: application.productId,
            principal: application.requestedPrincipal,
            currency: application.product.currency,
            interestRate: application.product.interestRate,
            interestType: application.product.interestType,
            tenorMonths: application.requestedTenorMonths,
            repaymentFrequency: application.product.repaymentFrequency,
            gracePeriodDays: application.product.gracePeriodDays,
            status: LoanAccountStatus.PENDING_DISBURSEMENT,
          },
        });

        await this.auditService.record(
          {
            entityType: 'LoanAccount',
            entityId: loanAccount.id,
            action: AuditAction.CREATE,
            actorId: actor.id,
            actorRole: actor.role,
            after: loanAccount,
          },
          tx,
        );

        return { application: updated, loanAccount };
      }

      return { application: updated };
    });
  }

  findAll(filters: { status?: string; clientId?: string }, actor: CurrentUser) {
    const branchId = scopedBranchId(actor);
    return this.prisma.loanApplication.findMany({
      where: {
        status: filters.status as never,
        clientId: filters.clientId,
        client: branchId ? { branchId } : undefined,
      },
      include: { client: true, product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: CurrentUser) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: {
        client: true,
        product: true,
        approvals: true,
        loanAccount: true,
      },
    });
    if (!application) throw new NotFoundException('Loan application not found');
    assertBranchAccess(actor, application.client.branchId);
    return application;
  }
}

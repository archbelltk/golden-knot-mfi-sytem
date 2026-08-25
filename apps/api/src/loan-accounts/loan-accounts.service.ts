import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  LoanAccountStatus,
  ScheduleLineStatus,
  TransactionType,
  type CurrentUser,
  type DisburseLoanInput,
} from '@golden-knot/shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LedgerPostingService } from '../ledger/ledger-posting.service';
import { AmortizationService } from './amortization.service';
import {
  assertBranchAccess,
  scopedBranchId,
} from '../common/utils/branch-scope';

const GL_LOAN_PORTFOLIO = '1100';
const GL_CASH_BANK = '1000';
const GL_LOAN_LOSS_PROVISION = '1150';

type Tx = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class LoanAccountsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private ledgerPosting: LedgerPostingService,
    private amortization: AmortizationService,
  ) {}

  private async glAccount(tx: Tx, code: string) {
    const account = await tx.gLAccount.findUnique({ where: { code } });
    if (!account)
      throw new BadRequestException(
        `Chart of accounts is missing GL account ${code} — run the seed`,
      );
    return account;
  }

  async findAll(
    filters: { clientId?: string; status?: string },
    actor: CurrentUser,
  ) {
    const branchId = scopedBranchId(actor);
    return this.prisma.loanAccount.findMany({
      where: {
        clientId: filters.clientId,
        status: filters.status as never,
        client: branchId ? { branchId } : undefined,
      },
      include: { client: true, product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: CurrentUser) {
    const account = await this.prisma.loanAccount.findUnique({
      where: { id },
      include: {
        client: true,
        product: true,
        scheduleLines: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    if (!account) throw new NotFoundException('Loan account not found');
    assertBranchAccess(actor, account.client.branchId);
    return account;
  }

  async schedule(id: string, actor: CurrentUser) {
    const account = await this.prisma.loanAccount.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!account) throw new NotFoundException('Loan account not found');
    assertBranchAccess(actor, account.client.branchId);

    return this.prisma.repaymentScheduleLine.findMany({
      where: { loanAccountId: id },
      orderBy: { installmentNumber: 'asc' },
    });
  }

  async disburse(id: string, input: DisburseLoanInput, actor: CurrentUser) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.loanAccount.findUnique({
        where: { id },
        include: { product: true, client: true },
      });
      if (!account) throw new NotFoundException('Loan account not found');
      assertBranchAccess(actor, account.client.branchId);
      if (account.status !== LoanAccountStatus.PENDING_DISBURSEMENT) {
        throw new BadRequestException(
          `Loan account is not pending disbursement (status: ${account.status})`,
        );
      }

      const principal = Number(account.principal);
      const scheduleDrafts = this.amortization.generateSchedule({
        principal,
        monthlyRate: Number(account.interestRate),
        tenorMonths: account.tenorMonths,
        interestType: account.interestType,
        repaymentFrequency: account.repaymentFrequency,
        disbursementDate: input.disbursementDate,
        feeSchedule: account.product.feeSchedule as {
          type: 'FLAT' | 'PERCENT_OF_PRINCIPAL';
          amount: number;
        }[],
      });

      await tx.repaymentScheduleLine.createMany({
        data: scheduleDrafts.map((line) => ({
          loanAccountId: id,
          installmentNumber: line.installmentNumber,
          dueDate: line.dueDate,
          principalDue: line.principalDue,
          interestDue: line.interestDue,
          feesDue: line.feesDue,
          status: ScheduleLineStatus.PENDING,
        })),
      });

      const maturityDate =
        scheduleDrafts[scheduleDrafts.length - 1]?.dueDate ??
        input.disbursementDate;

      const updated = await tx.loanAccount.update({
        where: { id },
        data: {
          status: LoanAccountStatus.ACTIVE,
          disbursementDate: input.disbursementDate,
          maturityDate,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          loanAccountId: id,
          type: TransactionType.DISBURSEMENT,
          amount: principal,
          currency: account.currency,
          channel: input.channel,
          reference: input.reference,
          recordedBy: actor.id,
        },
      });

      const loanPortfolio = await this.glAccount(tx, GL_LOAN_PORTFOLIO);
      const cashBank = await this.glAccount(tx, GL_CASH_BANK);

      await this.ledgerPosting.post(tx, {
        reference: `DISB-${transaction.id}`,
        description: `Disbursement of loan ${id}`,
        period: periodOf(input.disbursementDate),
        transactionId: transaction.id,
        actor,
        lines: [
          {
            glAccountId: loanPortfolio.id,
            debit: principal,
            currency: account.currency,
            narrative: 'Loan principal disbursed',
          },
          {
            glAccountId: cashBank.id,
            credit: principal,
            currency: account.currency,
            narrative: 'Cash/bank paid out',
          },
        ],
      });

      await this.auditService.record(
        {
          entityType: 'LoanAccount',
          entityId: id,
          action: AuditAction.STATUS_CHANGE,
          actorId: actor.id,
          actorRole: actor.role,
          before: { status: account.status },
          after: {
            status: updated.status,
            disbursementDate: input.disbursementDate,
          },
        },
        tx,
      );

      return updated;
    });
  }

  async writeOff(id: string, actor: CurrentUser) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.loanAccount.findUnique({
        where: { id },
        include: { scheduleLines: true, client: true },
      });
      if (!account) throw new NotFoundException('Loan account not found');
      assertBranchAccess(actor, account.client.branchId);
      if (
        account.status === LoanAccountStatus.WRITTEN_OFF ||
        account.status === LoanAccountStatus.CLOSED
      ) {
        throw new BadRequestException(
          `Loan account cannot be written off from status ${account.status}`,
        );
      }

      const outstanding = account.scheduleLines.reduce(
        (sum, l) => sum + Number(l.principalDue) - Number(l.principalPaid),
        0,
      );
      if (outstanding <= 0) {
        throw new BadRequestException(
          'No outstanding principal balance to write off',
        );
      }

      const updated = await tx.loanAccount.update({
        where: { id },
        data: { status: LoanAccountStatus.WRITTEN_OFF },
      });

      const transaction = await tx.transaction.create({
        data: {
          loanAccountId: id,
          type: TransactionType.WRITE_OFF,
          amount: outstanding,
          currency: account.currency,
          channel: 'INTERNAL',
          recordedBy: actor.id,
        },
      });

      const provision = await this.glAccount(tx, GL_LOAN_LOSS_PROVISION);
      const loanPortfolio = await this.glAccount(tx, GL_LOAN_PORTFOLIO);

      await this.ledgerPosting.post(tx, {
        reference: `WO-${transaction.id}`,
        description: `Write-off of loan ${id}`,
        period: periodOf(new Date()),
        transactionId: transaction.id,
        actor,
        lines: [
          {
            glAccountId: provision.id,
            debit: outstanding,
            currency: account.currency,
            narrative: 'Loan loss provision utilised',
          },
          {
            glAccountId: loanPortfolio.id,
            credit: outstanding,
            currency: account.currency,
            narrative: 'Loan principal written off',
          },
        ],
      });

      await this.auditService.record(
        {
          entityType: 'LoanAccount',
          entityId: id,
          action: AuditAction.STATUS_CHANGE,
          actorId: actor.id,
          actorRole: actor.role,
          before: { status: account.status },
          after: { status: updated.status, outstanding },
        },
        tx,
      );

      return updated;
    });
  }
}

function periodOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

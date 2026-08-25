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
  type RecordRepaymentInput,
} from '@golden-knot/shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  LedgerPostingService,
  type PostGLEntryLine,
} from '../ledger/ledger-posting.service';
import { assertBranchAccess } from '../common/utils/branch-scope';

const GL_CASH_BANK = '1000';
const GL_LOAN_PORTFOLIO = '1100';
const GL_INTEREST_INCOME = '4000';
const GL_FEE_INCOME = '4100';

type Tx = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class RepaymentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private ledgerPosting: LedgerPostingService,
  ) {}

  private async glAccount(tx: Tx, code: string) {
    const account = await tx.gLAccount.findUnique({ where: { code } });
    if (!account)
      throw new BadRequestException(
        `Chart of accounts is missing GL account ${code} — run the seed`,
      );
    return account;
  }

  async record(
    loanAccountId: string,
    input: RecordRepaymentInput,
    actor: CurrentUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.loanAccount.findUnique({
        where: { id: loanAccountId },
        include: { client: true },
      });
      if (!account) throw new NotFoundException('Loan account not found');
      assertBranchAccess(actor, account.client.branchId);
      if (
        account.status !== LoanAccountStatus.ACTIVE &&
        account.status !== LoanAccountStatus.ARREARS
      ) {
        throw new BadRequestException(
          `Loan account is not active (status: ${account.status})`,
        );
      }

      const lines = await tx.repaymentScheduleLine.findMany({
        where: {
          loanAccountId,
          status: {
            in: [
              ScheduleLineStatus.PENDING,
              ScheduleLineStatus.PARTIAL,
              ScheduleLineStatus.OVERDUE,
            ],
          },
        },
        orderBy: { installmentNumber: 'asc' },
      });

      let remaining = input.amount;
      let feesAllocated = 0;
      let interestAllocated = 0;
      let principalAllocated = 0;

      for (const line of lines) {
        if (remaining <= 0) break;

        const feesOwed = Number(line.feesDue) - Number(line.feesPaid);
        const feesToPay = Math.min(remaining, feesOwed);
        remaining -= feesToPay;
        feesAllocated += feesToPay;

        const interestOwed =
          Number(line.interestDue) - Number(line.interestPaid);
        const interestToPay = Math.min(remaining, interestOwed);
        remaining -= interestToPay;
        interestAllocated += interestToPay;

        const principalOwed =
          Number(line.principalDue) - Number(line.principalPaid);
        const principalToPay = Math.min(remaining, principalOwed);
        remaining -= principalToPay;
        principalAllocated += principalToPay;

        const newFeesPaid = Number(line.feesPaid) + feesToPay;
        const newInterestPaid = Number(line.interestPaid) + interestToPay;
        const newPrincipalPaid = Number(line.principalPaid) + principalToPay;
        const fullyPaid =
          newFeesPaid >= Number(line.feesDue) &&
          newInterestPaid >= Number(line.interestDue) &&
          newPrincipalPaid >= Number(line.principalDue);

        await tx.repaymentScheduleLine.update({
          where: { id: line.id },
          data: {
            feesPaid: newFeesPaid,
            interestPaid: newInterestPaid,
            principalPaid: newPrincipalPaid,
            status: fullyPaid
              ? ScheduleLineStatus.PAID
              : newFeesPaid + newInterestPaid + newPrincipalPaid > 0
                ? ScheduleLineStatus.PARTIAL
                : ScheduleLineStatus.PENDING,
          },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          loanAccountId,
          type: TransactionType.REPAYMENT,
          amount: input.amount,
          currency: account.currency,
          channel: input.channel,
          reference: input.reference,
          recordedBy: actor.id,
        },
      });

      const glLines: PostGLEntryLine[] = [
        {
          glAccountId: (await this.glAccount(tx, GL_CASH_BANK)).id,
          debit: input.amount,
          currency: account.currency,
          narrative: 'Repayment received',
        },
      ];
      if (feesAllocated > 0) {
        glLines.push({
          glAccountId: (await this.glAccount(tx, GL_FEE_INCOME)).id,
          credit: feesAllocated,
          currency: account.currency,
          narrative: 'Fee income',
        });
      }
      if (interestAllocated > 0) {
        glLines.push({
          glAccountId: (await this.glAccount(tx, GL_INTEREST_INCOME)).id,
          credit: interestAllocated,
          currency: account.currency,
          narrative: 'Interest income',
        });
      }
      if (principalAllocated > 0) {
        glLines.push({
          glAccountId: (await this.glAccount(tx, GL_LOAN_PORTFOLIO)).id,
          credit: principalAllocated,
          currency: account.currency,
          narrative: 'Principal repaid',
        });
      }
      // any amount received beyond what's currently owed sits as an unallocated overpayment against cash/loan portfolio
      if (remaining > 0) {
        glLines.push({
          glAccountId: (await this.glAccount(tx, GL_LOAN_PORTFOLIO)).id,
          credit: remaining,
          currency: account.currency,
          narrative: 'Advance/overpayment',
        });
      }

      await this.ledgerPosting.post(tx, {
        reference: `RPY-${transaction.id}`,
        description: `Repayment from ${account.client.firstName} ${account.client.lastName}`,
        period: periodOf(input.paidAt),
        transactionId: transaction.id,
        actor,
        lines: glLines,
      });

      const remainingSchedule = await tx.repaymentScheduleLine.findMany({
        where: { loanAccountId },
      });
      const fullySettled = remainingSchedule.every(
        (l) => l.status === ScheduleLineStatus.PAID,
      );
      if (fullySettled) {
        await tx.loanAccount.update({
          where: { id: loanAccountId },
          data: { status: LoanAccountStatus.CLOSED },
        });
      }

      await this.auditService.record(
        {
          entityType: 'Transaction',
          entityId: transaction.id,
          action: AuditAction.CREATE,
          actorId: actor.id,
          actorRole: actor.role,
          after: {
            transaction,
            feesAllocated,
            interestAllocated,
            principalAllocated,
          },
        },
        tx,
      );

      return {
        transaction,
        feesAllocated,
        interestAllocated,
        principalAllocated,
      };
    });
  }
}

function periodOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

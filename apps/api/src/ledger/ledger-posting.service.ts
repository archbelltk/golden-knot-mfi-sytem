import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AuditAction,
  GLEntryStatus,
  type CurrentUser,
} from '@golden-knot/shared';
import type { Prisma, PrismaClient, Currency } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AccountingPeriodsService } from '../accounting-periods/accounting-periods.service';

type Tx = Prisma.TransactionClient | PrismaClient;

export interface PostGLEntryLine {
  glAccountId: string;
  debit?: number;
  credit?: number;
  currency: Currency;
  narrative?: string;
}

export interface PostGLEntryParams {
  reference: string;
  description: string;
  period: string;
  transactionId?: string;
  lines: PostGLEntryLine[];
  actor: CurrentUser;
}

/**
 * Central entry point for all automated (loan-event-triggered) GL postings.
 * Must always be called with a `tx` that is the SAME Prisma transaction as
 * the domain mutation that triggered it (disbursement, repayment, write-off)
 * — a loan event and its GL entry must commit or fail together.
 */
@Injectable()
export class LedgerPostingService {
  constructor(
    private auditService: AuditService,
    private accountingPeriods: AccountingPeriodsService,
  ) {}

  async post(tx: Tx, params: PostGLEntryParams) {
    await this.accountingPeriods.assertOpen(tx, params.period);

    const totalDebit = params.lines.reduce((sum, l) => sum + (l.debit ?? 0), 0);
    const totalCredit = params.lines.reduce(
      (sum, l) => sum + (l.credit ?? 0),
      0,
    );

    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      throw new BadRequestException(
        `GL entry does not balance: debits=${totalDebit} credits=${totalCredit}`,
      );
    }
    for (const line of params.lines) {
      const debit = line.debit ?? 0;
      const credit = line.credit ?? 0;
      if (debit > 0 === credit > 0) {
        throw new BadRequestException(
          'Each GL entry line must be either a debit or a credit',
        );
      }
    }

    const entry = await tx.gLEntry.create({
      data: {
        transactionId: params.transactionId,
        reference: params.reference,
        description: params.description,
        period: params.period,
        status: GLEntryStatus.POSTED,
        makerId: params.actor.id,
        postedAt: new Date(),
        lines: {
          create: params.lines.map((l) => ({
            glAccountId: l.glAccountId,
            debit: l.debit ?? 0,
            credit: l.credit ?? 0,
            currency: l.currency,
            narrative: l.narrative,
          })),
        },
      },
      include: { lines: true },
    });

    await this.auditService.record(
      {
        entityType: 'GLEntry',
        entityId: entry.id,
        action: AuditAction.CREATE,
        actorId: params.actor.id,
        actorRole: params.actor.role,
        after: entry,
      },
      tx,
    );

    return entry;
  }
}

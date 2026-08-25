import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AuditAction,
  PeriodStatus,
  type CurrentUser,
} from '@golden-knot/shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type Tx = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class AccountingPeriodsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.accountingPeriod.findMany({
      orderBy: { period: 'desc' },
    });
  }

  /**
   * The single choke point for period-lock enforcement. Called from
   * LedgerPostingService.post() (covers every automated posting) and from
   * JournalEntriesService (covers manual entries, which post on approval
   * rather than creation). A period with no row is implicitly open.
   */
  async assertOpen(tx: Tx, period: string): Promise<void> {
    const record = await tx.accountingPeriod.findUnique({ where: { period } });
    if (record?.status === PeriodStatus.CLOSED) {
      throw new BadRequestException(
        `Accounting period ${period} is closed — no further postings are allowed`,
      );
    }
  }

  async close(period: string, actor: CurrentUser) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.accountingPeriod.findUnique({
        where: { period },
      });
      if (existing?.status === PeriodStatus.CLOSED) {
        throw new BadRequestException(`Period ${period} is already closed`);
      }

      const record = await tx.accountingPeriod.upsert({
        where: { period },
        create: {
          period,
          status: PeriodStatus.CLOSED,
          closedBy: actor.id,
          closedAt: new Date(),
        },
        update: {
          status: PeriodStatus.CLOSED,
          closedBy: actor.id,
          closedAt: new Date(),
        },
      });

      await this.auditService.record(
        {
          entityType: 'AccountingPeriod',
          entityId: record.id,
          action: AuditAction.STATUS_CHANGE,
          actorId: actor.id,
          actorRole: actor.role,
          before: { status: existing?.status ?? 'OPEN' },
          after: { status: record.status },
        },
        tx,
      );

      return record;
    });
  }

  async reopen(period: string, actor: CurrentUser) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.accountingPeriod.findUnique({
        where: { period },
      });
      if (!existing || existing.status !== PeriodStatus.CLOSED) {
        throw new BadRequestException(`Period ${period} is not closed`);
      }

      const record = await tx.accountingPeriod.update({
        where: { period },
        data: { status: PeriodStatus.OPEN, closedBy: null, closedAt: null },
      });

      await this.auditService.record(
        {
          entityType: 'AccountingPeriod',
          entityId: record.id,
          action: AuditAction.STATUS_CHANGE,
          actorId: actor.id,
          actorRole: actor.role,
          before: { status: 'CLOSED' },
          after: { status: record.status },
        },
        tx,
      );

      return record;
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  LoanAccountStatus,
  ParBucket,
  ScheduleLineStatus,
} from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';

function bucketFor(daysInArrears: number): ParBucket {
  if (daysInArrears >= 90) return ParBucket.PAR_90;
  if (daysInArrears >= 30) return ParBucket.PAR_30;
  if (daysInArrears >= 1) return ParBucket.PAR_1;
  return ParBucket.CURRENT;
}

/**
 * Recalculates arrears/PAR bucket once a day rather than per-request, per the
 * SRS's PAR 1/30/90 + NPL classification requirement — these are persisted
 * fields read by reports, not derived on the fly.
 */
@Injectable()
export class ArrearsService {
  private readonly logger = new Logger(ArrearsService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async recalculate() {
    const accounts = await this.prisma.loanAccount.findMany({
      where: {
        status: { in: [LoanAccountStatus.ACTIVE, LoanAccountStatus.ARREARS] },
      },
      include: { scheduleLines: true },
    });

    const now = new Date();
    let updated = 0;

    for (const account of accounts) {
      const overdue = account.scheduleLines.filter(
        (l) => l.status !== ScheduleLineStatus.PAID && l.dueDate < now,
      );
      const daysInArrears =
        overdue.length === 0
          ? 0
          : Math.max(
              ...overdue.map((l) =>
                Math.floor(
                  (now.getTime() - l.dueDate.getTime()) / (1000 * 60 * 60 * 24),
                ),
              ),
            );
      const parBucket = bucketFor(daysInArrears);
      const status =
        daysInArrears > 0
          ? LoanAccountStatus.ARREARS
          : LoanAccountStatus.ACTIVE;

      if (
        account.daysInArrears !== daysInArrears ||
        account.parBucket !== parBucket ||
        account.status !== status
      ) {
        await this.prisma.loanAccount.update({
          where: { id: account.id },
          data: { daysInArrears, parBucket, status },
        });
        updated++;
      }
    }

    this.logger.log(
      `Arrears recalculation complete: ${updated}/${accounts.length} accounts updated`,
    );
  }
}

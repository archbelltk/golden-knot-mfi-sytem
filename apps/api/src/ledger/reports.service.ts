import { Injectable } from '@nestjs/common';
import { GLEntryStatus } from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async trialBalance(period?: string) {
    const accounts = await this.prisma.gLAccount.findMany({
      orderBy: { code: 'asc' },
    });

    const rows = await Promise.all(
      accounts.map(async (account) => {
        const agg = await this.prisma.gLEntryLine.aggregate({
          where: {
            glAccountId: account.id,
            glEntry: { status: GLEntryStatus.POSTED, period },
          },
          _sum: { debit: true, credit: true },
        });
        const debit = Number(agg._sum.debit ?? 0);
        const credit = Number(agg._sum.credit ?? 0);
        return {
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          debit,
          credit,
          balance: debit - credit,
        };
      }),
    );

    const totals = rows.reduce(
      (acc, r) => ({
        debit: acc.debit + r.debit,
        credit: acc.credit + r.credit,
      }),
      { debit: 0, credit: 0 },
    );

    return {
      period: period ?? 'all',
      rows,
      totals,
      balanced: Math.abs(totals.debit - totals.credit) < 0.005,
    };
  }

  async generalLedger(accountCode: string, from?: Date, to?: Date) {
    const account = await this.prisma.gLAccount.findUnique({
      where: { code: accountCode },
    });
    if (!account) return null;

    const lines = await this.prisma.gLEntryLine.findMany({
      where: {
        glAccountId: account.id,
        glEntry: {
          status: GLEntryStatus.POSTED,
          postedAt: { gte: from, lte: to },
        },
      },
      include: { glEntry: true },
      orderBy: { glEntry: { postedAt: 'asc' } },
    });

    let running = 0;
    const entries = lines.map((line) => {
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      running += debit - credit;
      return {
        date: line.glEntry.postedAt,
        reference: line.glEntry.reference,
        description: line.glEntry.description,
        debit,
        credit,
        runningBalance: running,
      };
    });

    return { account, entries };
  }
}

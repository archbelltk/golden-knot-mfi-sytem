import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  GLEntryStatus,
  type CreateJournalEntryInput,
  type CurrentUser,
} from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccountingPeriodsService } from '../accounting-periods/accounting-periods.service';

@Injectable()
export class JournalEntriesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private accountingPeriods: AccountingPeriodsService,
  ) {}

  async create(input: CreateJournalEntryInput, actor: CurrentUser) {
    return this.prisma.$transaction(async (tx) => {
      await this.accountingPeriods.assertOpen(tx, input.period);

      const entry = await tx.gLEntry.create({
        data: {
          reference: `JE-${Date.now()}`,
          description: input.description,
          period: input.period,
          status: GLEntryStatus.PENDING_APPROVAL,
          makerId: actor.id,
          lines: {
            create: input.lines.map((l) => ({
              glAccountId: l.glAccountId,
              debit: l.debit,
              credit: l.credit,
              currency: input.currency,
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
          actorId: actor.id,
          actorRole: actor.role,
          after: entry,
        },
        tx,
      );

      return entry;
    });
  }

  async approve(id: string, actor: CurrentUser) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.gLEntry.findUnique({ where: { id } });
      if (!entry) throw new NotFoundException('Journal entry not found');
      if (entry.status !== GLEntryStatus.PENDING_APPROVAL) {
        throw new BadRequestException(
          'Only entries pending approval can be approved',
        );
      }
      if (entry.makerId === actor.id) {
        throw new ForbiddenException(
          'The maker of a journal entry cannot also approve it',
        );
      }
      await this.accountingPeriods.assertOpen(tx, entry.period);

      const updated = await tx.gLEntry.update({
        where: { id },
        data: {
          status: GLEntryStatus.POSTED,
          checkerId: actor.id,
          postedAt: new Date(),
        },
        include: { lines: true },
      });

      await this.auditService.record(
        {
          entityType: 'GLEntry',
          entityId: id,
          action: AuditAction.APPROVE,
          actorId: actor.id,
          actorRole: actor.role,
          before: { status: entry.status },
          after: { status: updated.status },
        },
        tx,
      );

      return updated;
    });
  }

  findAll(period?: string) {
    return this.prisma.gLEntry.findMany({
      where: { period },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

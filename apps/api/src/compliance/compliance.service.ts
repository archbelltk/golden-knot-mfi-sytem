import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  type ComplianceRecordInput,
  type CurrentUser,
} from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { assertBranchAccess } from '../common/utils/branch-scope';

@Injectable()
export class ComplianceService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async recordScreening(
    clientId: string,
    input: ComplianceRecordInput,
    actor: CurrentUser,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new NotFoundException('Client not found');
    assertBranchAccess(actor, client.branchId);

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.complianceRecord.create({
        data: {
          clientId,
          screeningType: input.screeningType,
          result: input.result,
          reviewedBy: actor.id,
          notes: input.notes,
        },
      });

      await this.auditService.record(
        {
          entityType: 'ComplianceRecord',
          entityId: record.id,
          action: AuditAction.CREATE,
          actorId: actor.id,
          actorRole: actor.role,
          after: record,
        },
        tx,
      );

      return record;
    });
  }

  findForClient(clientId: string) {
    return this.prisma.complianceRecord.findMany({
      where: { clientId },
      orderBy: { reviewedAt: 'desc' },
    });
  }
}

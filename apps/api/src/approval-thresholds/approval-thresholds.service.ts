import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  type CreateApprovalThresholdInput,
  type CurrentUser,
} from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ApprovalThresholdsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.approvalThreshold.findMany({
      orderBy: { minAmount: 'asc' },
    });
  }

  async create(input: CreateApprovalThresholdInput, actor: CurrentUser) {
    return this.prisma.$transaction(async (tx) => {
      const threshold = await tx.approvalThreshold.create({
        data: {
          productId: input.productId ?? undefined,
          currency: input.currency ?? undefined,
          minAmount: input.minAmount,
          maxAmount: input.maxAmount ?? undefined,
          requiredLevel: input.requiredLevel,
        },
      });

      await this.auditService.record(
        {
          entityType: 'ApprovalThreshold',
          entityId: threshold.id,
          action: AuditAction.CREATE,
          actorId: actor.id,
          actorRole: actor.role,
          after: threshold,
        },
        tx,
      );

      return threshold;
    });
  }

  async remove(id: string, actor: CurrentUser) {
    const threshold = await this.prisma.approvalThreshold.findUnique({ where: { id } });
    if (!threshold) throw new NotFoundException('Approval threshold not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.approvalThreshold.delete({ where: { id } });

      await this.auditService.record(
        {
          entityType: 'ApprovalThreshold',
          entityId: id,
          action: AuditAction.DELETE,
          actorId: actor.id,
          actorRole: actor.role,
          before: threshold,
        },
        tx,
      );
    });
  }
}

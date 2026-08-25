import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { AuditAction } from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditParams {
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorId: string;
  actorRole: string;
  before?: unknown;
  after?: unknown;
}

type Tx = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Always call within the same $transaction as the mutation being audited
   * (pass `tx`), so an entity change can never be committed without its
   * audit trail entry.
   */
  async record(params: RecordAuditParams, tx: Tx = this.prisma) {
    return tx.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        actorId: params.actorId,
        actorRole: params.actorRole,
        before: params.before as Prisma.InputJsonValue,
        after: params.after as Prisma.InputJsonValue,
      },
    });
  }

  async findForEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(filters: { entityType?: string; actorId?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType: filters.entityType,
        actorId: filters.actorId,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}

import { Injectable } from '@nestjs/common';
import {
  AuditAction,
  type CreateRegulatoryParameterInput,
  type CurrentUser,
} from '@golden-knot/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RegulatoryParamsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Regulatory parameters are append-only: a "change" is a new row, never an
   * UPDATE, so the full history of RBZ-driven caps/config remains auditable.
   */
  async create(input: CreateRegulatoryParameterInput, actor: CurrentUser) {
    return this.prisma.$transaction(async (tx) => {
      const param = await tx.regulatoryParameter.create({
        data: {
          key: input.key,
          value: input.value as Prisma.InputJsonValue,
          currency: input.currency ?? undefined,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo ?? undefined,
          createdBy: actor.id,
        },
      });

      await this.auditService.record(
        {
          entityType: 'RegulatoryParameter',
          entityId: param.id,
          action: AuditAction.CREATE,
          actorId: actor.id,
          actorRole: actor.role,
          after: param,
        },
        tx,
      );

      return param;
    });
  }

  findAll(key?: string) {
    return this.prisma.regulatoryParameter.findMany({
      where: { key },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async findCurrent(key: string, currency?: string) {
    const now = new Date();
    return this.prisma.regulatoryParameter.findFirst({
      where: {
        key,
        currency: currency as never,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}

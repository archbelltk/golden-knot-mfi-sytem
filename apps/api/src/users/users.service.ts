import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  AuditAction,
  type CreateUserInput,
  type CurrentUser,
  type UpdateUserInput,
} from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const SAFE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  branchId: true,
  isActive: true,
  mfaEnabled: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({
      select: SAFE_SELECT,
      orderBy: { fullName: 'asc' },
    });
  }

  async create(input: CreateUserInput, actor: CurrentUser) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new BadRequestException('A user with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          role: input.role as never,
          branchId: input.branchId ?? undefined,
        },
        select: SAFE_SELECT,
      });

      await this.auditService.record(
        {
          entityType: 'User',
          entityId: user.id,
          action: AuditAction.CREATE,
          actorId: actor.id,
          actorRole: actor.role,
          after: user,
        },
        tx,
      );

      return user;
    });
  }

  async update(id: string, input: UpdateUserInput, actor: CurrentUser) {
    const before = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!before) throw new NotFoundException('User not found');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          fullName: input.fullName,
          role: input.role as never,
          branchId: input.branchId,
          isActive: input.isActive,
        },
        select: SAFE_SELECT,
      });

      await this.auditService.record(
        {
          entityType: 'User',
          entityId: user.id,
          action: input.isActive !== undefined ? AuditAction.STATUS_CHANGE : AuditAction.UPDATE,
          actorId: actor.id,
          actorRole: actor.role,
          before,
          after: user,
        },
        tx,
      );

      return user;
    });
  }
}

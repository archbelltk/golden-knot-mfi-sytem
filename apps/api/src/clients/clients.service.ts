import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  CLIENT_STATUS_TRANSITIONS,
  ClientStatus,
  type ClientStatusChangeInput,
  type CreateClientInput,
  type CurrentUser,
} from '@golden-knot/shared';
import type { Client } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CryptoService } from '../crypto/crypto.service';
import {
  assertBranchAccess,
  scopedBranchId,
} from '../common/utils/branch-scope';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private crypto: CryptoService,
  ) {}

  /** nationalId is stored encrypted; decrypt it for anything returned to a caller. */
  private toResponse<T extends Client>(client: T): T {
    return { ...client, nationalId: this.crypto.decrypt(client.nationalId) };
  }

  async create(input: CreateClientInput, actor: CurrentUser) {
    if (
      scopedBranchId(actor) !== undefined &&
      input.branchId !== actor.branchId
    ) {
      throw new BadRequestException(
        'You can only onboard clients into your own branch',
      );
    }

    const nationalIdHash = this.crypto.hash(input.nationalId);
    const existing = await this.prisma.client.findUnique({
      where: { nationalIdHash },
    });
    if (existing) {
      throw new BadRequestException(
        'A client with this national ID already exists',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.client.count();
      const clientNumber = `CL-${String(count + 1).padStart(6, '0')}`;

      const client = await tx.client.create({
        data: {
          clientNumber,
          nationalId: this.crypto.encrypt(input.nationalId),
          nationalIdHash,
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
          phone: input.phone,
          email: input.email ?? undefined,
          employmentInfo: input.employmentInfo,
          branchId: input.branchId,
          groupId: input.groupId ?? undefined,
          status: ClientStatus.PROSPECT,
          addresses: { create: [input.address] },
          nextOfKin: { create: [input.nextOfKin] },
        },
        include: { addresses: true, nextOfKin: true },
      });

      await this.auditService.record(
        {
          entityType: 'Client',
          entityId: client.id,
          action: AuditAction.CREATE,
          actorId: actor.id,
          actorRole: actor.role,
          after: client,
        },
        tx,
      );

      return this.toResponse(client);
    });
  }

  async findAll(
    filters: { branchId?: string; status?: string },
    actor: CurrentUser,
  ) {
    const clients = await this.prisma.client.findMany({
      where: {
        branchId: scopedBranchId(actor, filters.branchId),
        status: filters.status as ClientStatus | undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
    return clients.map((c) => this.toResponse(c));
  }

  async findOne(id: string, actor: CurrentUser) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        addresses: true,
        nextOfKin: true,
        kycDocuments: true,
        complianceRecords: true,
        loanApplications: true,
        loanAccounts: true,
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    assertBranchAccess(actor, client.branchId);
    return this.toResponse(client);
  }

  async changeStatus(
    id: string,
    input: ClientStatusChangeInput,
    actor: CurrentUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id } });
      if (!client) throw new NotFoundException('Client not found');
      assertBranchAccess(actor, client.branchId);

      const allowed = CLIENT_STATUS_TRANSITIONS[client.status];
      if (!allowed.includes(input.status)) {
        throw new BadRequestException(
          `Cannot transition client from ${client.status} to ${input.status}`,
        );
      }

      const updated = await tx.client.update({
        where: { id },
        data: { status: input.status },
      });

      await this.auditService.record(
        {
          entityType: 'Client',
          entityId: id,
          action: AuditAction.STATUS_CHANGE,
          actorId: actor.id,
          actorRole: actor.role,
          before: { status: client.status },
          after: { status: updated.status, reason: input.reason },
        },
        tx,
      );

      return this.toResponse(updated);
    });
  }
}

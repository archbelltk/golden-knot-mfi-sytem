import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { authenticator } from 'otplib';
import { AuditAction, type CurrentUser } from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ISSUER = 'Golden Knot MFI';

@Injectable()
export class MfaService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /** Generates and stores a new secret (not yet enabled) and its otpauth:// URI for the user to add to an authenticator app. */
  async beginSetup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return {
      secret,
      otpauthUrl: authenticator.keyuri(user.email, ISSUER, secret),
    };
  }

  async enable(actor: CurrentUser, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (!user?.mfaSecret) {
      throw new BadRequestException(
        'Call the setup endpoint first to generate a secret',
      );
    }
    if (!authenticator.check(code, user.mfaSecret)) {
      throw new BadRequestException('Invalid authenticator code');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor.id },
        data: { mfaEnabled: true },
      });
      await this.auditService.record(
        {
          entityType: 'User',
          entityId: actor.id,
          action: AuditAction.UPDATE,
          actorId: actor.id,
          actorRole: actor.role,
          before: { mfaEnabled: false },
          after: { mfaEnabled: true },
        },
        tx,
      );
    });

    return { mfaEnabled: true };
  }

  async disable(actor: CurrentUser, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled on this account');
    }
    if (!authenticator.check(code, user.mfaSecret)) {
      throw new BadRequestException('Invalid authenticator code');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor.id },
        data: { mfaEnabled: false, mfaSecret: null },
      });
      await this.auditService.record(
        {
          entityType: 'User',
          entityId: actor.id,
          action: AuditAction.UPDATE,
          actorId: actor.id,
          actorRole: actor.role,
          before: { mfaEnabled: true },
          after: { mfaEnabled: false },
        },
        tx,
      );
    });

    return { mfaEnabled: false };
  }

  async verifyLoginCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) return false;
    return authenticator.check(code, user.mfaSecret);
  }
}

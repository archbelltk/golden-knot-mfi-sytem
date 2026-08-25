import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { AuditAction, type LoginInput } from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MfaService } from '../mfa/mfa.service';
import { AuditService } from '../audit/audit.service';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

interface MfaChallengePayload {
  sub: string;
  mfaPending: true;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mfaService: MfaService,
    private auditService: AuditService,
    private config: ConfigService,
  ) {}

  private toUserPayload(user: {
    id: string;
    email: string;
    role: string;
    branchId: string | null;
    mfaEnabled: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      mfaEnabled: user.mfaEnabled,
    };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled) {
      const challengeToken = await this.jwt.signAsync(
        { sub: user.id, mfaPending: true } satisfies MfaChallengePayload,
        { expiresIn: '5m' },
      );
      return { mfaRequired: true as const, challengeToken };
    }

    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return {
      mfaRequired: false as const,
      token,
      user: this.toUserPayload(user),
    };
  }

  async verifyMfa(challengeToken: string, code: string) {
    let payload: MfaChallengePayload;
    try {
      payload = await this.jwt.verifyAsync<MfaChallengePayload>(challengeToken);
    } catch {
      throw new UnauthorizedException(
        'MFA challenge has expired — please log in again',
      );
    }
    if (!payload.mfaPending) {
      throw new UnauthorizedException('Invalid MFA challenge');
    }

    const valid = await this.mfaService.verifyLoginCode(payload.sub, code);
    if (!valid) {
      throw new UnauthorizedException('Invalid authenticator code');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: this.toUserPayload(user) };
  }

  /**
   * Always returns the same message regardless of whether the email exists,
   * so the response itself never reveals account existence. This build has
   * no email transport configured, so outside production the raw reset link
   * is returned directly (and logged server-side) instead of being emailed.
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    let resetLink: string | undefined;
    if (user && user.isActive) {
      const rawToken = randomBytes(32).toString('hex');
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: hashToken(rawToken),
          resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      const webOrigin = this.config.get<string>('WEB_ORIGIN', 'http://localhost:3001');
      resetLink = `${webOrigin}/reset-password?token=${rawToken}`;
      console.log(`[password reset] ${user.email}: ${resetLink}`);
    }

    return {
      message: 'If an account exists for that email, a password reset link has been generated.',
      ...(process.env.NODE_ENV !== 'production' && resetLink ? { resetLink } : {}),
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetTokenHash: hashToken(token),
        resetTokenExpiresAt: { gt: new Date() },
      },
    });
    if (!user) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null },
      });
      await this.auditService.record(
        {
          entityType: 'User',
          entityId: user.id,
          action: AuditAction.STATUS_CHANGE,
          actorId: user.id,
          actorRole: user.role,
          after: { passwordReset: true },
        },
        tx,
      );
    });

    return { message: 'Password updated — you can now sign in.' };
  }
}

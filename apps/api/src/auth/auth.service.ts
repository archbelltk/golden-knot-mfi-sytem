import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { LoginInput } from '@golden-knot/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MfaService } from '../mfa/mfa.service';

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
}

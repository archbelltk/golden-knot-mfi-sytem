import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        branchId: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(input: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    branchId?: string;
  }) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role as never,
        branchId: input.branchId,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        branchId: true,
      },
    });
  }
}

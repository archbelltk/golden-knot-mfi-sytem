import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('gl-accounts')
export class GlAccountsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.gLAccount.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }
}

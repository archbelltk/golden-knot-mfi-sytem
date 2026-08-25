import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RegulatoryReturnsService {
  constructor(private prisma: PrismaService) {}

  findAll(period?: string) {
    return this.prisma.regulatoryReturn.findMany({
      where: { period },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.regulatoryReturn.findUnique({
      where: { id },
    });
    if (!record) throw new NotFoundException('Regulatory return not found');
    return record;
  }

  /** Phase 1: manual placeholder record only — generation logic is Phase 3 scope. */
  recordManual(input: { period: string; type: string; submittedBy: string }) {
    return this.prisma.regulatoryReturn.create({
      data: {
        period: input.period,
        type: input.type,
        submissionStatus: 'SUBMITTED',
        submittedBy: input.submittedBy,
        submittedAt: new Date(),
      },
    });
  }
}

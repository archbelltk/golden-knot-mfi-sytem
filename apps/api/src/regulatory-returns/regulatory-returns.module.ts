import { Module } from '@nestjs/common';
import { RegulatoryReturnsService } from './regulatory-returns.service';
import { RegulatoryReturnsController } from './regulatory-returns.controller';

@Module({
  providers: [RegulatoryReturnsService],
  controllers: [RegulatoryReturnsController],
})
export class RegulatoryReturnsModule {}

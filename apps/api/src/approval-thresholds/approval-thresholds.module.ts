import { Module } from '@nestjs/common';
import { ApprovalThresholdsService } from './approval-thresholds.service';
import { ApprovalThresholdsController } from './approval-thresholds.controller';

@Module({
  providers: [ApprovalThresholdsService],
  controllers: [ApprovalThresholdsController],
  exports: [ApprovalThresholdsService],
})
export class ApprovalThresholdsModule {}

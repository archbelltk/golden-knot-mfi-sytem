import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { RepaymentsService } from './repayments.service';
import { RepaymentsController } from './repayments.controller';

@Module({
  imports: [LedgerModule],
  providers: [RepaymentsService],
  controllers: [RepaymentsController],
})
export class RepaymentsModule {}

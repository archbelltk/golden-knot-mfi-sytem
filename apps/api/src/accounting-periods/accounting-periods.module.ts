import { Global, Module } from '@nestjs/common';
import { AccountingPeriodsService } from './accounting-periods.service';
import { AccountingPeriodsController } from './accounting-periods.controller';

@Global()
@Module({
  providers: [AccountingPeriodsService],
  controllers: [AccountingPeriodsController],
  exports: [AccountingPeriodsService],
})
export class AccountingPeriodsModule {}

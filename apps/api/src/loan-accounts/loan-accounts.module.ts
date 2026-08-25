import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { LoanAccountsService } from './loan-accounts.service';
import { LoanAccountsController } from './loan-accounts.controller';
import { AmortizationService } from './amortization.service';
import { ArrearsService } from './arrears.service';

@Module({
  imports: [LedgerModule],
  providers: [LoanAccountsService, AmortizationService, ArrearsService],
  controllers: [LoanAccountsController],
  exports: [LoanAccountsService, AmortizationService],
})
export class LoanAccountsModule {}

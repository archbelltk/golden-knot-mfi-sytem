import { Module } from '@nestjs/common';
import { LoanApplicationsService } from './loan-applications.service';
import { LoanApplicationsController } from './loan-applications.controller';

@Module({
  providers: [LoanApplicationsService],
  controllers: [LoanApplicationsController],
  exports: [LoanApplicationsService],
})
export class LoanApplicationsModule {}

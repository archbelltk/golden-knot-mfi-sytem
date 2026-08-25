import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('trial-balance')
  trialBalance(@Query('period') period?: string) {
    return this.service.trialBalance(period);
  }

  @Get('general-ledger')
  generalLedger(
    @Query('accountCode') accountCode: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.generalLedger(
      accountCode,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}

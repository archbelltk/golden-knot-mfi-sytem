import { Module } from '@nestjs/common';
import { LedgerPostingService } from './ledger-posting.service';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntriesController } from './journal-entries.controller';
import { GlAccountsController } from './gl-accounts.controller';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [
    GlAccountsController,
    JournalEntriesController,
    ReportsController,
  ],
  providers: [LedgerPostingService, JournalEntriesService, ReportsService],
  exports: [LedgerPostingService],
})
export class LedgerModule {}

import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createJournalEntrySchema,
  type CreateJournalEntryInput,
  type CurrentUser as CurrentUserType,
} from '@golden-knot/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JournalEntriesService } from './journal-entries.service';

@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private service: JournalEntriesService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createJournalEntrySchema))
    body: CreateJournalEntryInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.create(body, user);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.service.approve(id, user);
  }

  @Get()
  findAll(@Query('period') period?: string) {
    return this.service.findAll(period);
  }
}

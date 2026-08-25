import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  disburseLoanSchema,
  type CurrentUser as CurrentUserType,
  type DisburseLoanInput,
} from '@golden-knot/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoanAccountsService } from './loan-accounts.service';

@Controller('loan-accounts')
export class LoanAccountsController {
  constructor(private service: LoanAccountsService) {}

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserType,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({ clientId, status }, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.service.findOne(id, user);
  }

  @Get(':id/schedule')
  schedule(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.service.schedule(id, user);
  }

  @Post(':id/disburse')
  disburse(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(disburseLoanSchema)) body: DisburseLoanInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.disburse(id, body, user);
  }

  @Post(':id/write-off')
  writeOff(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.service.writeOff(id, user);
  }
}

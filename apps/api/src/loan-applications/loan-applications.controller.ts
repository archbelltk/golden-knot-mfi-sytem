import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createLoanApplicationSchema,
  loanApplicationDecisionSchema,
  type CreateLoanApplicationInput,
  type CurrentUser as CurrentUserType,
  type LoanApplicationDecisionInput,
} from '@golden-knot/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoanApplicationsService } from './loan-applications.service';

@Controller('loan-applications')
export class LoanApplicationsController {
  constructor(private service: LoanApplicationsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createLoanApplicationSchema))
    body: CreateLoanApplicationInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.create(body, user);
  }

  @Post(':id/decision')
  decide(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(loanApplicationDecisionSchema))
    body: LoanApplicationDecisionInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.decide(id, body, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserType,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.service.findAll({ status, clientId }, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.service.findOne(id, user);
  }
}

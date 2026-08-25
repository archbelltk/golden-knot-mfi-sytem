import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  recordRepaymentSchema,
  type CurrentUser as CurrentUserType,
  type RecordRepaymentInput,
} from '@golden-knot/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RepaymentsService } from './repayments.service';

@Controller('loan-accounts/:loanAccountId/repayments')
export class RepaymentsController {
  constructor(private service: RepaymentsService) {}

  @Post()
  record(
    @Param('loanAccountId') loanAccountId: string,
    @Body(new ZodValidationPipe(recordRepaymentSchema))
    body: RecordRepaymentInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.record(loanAccountId, body, user);
  }
}

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  complianceRecordSchema,
  type ComplianceRecordInput,
  type CurrentUser as CurrentUserType,
} from '@golden-knot/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ComplianceService } from './compliance.service';

@Controller('clients/:clientId/compliance-records')
export class ComplianceController {
  constructor(private complianceService: ComplianceService) {}

  @Post()
  record(
    @Param('clientId') clientId: string,
    @Body(new ZodValidationPipe(complianceRecordSchema))
    body: ComplianceRecordInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.complianceService.recordScreening(clientId, body, user);
  }

  @Get()
  findForClient(@Param('clientId') clientId: string) {
    return this.complianceService.findForClient(clientId);
  }
}

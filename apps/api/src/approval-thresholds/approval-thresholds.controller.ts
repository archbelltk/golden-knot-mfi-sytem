import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  createApprovalThresholdSchema,
  Role,
  type CreateApprovalThresholdInput,
  type CurrentUser as CurrentUserType,
} from '@golden-knot/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalThresholdsService } from './approval-thresholds.service';

@Controller('approval-thresholds')
export class ApprovalThresholdsController {
  constructor(private service: ApprovalThresholdsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createApprovalThresholdSchema)) body: CreateApprovalThresholdInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.create(body, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.service.remove(id, user);
  }
}

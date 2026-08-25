import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  createRegulatoryParameterSchema,
  Role,
  type CreateRegulatoryParameterInput,
  type CurrentUser as CurrentUserType,
} from '@golden-knot/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RegulatoryParamsService } from './regulatory-params.service';

@Controller('regulatory-params')
export class RegulatoryParamsController {
  constructor(private service: RegulatoryParamsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body(new ZodValidationPipe(createRegulatoryParameterSchema))
    body: CreateRegulatoryParameterInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.create(body, user);
  }

  @Get()
  findAll(@Query('key') key?: string) {
    return this.service.findAll(key);
  }

  @Get('current')
  findCurrent(@Query('key') key: string, @Query('currency') currency?: string) {
    return this.service.findCurrent(key, currency);
  }
}

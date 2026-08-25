import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { CurrentUser as CurrentUserType } from '@golden-knot/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegulatoryReturnsService } from './regulatory-returns.service';

@Controller('regulatory-returns')
export class RegulatoryReturnsController {
  constructor(private service: RegulatoryReturnsService) {}

  @Get()
  findAll(@Query('period') period?: string) {
    return this.service.findAll(period);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  recordManual(
    @Body() body: { period: string; type: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.recordManual({ ...body, submittedBy: user.id });
  }
}

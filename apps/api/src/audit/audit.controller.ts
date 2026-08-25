import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@golden-knot/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN, Role.BACK_OFFICE)
  findAll(
    @Query('entityType') entityType?: string,
    @Query('actorId') actorId?: string,
  ) {
    return this.auditService.findAll({ entityType, actorId });
  }
}

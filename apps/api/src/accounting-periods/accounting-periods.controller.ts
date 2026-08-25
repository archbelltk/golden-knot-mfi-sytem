import { Controller, Get, Param, Post } from '@nestjs/common';
import { Role, type CurrentUser as CurrentUserType } from '@golden-knot/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AccountingPeriodsService } from './accounting-periods.service';

@Controller('accounting-periods')
export class AccountingPeriodsController {
  constructor(private service: AccountingPeriodsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post(':period/close')
  @Roles(Role.ADMIN)
  close(@Param('period') period: string, @CurrentUser() user: CurrentUserType) {
    return this.service.close(period, user);
  }

  @Post(':period/reopen')
  @Roles(Role.ADMIN)
  reopen(
    @Param('period') period: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.reopen(period, user);
  }
}

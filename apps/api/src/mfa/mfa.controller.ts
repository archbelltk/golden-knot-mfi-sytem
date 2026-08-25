import { Body, Controller, Get, Post } from '@nestjs/common';
import type { CurrentUser as CurrentUserType } from '@golden-knot/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MfaService } from './mfa.service';

@Controller('auth/mfa')
export class MfaController {
  constructor(private mfaService: MfaService) {}

  @Get('setup')
  setup(@CurrentUser() user: CurrentUserType) {
    return this.mfaService.beginSetup(user.id);
  }

  @Post('enable')
  enable(@Body('code') code: string, @CurrentUser() user: CurrentUserType) {
    return this.mfaService.enable(user, code);
  }

  @Post('disable')
  disable(@Body('code') code: string, @CurrentUser() user: CurrentUserType) {
    return this.mfaService.disable(user, code);
  }
}

import { Body, Controller, Get, Post } from '@nestjs/common';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@golden-knot/shared';
import type {
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  CurrentUser as CurrentUserType,
} from '@golden-knot/shared';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.authService.login(body);
  }

  @Public()
  @Post('mfa-verify')
  verifyMfa(
    @Body('challengeToken') challengeToken: string,
    @Body('code') code: string,
  ) {
    return this.authService.verifyMfa(challengeToken, code);
  }

  @Get('me')
  me(@CurrentUser() user: CurrentUserType) {
    return user;
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput,
  ) {
    return this.authService.resetPassword(body.token, body.password);
  }
}

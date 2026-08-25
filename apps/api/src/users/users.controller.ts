import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createUserSchema,
  updateUserSchema,
  Role,
  type CreateUserInput,
  type CurrentUser as CurrentUserType,
  type UpdateUserInput,
} from '@golden-knot/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.usersService.create(body, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.usersService.update(id, body, user);
  }
}

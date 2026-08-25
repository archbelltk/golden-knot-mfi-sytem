import { Body, Controller, Get, Post } from '@nestjs/common';
import { Role } from '@golden-knot/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body()
    body: {
      email: string;
      password: string;
      fullName: string;
      role: string;
      branchId?: string;
    },
  ) {
    return this.usersService.create(body);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  clientStatusChangeSchema,
  createClientSchema,
  type ClientStatusChangeInput,
  type CreateClientInput,
  type CurrentUser as CurrentUserType,
} from '@golden-knot/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createClientSchema)) body: CreateClientInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.clientsService.create(body, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserType,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
  ) {
    return this.clientsService.findAll({ branchId, status }, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.clientsService.findOne(id, user);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(clientStatusChangeSchema))
    body: ClientStatusChangeInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.clientsService.changeStatus(id, body, user);
  }
}

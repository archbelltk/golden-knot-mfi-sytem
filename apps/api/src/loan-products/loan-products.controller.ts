import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createLoanProductSchema,
  loanDisclosurePreviewSchema,
  updateLoanProductSchema,
  Role,
  type CreateLoanProductInput,
  type CurrentUser as CurrentUserType,
  type LoanDisclosurePreviewInput,
  type UpdateLoanProductInput,
} from '@golden-knot/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { LoanProductsService } from './loan-products.service';

@Controller('loan-products')
export class LoanProductsController {
  constructor(private service: LoanProductsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.BACK_OFFICE)
  create(
    @Body(new ZodValidationPipe(createLoanProductSchema))
    body: CreateLoanProductInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.create(body, user);
  }

  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(includeInactive === 'true');
  }

  @Get('disclosure-preview')
  disclosurePreview(
    @Query(new ZodValidationPipe(loanDisclosurePreviewSchema))
    query: LoanDisclosurePreviewInput,
  ) {
    return this.service.disclosurePreview(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.BACK_OFFICE)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLoanProductSchema))
    body: UpdateLoanProductInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.service.update(id, body, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.service.remove(id, user);
  }
}

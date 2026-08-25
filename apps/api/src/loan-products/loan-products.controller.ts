import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createLoanProductSchema,
  loanDisclosurePreviewSchema,
  Role,
  type CreateLoanProductInput,
  type CurrentUser as CurrentUserType,
  type LoanDisclosurePreviewInput,
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
  findAll() {
    return this.service.findAll();
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
}

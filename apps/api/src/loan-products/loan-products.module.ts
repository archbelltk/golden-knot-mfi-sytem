import { Module } from '@nestjs/common';
import { RegulatoryParamsModule } from '../regulatory-params/regulatory-params.module';
import { LoanProductsService } from './loan-products.service';
import { LoanProductsController } from './loan-products.controller';

@Module({
  imports: [RegulatoryParamsModule],
  providers: [LoanProductsService],
  controllers: [LoanProductsController],
  exports: [LoanProductsService],
})
export class LoanProductsModule {}

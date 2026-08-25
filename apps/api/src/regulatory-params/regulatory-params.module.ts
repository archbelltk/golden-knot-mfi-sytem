import { Module } from '@nestjs/common';
import { RegulatoryParamsService } from './regulatory-params.service';
import { RegulatoryParamsController } from './regulatory-params.controller';

@Module({
  providers: [RegulatoryParamsService],
  controllers: [RegulatoryParamsController],
  exports: [RegulatoryParamsService],
})
export class RegulatoryParamsModule {}

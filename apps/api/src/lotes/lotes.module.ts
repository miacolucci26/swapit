import { Module } from '@nestjs/common';
import { IaController } from '../ia/ia.controller';
import { IaService } from '../ia/ia.service';
import { MatchingModule } from '../matching/matching.module';
import { UploadsController } from '../uploads/uploads.controller';
import { LotesController } from './lotes.controller';
import { LotesService } from './lotes.service';

@Module({
  imports: [MatchingModule],
  controllers: [LotesController, IaController, UploadsController],
  providers: [LotesService, IaService],
  exports: [LotesService, IaService],
})
export class LotesModule {}

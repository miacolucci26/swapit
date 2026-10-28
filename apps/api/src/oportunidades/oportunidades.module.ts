import { Module } from '@nestjs/common';
import { GeminiService } from '../ia/gemini.service';
import { LotesModule } from '../lotes/lotes.module';
import { OportunidadesController } from './oportunidades.controller';
import { OportunidadesService } from './oportunidades.service';

@Module({ imports: [LotesModule], controllers: [OportunidadesController], providers: [OportunidadesService, GeminiService] })
export class OportunidadesModule {}

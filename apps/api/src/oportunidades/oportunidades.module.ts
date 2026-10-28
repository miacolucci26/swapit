import { Module } from '@nestjs/common';
import { GeminiService } from '../ia/gemini.service';
import { OportunidadesController } from './oportunidades.controller';
import { OportunidadesService } from './oportunidades.service';

@Module({ controllers: [OportunidadesController], providers: [OportunidadesService, GeminiService] })
export class OportunidadesModule {}

import { Module } from '@nestjs/common';
import { MaterialModule } from '../material/material.module';
import { AcuerdosController } from './acuerdos.controller';
import { AcuerdosService } from './acuerdos.service';

@Module({ imports: [MaterialModule], controllers: [AcuerdosController], providers: [AcuerdosService] })
export class AcuerdosModule {}

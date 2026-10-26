import { Module } from '@nestjs/common';
import { CreditosModule } from '../creditos/creditos.module';
import { ImpactoController } from './impacto.controller';
import { ImpactoService } from './impacto.service';

@Module({ imports: [CreditosModule], controllers: [ImpactoController], providers: [ImpactoService], exports: [ImpactoService] })
export class ImpactoModule {}

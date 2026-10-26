import { Module } from '@nestjs/common';
import { BenchmarkModule } from '../benchmark/benchmark.module';
import { CertificadosModule } from '../certificados/certificados.module';
import { LotesModule } from '../lotes/lotes.module';
import { MaterialController } from './material.controller';
import { MaterialService } from './material.service';

@Module({ imports: [LotesModule, BenchmarkModule, CertificadosModule], controllers: [MaterialController], providers: [MaterialService], exports: [MaterialService] })
export class MaterialModule {}

import { Module } from '@nestjs/common';
import { BenchmarkModule } from '../benchmark/benchmark.module';
import { MaterialModule } from '../material/material.module';
import { CaptacionController } from './captacion.controller';

@Module({ imports: [MaterialModule, BenchmarkModule], controllers: [CaptacionController] })
export class CaptacionModule {}

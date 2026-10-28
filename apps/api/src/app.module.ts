import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AcuerdosModule } from './acuerdos/acuerdos.module';
import { AuthModule } from './auth/auth.module';
import { BenchmarkModule } from './benchmark/benchmark.module';
import { CaptacionModule } from './captacion/captacion.module';
import { CertificadosModule } from './certificados/certificados.module';
import { CommonModule } from './common/common.module';
import { HealthController } from './common/health.controller';
import { FacturacionModule } from './facturacion/facturacion.module';
import { CreditosModule } from './creditos/creditos.module';
import { DestinosModule } from './destinos/destinos.module';
import { EmpresasModule } from './empresas/empresas.module';
import { ImpactoModule } from './impacto/impacto.module';
import { LotesModule } from './lotes/lotes.module';
import { MatchingModule } from './matching/matching.module';
import { MaterialModule } from './material/material.module';
import { OportunidadesModule } from './oportunidades/oportunidades.module';
import { PrismaModule } from './prisma/prisma.module';
import { TransaccionesModule } from './transacciones/transacciones.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    CommonModule,
    EmpresasModule,
    AuthModule,
    LotesModule,
    MatchingModule,
    OportunidadesModule,
    BenchmarkModule,
    FacturacionModule,
    MaterialModule,
    DestinosModule,
    AcuerdosModule,
    CaptacionModule,
    WhatsappModule,
    CreditosModule,
    CertificadosModule,
    TransaccionesModule,
    ImpactoModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

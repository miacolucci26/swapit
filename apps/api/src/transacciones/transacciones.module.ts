import { Module } from '@nestjs/common';
import { CertificadosModule } from '../certificados/certificados.module';
import { CreditosModule } from '../creditos/creditos.module';
import { AdminController } from './admin.controller';
import { TransaccionesController } from './transacciones.controller';
import { TransaccionesService } from './transacciones.service';

@Module({
  imports: [CreditosModule, CertificadosModule],
  controllers: [TransaccionesController, AdminController],
  providers: [TransaccionesService],
  exports: [TransaccionesService],
})
export class TransaccionesModule {}

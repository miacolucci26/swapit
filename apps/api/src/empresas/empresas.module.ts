import { Module } from '@nestjs/common';
import { AdminEmpresasController } from './admin-empresas.controller';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';

@Module({ controllers: [EmpresasController, AdminEmpresasController], providers: [EmpresasService], exports: [EmpresasService] })
export class EmpresasModule {}

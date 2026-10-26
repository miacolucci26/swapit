import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EmpresasModule } from '../empresas/empresas.module';
import { JWT_ALGORITMO, jwtSecret, ttlSegundos } from './auth.config';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [
    EmpresasModule,
    // registerAsync: el secreto se lee cuando ConfigModule ya cargó el .env.
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        // En producción, sin un JWT_SECRET fuerte (≥ 32 caracteres, no de ejemplo) la API no arranca.
        secret: jwtSecret({ ...process.env, JWT_SECRET: cfg.get<string>('JWT_SECRET') }),
        signOptions: { algorithm: JWT_ALGORITMO, expiresIn: ttlSegundos(cfg.get<string>('JWT_EXPIRES_IN')) },
        verifyOptions: { algorithms: [JWT_ALGORITMO] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}

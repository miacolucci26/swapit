import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { loginSchema, registroSchema } from '@swapit/shared';
import { parseBody } from '../common/zod-body';
import { opcionesCookie } from './auth.config';
import { AuthGuard, COOKIE_NAME, JwtPayload } from './auth.guard';
import { AuthService } from './auth.service';

/** Las respuestas de /auth no se cachean: `aplicarSeguridad` pone Cache-Control: no-store a toda la API. */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // Los topes por IP de registro e inicio de sesión viven en el middleware de `aplicarSeguridad`; los fallos por cuenta, en el servicio.
  @Post('registro')
  async registro(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { token, usuario } = await this.auth.registrar(parseBody(registroSchema, body));
    res.cookie(COOKIE_NAME, token, opcionesCookie());
    return usuario;
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token, usuario } = await this.auth.login(parseBody(loginSchema, body), req.ip);
    res.cookie(COOKIE_NAME, token, opcionesCookie());
    return usuario;
  }

  /**
   * Cierra la sesión en este navegador (borra la cookie). El JWT es sin estado: un token copiado antes del cierre seguiría
   * firmado hasta que caduque (≤ 12 h) salvo que el usuario se borre o cambie de rol; para anular todas las sesiones, rotar JWT_SECRET.
   */
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    const { maxAge: _m, ...atributos } = opcionesCookie();
    res.clearCookie(COOKIE_NAME, atributos);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: Request & { user: JwtPayload }) {
    return this.auth.perfil(req.user.sub);
  }
}

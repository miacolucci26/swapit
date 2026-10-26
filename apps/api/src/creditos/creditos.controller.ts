import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { canjeSchema } from '@swapit/shared';
import type { Request } from 'express';
import { SoloMarketplace } from '../common/modo';
import { AuthGuard, JwtPayload } from '../auth/auth.guard';
import { parseBody } from '../common/zod-body';
import { CreditosService } from './creditos.service';

type AuthReq = Request & { user: JwtPayload };

@SoloMarketplace()
@Controller('creditos')
@UseGuards(AuthGuard)
export class CreditosController {
  constructor(private readonly creditos: CreditosService) {}

  @Get()
  panel(@Req() req: AuthReq) {
    return this.creditos.panel(req.user.empresaId);
  }

  @Post('canjear')
  @HttpCode(200)
  canjear(@Req() req: AuthReq, @Body() body: unknown) {
    const { beneficio, loteId } = parseBody(canjeSchema, body);
    return this.creditos.canjear(req.user.empresaId, beneficio, loteId);
  }
}

import { Module } from '@nestjs/common';
import { BenchmarkModule } from '../benchmark/benchmark.module';
import { GeminiService } from '../ia/gemini.service';
import { LotesModule } from '../lotes/lotes.module';
import { MaterialModule } from '../material/material.module';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappProvider, crearWhatsappProvider } from './whatsapp.provider';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [MaterialModule, BenchmarkModule, LotesModule],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    GeminiService,
    // Cloud API real si están WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID; si no, el mock (guarda el mensaje y no envía nada).
    { provide: WhatsappProvider, inject: [PrismaService], useFactory: (prisma: PrismaService) => crearWhatsappProvider(prisma) },
  ],
  exports: [WhatsappService],
})
export class WhatsappModule {}

import { Global, Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { BillingProvider, MockBillingProvider } from './billing/billing.provider';
import { Embedder, crearEmbedder } from './embeddings/embedder';
import { Geocoder, MapboxGeocoder } from './geocoding/geocoder';
import { MockPaymentProvider, PaymentProvider } from './payments/payment.provider';
import { SunatValidator, crearSunatValidator } from './sunat/sunat.validator';

@Global()
@Module({
  imports: [StorageModule],
  providers: [
    { provide: SunatValidator, useFactory: () => crearSunatValidator() },
    { provide: Geocoder, useClass: MapboxGeocoder },
    { provide: PaymentProvider, useClass: MockPaymentProvider },
    { provide: BillingProvider, useClass: MockBillingProvider },
    { provide: Embedder, useFactory: crearEmbedder },
  ],
  exports: [SunatValidator, Geocoder, PaymentProvider, BillingProvider, Embedder, StorageModule],
})
export class CommonModule {}

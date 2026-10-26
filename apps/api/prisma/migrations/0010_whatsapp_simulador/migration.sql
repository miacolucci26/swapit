-- Bot de WhatsApp (simulador): el proveedor reporta material por chat en vez de por el formulario.
-- Cada intermediario tendría su propio número de WhatsApp Business; `whatsappPhoneId` es el identificador que envía Meta
-- en el webhook para saber a qué intermediario pertenece el mensaje.
ALTER TABLE "Empresa" ADD COLUMN "whatsappPhoneId" TEXT;
CREATE UNIQUE INDEX "Empresa_whatsappPhoneId_key" ON "Empresa"("whatsappPhoneId");

-- Conversación guiada en curso con un proveedor (una por intermediario y teléfono).
CREATE TABLE "ConversacionWhatsapp" (
  "id" TEXT NOT NULL,
  "intermediarioId" TEXT NOT NULL,
  "telefono" TEXT NOT NULL,
  "proveedorId" TEXT NOT NULL,
  "paso" TEXT NOT NULL,
  "borrador" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConversacionWhatsapp_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConversacionWhatsapp_intermediarioId_telefono_key" ON "ConversacionWhatsapp"("intermediarioId", "telefono");
ALTER TABLE "ConversacionWhatsapp" ADD CONSTRAINT "ConversacionWhatsapp_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversacionWhatsapp" ADD CONSTRAINT "ConversacionWhatsapp_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Registro de mensajes (el proveedor mock guarda aquí lo que enviaría por WhatsApp).
CREATE TABLE "MensajeWhatsapp" (
  "id" TEXT NOT NULL,
  "intermediarioId" TEXT NOT NULL,
  "telefono" TEXT NOT NULL,
  "direccion" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MensajeWhatsapp_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MensajeWhatsapp_direccion_check" CHECK ("direccion" IN ('ENTRANTE', 'SALIENTE'))
);
CREATE INDEX "MensajeWhatsapp_intermediarioId_telefono_createdAt_idx" ON "MensajeWhatsapp"("intermediarioId", "telefono", "createdAt");
ALTER TABLE "MensajeWhatsapp" ADD CONSTRAINT "MensajeWhatsapp_intermediarioId_fkey" FOREIGN KEY ("intermediarioId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

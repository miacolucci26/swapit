import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { opcionesSubidaImagen } from '../common/uploads';
import { StorageService } from '../storage/storage.service';

@Controller('uploads')
@UseGuards(AuthGuard)
export class UploadsController {
  constructor(private readonly archivos: StorageService) {}

  /** Sube una imagen (máx. 5 MB; 4 MB en Vercel) y devuelve su nombre y URL pública. */
  @Post()
  @UseInterceptors(FileInterceptor('file', opcionesSubidaImagen))
  subir(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Falta el archivo');
    return this.archivos.guardarImagen(file);
  }
}

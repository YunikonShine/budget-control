import { Controller, Post, Body } from '@nestjs/common';
import { ImageUploadService } from './image-upload.service';

@Controller('upload')
export class FilesController {
  constructor(private readonly imageUpload: ImageUploadService) {}

  @Post('image')
  async uploadImage(@Body() body: { filename: string; mimeType: string; base64?: string }) {
    const { filename, mimeType, base64 } = body;
    return this.imageUpload.getSignedUploadUrl(filename, mimeType, base64);
  }
}

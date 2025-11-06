import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ColumnsModule } from './columns/columns.module';
import { CardsModule } from './cards/cards.module';
import { FilesController } from './files/files.controller';
import { ImageUploadService } from './files/image-upload.service';

@Module({
  imports: [ColumnsModule, CardsModule],
  controllers: [HealthController, FilesController],
  providers: [ImageUploadService],
})
export class AppModule {}

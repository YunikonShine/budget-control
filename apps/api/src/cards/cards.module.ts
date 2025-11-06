import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { SanitizeService } from 'src/helpers/sanitize.service';
import { EmbeddingsService } from 'src/ai/embeddings.service';

@Module({
  imports: [],
  controllers: [CardsController],
  providers: [CardsService, SanitizeService, EmbeddingsService],
})
export class CardsModule {}

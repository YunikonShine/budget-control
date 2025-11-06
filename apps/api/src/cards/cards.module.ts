import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';

@Module({
  imports: [],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}

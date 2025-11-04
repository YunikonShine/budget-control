import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ColumnsModule } from './columns/columns.module';
import { CardsModule } from './cards/cards.module';

@Module({
  imports: [ColumnsModule, CardsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { UpdateDescriptionDto } from './dto/update-description.dto';
import { Card } from '@repo/db';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post()
  create(@Body() createCardDto: CreateCardDto): Promise<Card> {
    return this.cardsService.create(createCardDto);
  }

  @Get()
  findAll(): Promise<Card[]> {
    return this.cardsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Card | null> {
    return this.cardsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCardDto: UpdateCardDto,
  ): Promise<Card> {
    return this.cardsService.update(id, updateCardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<Card> {
    return this.cardsService.remove(id);
  }

  @Post('move')
  async moveCard(@Body() dto: any): Promise<{ ok: boolean; card: Card }> {
    const { cardId, fromColumnId, toColumnId, toOrder, projectId } = dto;

    const updated = await this.cardsService.moveCard(
      cardId,
      fromColumnId ?? null,
      toColumnId,
      toOrder,
    );

    if (updated === null) {
      throw new NotFoundException('Card not found');
    }

    return { ok: true, card: updated };
  }

  @Post(':id/description')
  async updateDescription(
    @Param('id') id: string,
    @Body() dto: UpdateDescriptionDto,
  ): Promise<{ ok: boolean; card: Card }> {
    const updated = await this.cardsService.updateDescription(id, dto);
    return { ok: true, card: updated };
  }
}

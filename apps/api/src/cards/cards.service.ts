import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CardsService {
  constructor(private readonly db: PrismaService) {}

  // Conta o número de cards em uma coluna
  private async countCardsInColumn(tx: any, columnId: string) {
    const cnt = await tx.card.count({ where: { columnId } });
    return cnt;
  }

  /**
   * Move a card: handles reorder in same column and move between columns.
   * Ensures toOrder is bounded by 0..(len)
   */
  async moveCard(
    cardId: string,
    fromColumnId: string | null,
    toColumnId: string,
    toOrder: number,
  ) {
    return await this.db.$transaction(async (tx) => {
      const card = await tx.card.findUnique({ where: { id: cardId } });
      if (!card) throw new NotFoundException('Card not found');

      const sourceColumnId = fromColumnId ?? card.columnId;
      const targetColumnId = toColumnId;

      // get counts to bound toOrder
      const targetCount = await this.countCardsInColumn(tx, targetColumnId);

      // clamp toOrder to valid range [0, targetCount] (inserting at end allowed)
      const boundedToOrder = Math.max(0, Math.min(toOrder, targetCount));

      if (sourceColumnId === targetColumnId) {
        // same column reorder
        const cards = await tx.card.findMany({
          where: { columnId: targetColumnId },
          orderBy: { order: 'asc' },
        });

        // remove moving card
        const filtered = cards.filter((c) => c.id !== cardId);

        // if boundedToOrder may be > filtered.length (edge cases), clamp
        const insertIndex = Math.max(
          0,
          Math.min(boundedToOrder, filtered.length),
        );
        filtered.splice(insertIndex, 0, card);

        // update orders
        await Promise.all(
          filtered.map((c, idx) =>
            tx.card.update({ where: { id: c.id }, data: { order: idx } }),
          ),
        );

        return tx.card.findUnique({ where: { id: cardId } });
      }

      // moving between columns:
      // 1) close gap on source column (decrement orders after moved card's order)
      await tx.card.updateMany({
        where: { columnId: sourceColumnId, order: { gt: card.order } },
        data: { order: { decrement: 1 } },
      });

      // 2) make space in target column (increment orders >= boundedToOrder)
      await tx.card.updateMany({
        where: { columnId: targetColumnId, order: { gte: boundedToOrder } },
        data: { order: { increment: 1 } },
      });

      // 3) update the card
      const updated = await tx.card.update({
        where: { id: cardId },
        data: { columnId: targetColumnId, order: boundedToOrder },
      });

      return updated;
    });
  }

  create(createCardDto: CreateCardDto) {
    return this.db.column.create({ createCardDto });
  }

  findAll() {
    return this.db.column.findMany();
  }

  findOne(id: number) {
    return this.db.column.findUnique({
      where: { id },
    });
  }

  update(id: number, updateCardDto: UpdateCardDto) {
    return this.db.column.update({ where: { id }, updateCardDto });
  }

  remove(id: number) {
    return this.db.column.delete({ where: { id } });
  }
}

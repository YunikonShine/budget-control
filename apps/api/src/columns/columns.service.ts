import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { Column, prisma } from '@repo/db';

@Injectable()
export class ColumnsService {
  create(columnDto: CreateColumnDto): Promise<Column> {
    console.log("Creating column with data:", columnDto);
    return prisma.column.create({ data: columnDto });
  }

  findAll(): Promise<Column[]> {
    return prisma.column.findMany({
      include: { cards: { orderBy: { order: 'asc' } } },
    });
  }

  findOne(id: string): Promise<Column | null> {
    return prisma.column.findUnique({
      where: { id },
    });
  }

  update(id: string, columnDto: UpdateColumnDto): Promise<Column> {
    return prisma.column.update({ where: { id }, data: columnDto });
  }

  remove(id: string): Promise<Column> {
    return prisma.column.delete({ where: { id } });
  }

  async moveColumn(
    columnId: string,
    toOrder: number,
    projectId: string,
  ): Promise<Column | null> {
    return await prisma.$transaction(async (tx) => {
      const column = await tx.column.findUnique({ where: { id: columnId } });
      if (!column) throw new NotFoundException('Column not found');

      // get counts to bound toOrder
      const targetCount = await prisma.column.count();

      // clamp toOrder to valid range [0, targetCount] (inserting at end allowed)
      const boundedToOrder = Math.max(0, Math.min(toOrder, targetCount));

      // column reorder
      const columns = await tx.column.findMany({
        orderBy: { order: 'asc' },
      });

      // remove moving card
      const filtered = columns.filter((c) => c.id !== columnId);

      // if boundedToOrder may be > filtered.length (edge cases), clamp
      const insertIndex = Math.max(
        0,
        Math.min(boundedToOrder, filtered.length),
      );
      filtered.splice(insertIndex, 0, column);

      // update orders
      await Promise.all(
        filtered.map((c, idx) =>
          tx.column.update({ where: { id: c.id }, data: { order: idx } }),
        ),
      );

      return tx.column.findUniqueOrThrow({ where: { id: columnId } });
    });
  }
}

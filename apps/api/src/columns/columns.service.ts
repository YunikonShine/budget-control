import { Injectable } from '@nestjs/common';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { Column, prisma } from '@repo/db';

@Injectable()
export class ColumnsService {
  create(columnDto: CreateColumnDto): Promise<Column> {
    return prisma.column.create({ data: columnDto });
  }

  findAll(): Promise<Column[]> {
    return prisma.column.findMany({include: { cards: { orderBy: { order: 'asc' } } }});
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
}

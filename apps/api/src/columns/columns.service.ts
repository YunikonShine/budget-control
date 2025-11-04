import { Injectable } from '@nestjs/common';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ColumnsService {
  constructor(private readonly db: PrismaService) {}

  create(createColumnDto: CreateColumnDto) {
    return this.db.column.create({ createColumnDto });
  }

  findAll() {
    return this.db.column.findMany({
      include: { cards: { orderBy: { order: 'asc' } } },
    });
  }

  findOne(id: number) {
    return this.db.column.findUnique({
      where: { id },
      include: { cards: { orderBy: { order: 'asc' } } },
    });
  }

  update(id: number, updateColumnDto: UpdateColumnDto) {
    return this.db.column.update({ where: { id }, updateColumnDto });
  }

  remove(id: number) {
    return this.db.column.delete({ where: { id } });
  }
}

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
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { Column } from '@repo/db';

@Controller('columns')
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post()
  create(@Body() createColumnDto: CreateColumnDto) {
    return this.columnsService.create(createColumnDto);
  }

  @Get()
  findAll(): Promise<Column[]> {
    return this.columnsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.columnsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateColumnDto: UpdateColumnDto) {
    return this.columnsService.update(id, updateColumnDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.columnsService.remove(id);
  }

  @Post('move')
  async moveCard(@Body() dto: any): Promise<{ ok: boolean; column: Column }> {
    const { columnId, toOrder, projectId } = dto;

    const updated = await this.columnsService.moveColumn(
      columnId,
      toOrder,
      projectId,
    );

    if (updated === null) {
      throw new NotFoundException('Column not found');
    }

    return { ok: true, column: updated };
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { Diagram } from '@flowora/shared';
import { DiagramsService } from './diagrams.service';
import { CreateDiagramDto, UpdateDiagramDto } from './dto';

@Controller('diagrams')
export class DiagramsController {
  constructor(private readonly diagrams: DiagramsService) {}

  @Get()
  list(): Diagram[] {
    return this.diagrams.list();
  }

  @Get(':id')
  get(@Param('id') id: string): Diagram {
    return this.diagrams.get(id);
  }

  @Post()
  create(@Body() dto: CreateDiagramDto): Diagram {
    return this.diagrams.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDiagramDto): Diagram {
    return this.diagrams.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): void {
    this.diagrams.remove(id);
  }
}

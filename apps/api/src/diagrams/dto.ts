import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { diagramTypes, type DiagramType } from '@flowora/shared';

export class CreateDiagramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEnum(diagramTypes)
  type!: DiagramType;

  /** Optional full Flowora JSON v1 document. Validated with zod in the service. */
  @IsObject()
  @IsOptional()
  content?: Record<string, unknown>;
}

export class UpdateDiagramDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsObject()
  @IsOptional()
  content?: Record<string, unknown>;
}

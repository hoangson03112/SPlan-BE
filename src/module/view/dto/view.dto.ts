import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';

const VIEW_TYPES = ['TABLE', 'KANBAN', 'LIST'] as const;

export class CreateViewDto {
  @IsString()
  @IsNotEmpty()
  listId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(VIEW_TYPES)
  type!: (typeof VIEW_TYPES)[number];

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @IsNumber()
  @IsOptional()
  position?: number;
}

export class UpdateViewDto extends PartialType(
  OmitType(CreateViewDto, ['listId'] as const),
) {}

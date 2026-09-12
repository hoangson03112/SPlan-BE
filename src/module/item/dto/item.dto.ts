import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  listId!: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  statusId?: string;

  @IsNumber()
  @IsOptional()
  kanbanOrder?: number;

  @IsNumber()
  @IsOptional()
  tableOrder?: number;
}

export class UpdateItemDto extends PartialType(
  OmitType(CreateItemDto, ['listId'] as const),
) {}

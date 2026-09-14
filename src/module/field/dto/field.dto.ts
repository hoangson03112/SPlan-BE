import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';

const FIELD_TYPES = ['TEXT', 'NUMBER', 'SELECT', 'DATE', 'CHECKBOX'] as const;

export class CreateFieldDto {
  @IsString()
  @IsNotEmpty()
  listId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(FIELD_TYPES)
  type!: (typeof FIELD_TYPES)[number];

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;
}

export class UpdateFieldDto extends PartialType(
  OmitType(CreateFieldDto, ['listId'] as const),
) {}

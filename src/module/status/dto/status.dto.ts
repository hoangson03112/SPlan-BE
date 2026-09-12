import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';

const STATUS_GROUPS = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export class CreateStatusDto {
  @IsString()
  @IsNotEmpty()
  listId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsIn(STATUS_GROUPS)
  @IsOptional()
  group?: (typeof STATUS_GROUPS)[number];

  @IsNumber()
  @IsOptional()
  position?: number;
}

export class UpdateStatusDto extends PartialType(
  OmitType(CreateStatusDto, ['listId'] as const),
) {}

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';

export class CreateSpaceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;
}
export class UpdateSpaceDto extends PartialType(
  OmitType(CreateSpaceDto, ['workspaceId'] as const),
) {}

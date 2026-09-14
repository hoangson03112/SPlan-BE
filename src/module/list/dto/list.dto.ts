import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateListDto {
  @IsString()
  @IsNotEmpty()
  spaceId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @IsOptional()
  position?: number;
}

export class UpdateListDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  position?: number;
}

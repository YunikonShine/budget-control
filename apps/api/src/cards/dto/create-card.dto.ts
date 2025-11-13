import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateCardDto {
  @IsString()
  columnId: string;
  @IsString()
  title: string;
  @IsOptional()
  @IsString()
  html?: string;
  @IsOptional()
  @IsString()
  json?: any;
  @IsOptional()
  @IsString()
  plain?: string;
  @IsInt()
  order: number;
}

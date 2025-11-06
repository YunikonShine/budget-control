import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateDescriptionDto {
  @IsOptional()
  @IsObject()
  json?: any;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsString()
  plain?: string;
}

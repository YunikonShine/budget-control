import { IsString, IsInt } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  name: string;
  @IsInt()
  order: number;
}

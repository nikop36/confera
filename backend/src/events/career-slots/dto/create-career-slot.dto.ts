import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCareerSlotDto {
  @ApiProperty({ example: '1:1 with CTO' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Looking for ML engineers' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: '2026-06-14T14:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ minimum: 1, example: 3 })
  @IsInt()
  @Min(1)
  capacity!: number;
}

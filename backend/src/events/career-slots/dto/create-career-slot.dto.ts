import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ example: ['machine-learning', 'python'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];
}

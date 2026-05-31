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

  @ApiProperty({ example: '2026-06-14T09:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2026-06-14T10:00:00.000Z' })
  @IsDateString()
  endAt!: string;

  @ApiProperty({ example: 'Soba 1' })
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiProperty({ minimum: 1, example: 12 })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiPropertyOptional({ example: ['machine-learning', 'python'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];
}

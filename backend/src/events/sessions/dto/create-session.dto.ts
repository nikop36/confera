import {
  IsString,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpeakerDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ type: [SpeakerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeakerDto)
  speakers!: SpeakerDto[];

  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiProperty()
  @IsDateString()
  endAt!: string;

  @ApiProperty()
  @IsString()
  location!: string;

  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number | null;

  @ApiPropertyOptional({ type: [String], example: ['ai', 'research'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

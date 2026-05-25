import { IsString, IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  speakerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  speakerBio?: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiProperty()
  @IsDateString()
  endAt!: string;

  @ApiProperty()
  @IsString()
  location!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  capacity!: number;
}

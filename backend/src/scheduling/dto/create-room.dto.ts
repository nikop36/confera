import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Room A1' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Main Hall - 1st floor' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 8, minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}


import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'Room B2' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Second floor' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}


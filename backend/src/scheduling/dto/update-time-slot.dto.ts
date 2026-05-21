import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class UpdateTimeSlotDto {
  @ApiProperty({ example: '2026-06-10T09:00:00.000Z' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ example: '2026-06-10T09:30:00.000Z' })
  @IsDateString()
  endAt: string;
}


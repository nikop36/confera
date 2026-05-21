import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class GenerateTimeSlotsDto {
  @ApiProperty({ example: '2026-06-10' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-12' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: '09:00', description: '24-hour HH:mm' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  dayStartTime: string;

  @ApiProperty({ example: '17:00', description: '24-hour HH:mm' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  dayEndTime: string;

  @ApiProperty({ example: 30, minimum: 5, maximum: 240 })
  @IsInt()
  @Min(5)
  @Max(240)
  slotDurationMinutes: number;
}


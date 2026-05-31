import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestCareerSlotDto {
  @ApiProperty({ minimum: 0, example: 2 })
  @IsInt()
  @Min(0)
  subSlotIndex!: number;
}

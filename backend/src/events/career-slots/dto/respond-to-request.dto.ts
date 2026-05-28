import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondToRequestDto {
  @ApiProperty({ enum: ['approved', 'declined'] })
  @IsEnum(['approved', 'declined'])
  status!: 'approved' | 'declined';
}

import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { CareerInterviewStatus } from '../../common/interfaces/career-interview.interface';

export class UpdateCareerInterviewStatusDto {
  @ApiProperty({ enum: ['draft', 'scheduled', 'completed', 'cancelled'] })
  @IsIn(['draft', 'scheduled', 'completed', 'cancelled'])
  status: CareerInterviewStatus;
}

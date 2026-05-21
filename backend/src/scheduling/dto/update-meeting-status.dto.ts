import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { MeetingStatus } from '../../common/interfaces/meeting.interface';

export class UpdateMeetingStatusDto {
  @ApiProperty({ enum: ['scheduled', 'completed', 'cancelled'] })
  @IsIn(['scheduled', 'completed', 'cancelled'])
  status: MeetingStatus;
}


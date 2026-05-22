import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { CareerInterviewInvitationStatus } from '../../common/interfaces/career-interview.interface';

export class RespondInviteDto {
  @ApiProperty({ enum: ['accepted', 'rejected'] })
  @IsIn(['accepted', 'rejected'])
  action: Extract<CareerInterviewInvitationStatus, 'accepted' | 'rejected'>;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignCareerInterviewDto {
  @ApiProperty({ example: 'interviewer-firebase-uid' })
  @IsString()
  interviewerUid: string;

  @ApiProperty({ example: 'slot-firestore-id' })
  @IsString()
  slotId: string;

  @ApiProperty({ example: 'room-firestore-id' })
  @IsString()
  roomId: string;
}

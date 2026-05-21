import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class AssignMeetingDto {
  @ApiProperty({ example: 'slot-firestore-id' })
  @IsString()
  slotId: string;

  @ApiProperty({ example: 'room-firestore-id' })
  @IsString()
  roomId: string;

  @ApiProperty({
    example: ['firebase-uid-requester-1', 'firebase-uid-requester-2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  requestedByUids: string[];

  @ApiProperty({
    example: ['firebase-uid-recipient-1', 'firebase-uid-recipient-2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  requestedToUids: string[];
}

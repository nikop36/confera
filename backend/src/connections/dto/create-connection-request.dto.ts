import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateConnectionRequestDto {
  @ApiProperty({ example: 'firebase-uid-recipient' })
  @IsString()
  recipientUid!: string;
}

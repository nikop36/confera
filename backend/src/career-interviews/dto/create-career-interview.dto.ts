import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCareerInterviewDto {
  @ApiProperty({ example: 'candidate-firebase-uid' })
  @IsString()
  candidateUid: string;

  @ApiPropertyOptional({ example: 'Candidate wants to discuss backend role.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

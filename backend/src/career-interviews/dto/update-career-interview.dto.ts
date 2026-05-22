import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCareerInterviewDto {
  @ApiPropertyOptional({ example: 'candidate-firebase-uid' })
  @IsOptional()
  @IsString()
  candidateUid?: string;

  @ApiPropertyOptional({ example: 'Updated interview notes.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

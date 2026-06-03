import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const PROFILE_REPORT_REASONS = [
  'spam',
  'harassment',
  'inappropriate_content',
  'fake_profile',
  'other',
] as const;

export type ProfileReportReason = (typeof PROFILE_REPORT_REASONS)[number];

export class ReportProfileDto {
  @ApiProperty({
    enum: PROFILE_REPORT_REASONS,
    example: 'spam',
  })
  @IsIn(PROFILE_REPORT_REASONS)
  reason!: ProfileReportReason;

  @ApiPropertyOptional({
    example:
      'The profile is repeatedly sending irrelevant promotional messages.',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  customReason?: string;
}

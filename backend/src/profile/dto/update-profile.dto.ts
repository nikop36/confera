import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import type { MeetingType } from '../../common/interfaces/user.interface';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Researcher at MIT' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'MIT' })
  @IsString()
  @IsOptional()
  affiliation?: string;

  @ApiPropertyOptional({ example: ['AI', 'Machine Learning'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests?: string[];

  @ApiPropertyOptional({ example: ['Network with investors'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  goals?: string[];

  @ApiPropertyOptional({ enum: ['online', 'in-person', 'both'] })
  @IsEnum(['online', 'in-person', 'both'])
  @IsOptional()
  meetingType?: MeetingType;

  @ApiPropertyOptional({ example: ['TypeScript', 'NestJS'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  competencies?: string[];

  @ApiPropertyOptional({ example: ['neural networks', 'LLMs'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  researchKeywords?: string[];

  @ApiPropertyOptional({ description: 'Role-specific flexible fields' })
  @IsObject()
  @IsOptional()
  roleProfile?: Record<string, unknown>;
}

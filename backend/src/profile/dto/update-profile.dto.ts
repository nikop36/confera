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

  @ApiPropertyOptional({ example: 'sl' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'Europe/Ljubljana' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ enum: ['online', 'in-person', 'both'] })
  @IsEnum(['online', 'in-person', 'both'])
  @IsOptional()
  meetingType?: MeetingType;

  @ApiPropertyOptional({ type: [String], example: ['ai', 'startup'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Role-specific flexible fields' })
  @IsObject()
  @IsOptional()
  roleProfile?: Record<string, unknown>;
}

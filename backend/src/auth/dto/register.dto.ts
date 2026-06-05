import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsStrongRegistrationPassword,
  IsValidDisplayName,
  normalizeDisplayName,
  normalizeEmail,
  normalizeInviteToken,
} from '../validation/auth-input.validation';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }: TransformFnParams) => normalizeEmail(value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description:
      '12-128 chars, uppercase, lowercase, number, special character, no whitespace',
  })
  @IsString()
  @IsStrongRegistrationPassword()
  password!: string;

  @ApiProperty({ example: 'John Doe' })
  @Transform(({ value }: TransformFnParams) => normalizeDisplayName(value))
  @IsString()
  @IsValidDisplayName()
  displayName!: string;

  @Transform(({ value }: TransformFnParams) => normalizeInviteToken(value))
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Invite token contains invalid characters.',
  })
  inviteToken?: string;
}

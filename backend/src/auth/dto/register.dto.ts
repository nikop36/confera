import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsStrongRegistrationPassword,
  IsValidDisplayName,
  normalizeDisplayName,
  normalizeEmail,
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
}

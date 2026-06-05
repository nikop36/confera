import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { normalizeEmail } from '../validation/auth-input.validation';

export class LoginDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @Transform(({ value }: TransformFnParams) => normalizeEmail(value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

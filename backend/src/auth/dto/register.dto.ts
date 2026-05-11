import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Min 12 chars, 1 uppercase, 1 number, 1 special character',
  })
  @IsString()
  @MinLength(12)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one number and one special character.',
  })
  password!: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  displayName!: string;
}

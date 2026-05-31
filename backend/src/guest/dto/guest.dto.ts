import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class AddGuestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;
}

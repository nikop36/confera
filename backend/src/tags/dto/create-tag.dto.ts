import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'Artificial Intelligence' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ example: 'ai' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric words separated by hyphens',
  })
  slug!: string;
}

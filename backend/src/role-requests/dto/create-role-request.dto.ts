import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  UserRoleEnum,
  type RequestableRole,
} from '../../common/enums/roles.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleRequestDto {
  @ApiProperty({ enum: UserRoleEnum })
  @IsEnum(UserRoleEnum)
  requestedRole!: RequestableRole;

  @ApiPropertyOptional({ example: 'I am organizing a conference in June' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}

import { IsEnum } from 'class-validator';
import {
  UserRoleEnum,
  RequestableRoleEnum,
} from '../../common/enums/roles.enum';

export class CreateRoleRequestDto {
  @IsEnum(UserRoleEnum)
  requestedRole!: RequestableRoleEnum;
}

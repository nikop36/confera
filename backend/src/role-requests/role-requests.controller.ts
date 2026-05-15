import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleRequestsService } from './role-requests.service';

@ApiTags('rolerequest')
@Controller('rolerequest')
export class RoleRequestController {
  constructor(private readonly roleRequestService: RoleRequestsService) {}
}

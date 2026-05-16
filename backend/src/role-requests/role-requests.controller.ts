import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleRequestsService } from './role-requests.service';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('role-requests')
@Controller('role-requests')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class RoleRequestController {
  constructor(private readonly roleRequestService: RoleRequestsService) {}

  // Any logged in user can submit a request
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a role upgrade request' })
  @ApiResponse({ status: 201, description: 'Request submitted' })
  @ApiResponse({
    status: 400,
    description: 'Already requested or already has role',
  })
  async createRequest(
    @CurrentUser() user: FirebaseUser,
    @Body() dto: CreateRoleRequestDto,
  ) {
    return this.roleRequestService.createRoleRequest(user, dto);
  }

  // Admin only — list all pending requests
  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all pending role requests (admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending requests' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getPending() {
    return this.roleRequestService.getPendingRequests();
  }

  // Admin only — approve a request
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a role request (admin only)' })
  @ApiResponse({ status: 200, description: 'Request approved' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async approve(@Param('id') id: string, @CurrentUser() admin: FirebaseUser) {
    await this.roleRequestService.approveRequest(id, admin);
    return { message: 'Request approved successfully' };
  }

  // Admin only — reject a request
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a role request (admin only)' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async reject(@Param('id') id: string, @CurrentUser() admin: FirebaseUser) {
    await this.roleRequestService.rejectRequest(id, admin);
    return { message: 'Request rejected' };
  }
}

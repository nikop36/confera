import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';

@ApiTags('users')
@Controller('users')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('community')
  @ApiOperation({
    summary: 'List all non-admin users for the community directory',
  })
  @ApiResponse({ status: 200, description: 'Community users returned' })
  async listCommunityUsers() {
    return this.usersService.listCommunityUsers();
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List users for admin selection/search' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filter by displayName or email',
  })
  @ApiResponse({ status: 200, description: 'Users returned' })
  async listUsers(@Query('search') search?: string) {
    const users = await this.usersService.listUsers(search);

    return users.map((user) => ({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      profileStatus: user.profileStatus,
    }));
  }

  @Get('admin')
  @Roles('admin')
  @ApiOperation({ summary: 'List users with admin moderation metadata' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filter by displayName or email',
  })
  @ApiResponse({ status: 200, description: 'Admin users returned' })
  async listUsersForAdmin(@Query('search') search?: string) {
    const users = await this.usersService.listUsersForAdmin(search);

    return users.map((user) => ({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      profileStatus: user.profileStatus,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastActiveAt: user.lastActiveAt,
      updatedAt: user.updatedAt,
      reportCount: user.reportCount,
      reports: user.reports,
    }));
  }

  @Delete(':uid')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user profile as an admin' })
  @ApiResponse({ status: 200, description: 'User profile deleted' })
  async deleteUser(
    @Param('uid') uid: string,
    @CurrentUser() currentUser: FirebaseUser,
  ) {
    await this.usersService.deleteUserAsAdmin(uid, currentUser.uid);
    return { message: 'User deleted successfully' };
  }
}

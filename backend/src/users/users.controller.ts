import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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

@ApiTags('users')
@Controller('users')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
    }));
  }
}


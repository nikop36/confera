import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // list all notifications
  @Get()
  @ApiOperation({ summary: 'Get last 30 notifications' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description:
      'createdAt timestamp of the last notification for the next page',
  })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getMyNotifications(
    @CurrentUser() user: FirebaseUser,
    @Query('cursor') cursor?: string,
  ) {
    return this.notificationsService.getMyNotifications(user, cursor);
  }

  // Mark all notifications as read - static route
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: FirebaseUser) {
    return this.notificationsService.markAllAsRead(user);
  }

  // Mark a singular notification as read
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification is marked as read' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: FirebaseUser) {
    return this.notificationsService.markAsRead(id, user);
  }

  // Delete your own notification
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: FirebaseUser,
  ) {
    return this.notificationsService.deleteNotification(id, user);
  }
}

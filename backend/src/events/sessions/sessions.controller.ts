import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsEnum } from 'class-validator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../../common/interfaces/firebase-user.interface';

class PresenterResponseDto {
  @ApiProperty({ enum: ['confirmed', 'declined'] })
  @IsEnum(['confirmed', 'declined'])
  status!: 'confirmed' | 'declined';
}

@ApiTags('sessions')
@Controller('events/:eventId/sessions')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all sessions for a conference' })
  @ApiResponse({ status: 200, description: 'Sessions returned' })
  async listSessions(
    @Param('eventId') eventId: string,
    @CurrentUser() user: FirebaseUser,
  ) {
    return this.sessionsService.listSessions(eventId, user.uid);
  }

  @Post()
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(
    @Param('eventId') eventId: string,
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.sessionsService.createSession(eventId, dto, user.uid);
  }

  @Patch(':sessionId')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Update a session' })
  @ApiResponse({ status: 200, description: 'Session updated' })
  async updateSession(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    await this.sessionsService.updateSession(eventId, sessionId, dto);
  }

  @Delete(':sessionId')
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a session' })
  @ApiResponse({ status: 204, description: 'Session deleted' })
  async deleteSession(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionsService.deleteSession(eventId, sessionId);
  }

  @Patch(':sessionId/presenter-response')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Respond to a presenter invitation (confirm or decline)',
  })
  @ApiResponse({ status: 204, description: 'Response recorded' })
  @ApiResponse({ status: 403, description: 'Not the invited presenter' })
  @ApiResponse({ status: 409, description: 'Invitation already responded to' })
  async respondToPresenterInvite(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: PresenterResponseDto,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.sessionsService.respondToPresenterInvite(
      eventId,
      sessionId,
      user.uid,
      dto.status,
    );
  }

  @Post(':sessionId/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register current user for a session' })
  @ApiResponse({ status: 201, description: 'Registered' })
  @ApiResponse({ status: 409, description: 'Session is full' })
  async registerForSession(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.sessionsService.registerForSession(eventId, sessionId, user.uid);
  }

  @Delete(':sessionId/register')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel registration for current user' })
  @ApiResponse({ status: 204, description: 'Cancelled' })
  async cancelRegistration(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.sessionsService.cancelRegistration(eventId, sessionId, user.uid);
  }

  @Get(':sessionId/registrations')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'List all registrations for a session' })
  @ApiResponse({ status: 200, description: 'Registrations returned' })
  async listRegistrations(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.listRegistrations(eventId, sessionId);
  }
}

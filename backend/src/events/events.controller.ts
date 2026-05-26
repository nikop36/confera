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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';

@ApiTags('events')
@Controller('events')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all events with registration status for caller',
  })
  @ApiResponse({ status: 200, description: 'Events returned' })
  async listEvents(@CurrentUser() user: FirebaseUser) {
    return this.eventsService.listEvents(user.uid);
  }

  @Post()
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created' })
  async createEvent(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.eventsService.createEvent(dto, user.uid);
  }

  @Patch(':id')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'Update an event' })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    await this.eventsService.updateEvent(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an event' })
  @ApiResponse({ status: 204, description: 'Event deleted' })
  async deleteEvent(@Param('id') id: string) {
    await this.eventsService.deleteEvent(id);
  }

  @Post(':id/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register current user for an event' })
  @ApiResponse({ status: 201, description: 'Registered' })
  @ApiResponse({ status: 409, description: 'Event is full' })
  async registerForEvent(
    @Param('id') id: string,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.eventsService.registerForEvent(id, user.uid);
  }

  @Delete(':id/register')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel registration for current user' })
  @ApiResponse({ status: 204, description: 'Cancelled' })
  async cancelRegistration(
    @Param('id') id: string,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.eventsService.cancelRegistration(id, user.uid);
  }

  @Get(':id/registrations')
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'List all registrations for an event' })
  @ApiResponse({ status: 200, description: 'Registrations returned' })
  async listRegistrations(@Param('id') id: string) {
    return this.eventsService.listRegistrations(id);
  }
}

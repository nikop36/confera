import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { SchedulingService } from './scheduling.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import { GenerateTimeSlotsDto } from './dto/generate-time-slots.dto';
import { AssignMeetingDto } from './dto/assign-meeting.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { UpdateMeetingStatusDto } from './dto/update-meeting-status.dto';
import type { MeetingStatus } from '../common/interfaces/meeting.interface';

@ApiTags('scheduling')
@Controller('scheduling')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('rooms')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a room for meeting scheduling' })
  @ApiResponse({ status: 201, description: 'Room created' })
  async createRoom(@Body() dto: CreateRoomDto) {
    return this.schedulingService.createRoom(dto);
  }

  @Get('rooms')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'List active rooms' })
  @ApiResponse({ status: 200, description: 'Rooms returned' })
  async listRooms() {
    return this.schedulingService.listRooms();
  }

  @Get('rooms/all')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'List all rooms including inactive' })
  @ApiResponse({ status: 200, description: 'Rooms returned' })
  async listAllRooms() {
    return this.schedulingService.listAllRooms();
  }

  @Patch('rooms/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update room' })
  @ApiResponse({ status: 200, description: 'Room updated' })
  async updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.schedulingService.updateRoom(id, dto);
  }

  @Delete('rooms/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete room' })
  @ApiResponse({ status: 200, description: 'Room deleted' })
  @ApiResponse({ status: 409, description: 'Room has linked meetings' })
  async deleteRoom(@Param('id') id: string) {
    return this.schedulingService.deleteRoom(id);
  }

  @Post('time-slots/generate')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate available time slots for date range' })
  @ApiResponse({ status: 201, description: 'Time slots generated' })
  async generateTimeSlots(@Body() dto: GenerateTimeSlotsDto) {
    return this.schedulingService.generateTimeSlots(dto);
  }

  @Get('time-slots')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'List generated time slots' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'ISO date-time lower bound',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'ISO date-time upper bound',
  })
  @ApiResponse({ status: 200, description: 'Time slots returned' })
  async listTimeSlots(@Query('from') from?: string, @Query('to') to?: string) {
    return this.schedulingService.listTimeSlots(from, to);
  }

  @Get('time-slots/availability')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'List time slot availability (free/booked)' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'ISO date-time lower bound',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'ISO date-time upper bound',
  })
  @ApiQuery({
    name: 'roomId',
    required: false,
    description: 'Room ID to view booking occupancy for one room',
  })
  @ApiResponse({ status: 200, description: 'Time slot availability returned' })
  async listTimeSlotAvailability(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.schedulingService.getTimeSlotAvailability(from, to, roomId);
  }

  @Patch('time-slots/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a time slot' })
  @ApiResponse({ status: 200, description: 'Time slot updated' })
  async updateTimeSlot(
    @Param('id') id: string,
    @Body() dto: UpdateTimeSlotDto,
  ) {
    return this.schedulingService.updateTimeSlot(id, dto);
  }

  @Delete('time-slots/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a time slot' })
  @ApiResponse({ status: 200, description: 'Time slot deleted' })
  @ApiResponse({ status: 409, description: 'Time slot has linked meetings' })
  async deleteTimeSlot(@Param('id') id: string) {
    return this.schedulingService.deleteTimeSlot(id);
  }

  @Post('meetings/assign')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Assign meeting to room and time slot with conflict checks',
  })
  @ApiResponse({ status: 201, description: 'Meeting assigned' })
  @ApiResponse({
    status: 409,
    description: 'Room/participant conflict detected',
  })
  async assignMeeting(@Body() dto: AssignMeetingDto) {
    return this.schedulingService.assignMeeting(dto);
  }

  @Get('meetings')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @ApiOperation({ summary: 'List meetings' })
  @ApiResponse({ status: 200, description: 'Meetings returned' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Meeting status filter: scheduled | completed | cancelled',
  })
  @ApiQuery({
    name: 'roomId',
    required: false,
    description: 'Room ID filter',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Slot start lower bound (ISO date-time)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Slot start upper bound (ISO date-time)',
  })
  async listMeetings(
    @Query('status') status?: MeetingStatus,
    @Query('roomId') roomId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.schedulingService.listMeetings(status, roomId, from, to);
  }

  @Patch('meetings/:id/status')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update meeting status' })
  @ApiResponse({ status: 200, description: 'Meeting status updated' })
  async updateMeetingStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingStatusDto,
  ) {
    return this.schedulingService.updateMeetingStatus(id, dto);
  }

  @Delete('meetings/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete meeting' })
  @ApiResponse({ status: 200, description: 'Meeting deleted' })
  @ApiResponse({ status: 404, description: 'Meeting not found' })
  async deleteMeeting(@Param('id') id: string) {
    return this.schedulingService.deleteMeeting(id);
  }
}

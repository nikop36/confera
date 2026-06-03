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
import { CareerSlotsService } from './career-slots.service';
import { CreateCareerSlotDto } from './dto/create-career-slot.dto';
import { UpdateCareerSlotDto } from './dto/update-career-slot.dto';
import { RespondToRequestDto } from './dto/respond-to-request.dto';
import { RequestCareerSlotDto } from './dto/request-career-slot.dto';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../../common/interfaces/firebase-user.interface';

@ApiTags('career-slots')
@Controller('events/:eventId/career-slots')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CareerSlotsController {
  constructor(private readonly careerSlotsService: CareerSlotsService) {}

  @Get()
  @ApiOperation({ summary: 'List career slots for an event' })
  @ApiResponse({ status: 200, description: 'Slots returned' })
  async listSlots(
    @Param('eventId') eventId: string,
    @CurrentUser() user: FirebaseUser,
  ) {
    return this.careerSlotsService.listSlots(eventId, user.uid);
  }

  @Post()
  @Roles('industry', 'admin', 'organizer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a career slot' })
  @ApiResponse({ status: 201, description: 'Slot created' })
  async createSlot(
    @Param('eventId') eventId: string,
    @Body() dto: CreateCareerSlotDto,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.careerSlotsService.createSlot(eventId, dto, user.uid);
  }

  @Patch(':slotId')
  @Roles('industry', 'admin', 'organizer')
  @ApiOperation({ summary: 'Update a career slot' })
  @ApiResponse({ status: 200, description: 'Slot updated' })
  async updateSlot(
    @Param('eventId') eventId: string,
    @Param('slotId') slotId: string,
    @Body() dto: UpdateCareerSlotDto,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.careerSlotsService.updateSlot(eventId, slotId, dto, user.uid);
  }

  @Delete(':slotId')
  @Roles('industry', 'admin', 'organizer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a career slot' })
  @ApiResponse({ status: 204, description: 'Slot deleted' })
  async deleteSlot(
    @Param('eventId') eventId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.careerSlotsService.deleteSlot(eventId, slotId, user.uid);
  }

  @Post(':slotId/request')
  @Roles('participant', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a spot in a career slot' })
  @ApiResponse({ status: 201, description: 'Request submitted' })
  @ApiResponse({
    status: 409,
    description: 'Already requested, slot full, or sub-slot taken',
  })
  async requestSlot(
    @Param('eventId') eventId: string,
    @Param('slotId') slotId: string,
    @Body() dto: RequestCareerSlotDto,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.careerSlotsService.requestSlot(
      eventId,
      slotId,
      user.uid,
      dto.subSlotIndex,
    );
  }

  @Get(':slotId/requests')
  @Roles('industry', 'admin', 'organizer')
  @ApiOperation({ summary: 'List requests for a career slot' })
  @ApiResponse({ status: 200, description: 'Requests returned' })
  async listRequests(
    @Param('eventId') eventId: string,
    @Param('slotId') slotId: string,
    @CurrentUser() user: FirebaseUser,
  ) {
    return this.careerSlotsService.listRequests(eventId, slotId, user.uid);
  }

  @Patch(':slotId/requests/:requestId')
  @Roles('industry', 'admin', 'organizer')
  @ApiOperation({ summary: 'Approve or decline a career slot request' })
  @ApiResponse({ status: 200, description: 'Request updated' })
  async respondToRequest(
    @Param('eventId') eventId: string,
    @Param('slotId') slotId: string,
    @Param('requestId') requestId: string,
    @Body() dto: RespondToRequestDto,
    @CurrentUser() user: FirebaseUser,
  ) {
    await this.careerSlotsService.respondToRequest(
      eventId,
      slotId,
      requestId,
      user.uid,
      dto.status,
    );
  }

  @Patch(':slotId/approve')
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Approve a pending career slot' })
  @ApiResponse({ status: 204, description: 'Slot approved' })
  async approveSlot(
    @Param('eventId') eventId: string,
    @Param('slotId') slotId: string,
  ) {
    await this.careerSlotsService.approveSlot(eventId, slotId);
  }

  @Patch(':slotId/reject')
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject a pending career slot' })
  @ApiResponse({ status: 204, description: 'Slot rejected' })
  async rejectSlot(
    @Param('eventId') eventId: string,
    @Param('slotId') slotId: string,
  ) {
    await this.careerSlotsService.rejectSlot(eventId, slotId);
  }
}

@ApiTags('career-bookings')
@Controller('career-bookings')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CareerBookingsController {
  constructor(private readonly careerSlotsService: CareerSlotsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'List all approved career slot bookings for the current user',
  })
  @ApiResponse({ status: 200, description: 'Bookings returned' })
  async getMyBookings(@CurrentUser() user: FirebaseUser) {
    return this.careerSlotsService.listMyBookings(user.uid);
  }
}

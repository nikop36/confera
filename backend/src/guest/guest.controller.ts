import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { GuestsService } from './guest.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AddGuestDto } from './dto/guest.dto';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('guests')
@Controller('events/:eventId/guests')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  @Roles('admin', 'organizer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a guest to an event' })
  @ApiResponse({ status: 201, description: 'Guest invitation sent' })
  @ApiResponse({ status: 400, description: 'Guest limit reached' })
  @ApiResponse({ status: 403, description: 'Not your event' })
  async addGuest(
    @Param('eventId') eventId: string,
    @Body() dto: AddGuestDto,
    @CurrentUser() user: FirebaseUser,
  ) {
    return this.guestsService.addGuest(eventId, user.uid, dto);
  }
}

@ApiTags('guests')
@Controller('guests')
export class GuestsPublicController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm guest event invitation via token link' })
  @ApiQuery({ name: 'token', required: true })
  async confirmInvitation(@Query('token') token: string) {
    return this.guestsService.confirmInvitation(token);
  }
}

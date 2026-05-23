import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@Controller('statistics')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin', 'organizer')
@ApiBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('room-occupancy')
  @ApiOperation({ summary: 'Room occupancy statistics for dashboard' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'ISO date-time start (inclusive)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'ISO date-time end (exclusive)',
  })
  @ApiResponse({ status: 200, description: 'Room occupancy statistics' })
  async getRoomOccupancy(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statisticsService.getRoomOccupancyStats(from, to);
  }

  @Get('confirmed-meetings')
  @ApiOperation({ summary: 'Confirmed meetings/interviews count and timeline' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'ISO date-time start (inclusive)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'ISO date-time end (exclusive)',
  })
  @ApiResponse({
    status: 200,
    description: 'Confirmed meetings/interviews statistics',
  })
  async getConfirmedMeetings(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statisticsService.getConfirmedMeetingsStats(from, to);
  }
}

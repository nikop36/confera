import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Admin analytics overview' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200, description: 'Overview metrics' })
  @Roles('admin')
  async getOverview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getOverview(from, to);
  }

  @Get('usage-trend')
  @ApiOperation({ summary: 'Platform usage trends (daily buckets)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200, description: 'Usage trend series' })
  @Roles('admin')
  async getUsageTrend(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getUsageTrend(from, to);
  }

  @Get('matching-performance')
  @ApiOperation({ summary: 'Matching and conversion performance metrics' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200, description: 'Matching performance metrics' })
  @Roles('admin')
  async getMatchingPerformance(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getMatchingPerformance(from, to);
  }

  @Get('engagement')
  @ApiOperation({
    summary: 'Engagement metrics (connections/invites/notifications)',
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200, description: 'Engagement metrics' })
  @Roles('admin')
  async getEngagement(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getEngagement(from, to);
  }

  @Get('report')
  @ApiOperation({ summary: 'Export analytics report as JSON or CSV' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'json (default) or csv',
  })
  @ApiQuery({
    name: 'section',
    required: false,
    description:
      'all (default), overview, operations, usage, matching, engagement',
  })
  @ApiResponse({ status: 200, description: 'Report payload/export' })
  @Roles('admin')
  async getReport(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('format') format: 'json' | 'csv' | undefined,
    @Query('section')
    section:
      | 'all'
      | 'overview'
      | 'operations'
      | 'usage'
      | 'matching'
      | 'engagement'
      | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (format === 'csv') {
      const csv = await this.analyticsService.getReportCsv(from, to, section);
      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-${section ?? 'all'}-report.csv"`,
      );
      return csv;
    }
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="analytics-${section ?? 'all'}-report.json"`,
    );
    return this.analyticsService.getReportJson(from, to, section);
  }
}

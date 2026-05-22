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
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CareerInterviewsService } from './career-interviews.service';
import { CreateCareerInterviewDto } from './dto/create-career-interview.dto';
import { AssignCareerInterviewDto } from './dto/assign-career-interview.dto';
import { UpdateCareerInterviewStatusDto } from './dto/update-career-interview-status.dto';
import { UpdateCareerInterviewDto } from './dto/update-career-interview.dto';
import type { CareerInterviewStatus } from '../common/interfaces/career-interview.interface';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';

@ApiTags('career-interviews')
@Controller('career-interviews')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin', 'organizer')
@ApiBearerAuth()
export class CareerInterviewsController {
  constructor(
    private readonly careerInterviewsService: CareerInterviewsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create career interview request' })
  @ApiResponse({ status: 201, description: 'Career interview created' })
  async create(
    @CurrentUser() user: FirebaseUser,
    @Body() dto: CreateCareerInterviewDto,
  ) {
    return this.careerInterviewsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List career interviews' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Career interview status filter',
  })
  @ApiQuery({
    name: 'candidateUid',
    required: false,
    description: 'Candidate UID filter',
  })
  @ApiQuery({
    name: 'interviewerUid',
    required: false,
    description: 'Interviewer UID filter',
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
  @ApiResponse({ status: 200, description: 'Career interviews returned' })
  async list(
    @Query('status') status?: CareerInterviewStatus,
    @Query('candidateUid') candidateUid?: string,
    @Query('interviewerUid') interviewerUid?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.careerInterviewsService.list({
      status,
      candidateUid,
      interviewerUid,
      from,
      to,
    });
  }

  @Patch(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign interviewer, room and slot' })
  @ApiResponse({ status: 200, description: 'Career interview assigned' })
  @ApiResponse({ status: 409, description: 'Availability conflict detected' })
  async assign(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
    @Body() dto: AssignCareerInterviewDto,
  ) {
    return this.careerInterviewsService.assign(user, id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update career interview status' })
  @ApiResponse({ status: 200, description: 'Career interview status updated' })
  async updateStatus(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
    @Body() dto: UpdateCareerInterviewStatusDto,
  ) {
    return this.careerInterviewsService.updateStatus(user, id, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update career interview metadata' })
  @ApiResponse({ status: 200, description: 'Career interview updated' })
  async update(
    @CurrentUser() user: FirebaseUser,
    @Param('id') id: string,
    @Body() dto: UpdateCareerInterviewDto,
  ) {
    return this.careerInterviewsService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete career interview' })
  @ApiResponse({ status: 200, description: 'Career interview deleted' })
  async delete(@Param('id') id: string) {
    return this.careerInterviewsService.delete(id);
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { MatchingService } from './matching.service';

@ApiTags('matching')
@Controller('matches')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get AI profile matches for the current user' })
  @ApiResponse({ status: 200, description: 'Ranked matches returned' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({
    status: 503,
    description: 'Matching database is not configured',
  })
  async getMyMatches(@CurrentUser() user: FirebaseUser) {
    return this.matchingService.findMatchesForUser(user.uid);
  }
}

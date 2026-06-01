import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // GET /profile/me
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getMyProfile(@CurrentUser() user: FirebaseUser) {
    const profile = await this.profileService.findProfile(user.uid);
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  // PATCH /profile/me
  @Patch('me')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async updateMyProfile(
    @CurrentUser() user: FirebaseUser,
    @Body() dto: UpdateProfileDto,
  ) {
    await this.profileService.updateProfile(user.uid, dto);
    return { message: 'Profile updated successfully' };
  }

  // DELETE /profile/me
  @Delete('me')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async deleteMyAccount(@CurrentUser() user: FirebaseUser) {
    await this.profileService.deleteMyAccount(user.uid);
    return { message: 'Account deleted successfully' };
  }

  // GET /profile/:uid
  @Get(':uid')
  @ApiOperation({ summary: 'Get public profile by uid' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfile(@Param('uid') uid: string) {
    const profile = await this.profileService.findProfile(uid);
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }
}

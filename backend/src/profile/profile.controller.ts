import {
  Body,
  BadRequestException,
  Controller,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  Patch,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
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

  // POST /profile/images
  @Post('images')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['profile', 'background'] },
        image: { type: 'string', format: 'binary' },
      },
      required: ['type', 'image'],
    },
  })
  @ApiOperation({ summary: 'Upload profile or background image' })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async uploadProfileImage(
    @CurrentUser() user: FirebaseUser,
    @Body('type') type: 'profile' | 'background',
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    image: Express.Multer.File,
  ) {
    if (type !== 'profile' && type !== 'background') {
      throw new BadRequestException('Invalid image type');
    }

    return this.profileService.uploadProfileImage(user.uid, image, type);
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

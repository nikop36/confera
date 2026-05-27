import {
  Controller,
  Get,
  Post,
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
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('tags')
@Controller('tags')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags' })
  @ApiResponse({ status: 200, description: 'Tags returned' })
  async listTags() {
    return this.tagsService.listTags();
  }

  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a tag' })
  @ApiResponse({ status: 201, description: 'Tag created' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async createTag(@Body() dto: CreateTagDto) {
    await this.tagsService.createTag(dto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag' })
  @ApiResponse({ status: 204, description: 'Tag deleted' })
  async deleteTag(@Param('id') id: string) {
    await this.tagsService.deleteTag(id);
  }
}

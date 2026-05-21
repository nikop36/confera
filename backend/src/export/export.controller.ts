import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { ExportService } from './export.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';

type UploadedFilePayload = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

@ApiTags('export')
@Controller()
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('export/profile')
  @ApiOperation({ summary: 'Export your profile to CSV or Excel' })
  @ApiQuery({
    name: 'format',
    enum: ['csv', 'excel'],
    required: false,
    description: 'Export format — default csv',
  })
  @ApiResponse({ status: 200, description: 'Download file' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async exportProfile(
    @CurrentUser() user: FirebaseUser,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ) {
    if (format !== 'csv' && format !== 'excel') {
      throw new BadRequestException('The format must be "csv" or "excel"');
    }

    const { buffer, filename, mimetype } =
      await this.exportService.exportProfile(user.uid, format);

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Post('import/profile')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // keep file in memory
      limits: { fileSize: 1 * 1024 * 1024 }, // 1MB hard limit at multer level
    }),
  )
  @ApiOperation({ summary: 'Import profile from CSV or Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV or Excel file with profile data',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid file' })
  async importProfile(
    @CurrentUser() user: FirebaseUser,
    @UploadedFile() file: UploadedFilePayload,
  ) {
    if (!file) {
      throw new BadRequestException('File not uploaded');
    }

    return this.exportService.importProfile(user.uid, file);
  }
}

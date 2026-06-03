import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { FirebaseUser } from '../common/interfaces/firebase-user.interface';
import { EventsExportService } from './events-export.service';

type UploadedFilePayload = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};

@ApiTags('export')
@Controller('events')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EventsExportController {
  constructor(private readonly eventsExportService: EventsExportService) {}

  @Get(':id/registrations/export')
  @Roles('admin', 'organizer')
  @ApiOperation({
    summary: 'Export all registrations for an event as CSV or Excel',
  })
  @ApiQuery({ name: 'format', enum: ['csv', 'excel'], required: false })
  @ApiResponse({ status: 200, description: 'File returned' })
  @ApiResponse({ status: 403, description: 'Not your event' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async exportRegistrations(
    @Param('id') id: string,
    @Query('format') format: string = 'csv',
    @CurrentUser() user: FirebaseUser,
    @Res() res: Response,
  ) {
    if (format !== 'csv' && format !== 'excel') {
      throw new BadRequestException('Format must be "csv" or "excel"');
    }

    const { buffer, filename, mimetype } =
      await this.eventsExportService.exportRegistrations(id, user.uid, format);

    res.set('Content-Type', mimetype);
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.set('Content-Length', String(buffer.length));
    res.send(buffer);
  }

  @Post(':id/registrations/import')
  @Roles('admin', 'organizer')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 1048576 },
    }),
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import registrations for an event from CSV or Excel',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Import completed' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 403, description: 'Not your event' })
  async importRegistrations(
    @Param('id') id: string,
    @CurrentUser() user: FirebaseUser,
    @UploadedFile() file: UploadedFilePayload,
  ) {
    if (!file) throw new BadRequestException('File not uploaded');
    return this.eventsExportService.importRegistrations(id, user.uid, file);
  }
}

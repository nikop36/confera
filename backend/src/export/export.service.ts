import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { parseCsv, buildCsv } from './helpers/csv.helper';
import { parseExcel, buildExcel } from './helpers/excel.helper';
import { sanitizeImportRow } from './helpers/sanitize.helper';
import { IMPORTABLE_FIELDS } from '../common/constants/importable-fields';
import type { User, UserProfile } from '../common/interfaces/user.interface';

type ExportFormat = 'csv' | 'excel';

// Fields exported for the user — never includes sensitive data
const EXPORTABLE_PROFILE_FIELDS: Array<keyof (User & UserProfile)> = [
  'displayName',
  'email',
  'affiliation',
  'bio',
  'interests',
  'goals',
  'meetingType',
  'competencies',
  'researchKeywords',
];

@Injectable()
export class ExportService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async exportProfile(
    uid: string,
    format: ExportFormat,
  ): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    const user = await this.usersRepository.findByUid(uid);
    if (!user) throw new NotFoundException('User not found');

    // Build export object with only allowed fields
    const exportData: Record<string, unknown> = {};
    for (const field of EXPORTABLE_PROFILE_FIELDS) {
      const value = user[field];
      if (value !== undefined && value !== null) {
        exportData[field] = value;
      }
    }

    if (format === 'csv') {
      return {
        buffer: buildCsv(exportData),
        filename: 'profile.csv',
        mimetype: 'text/csv',
      };
    }

    return {
      buffer: await buildExcel(exportData),
      filename: 'profil.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async importProfile(
    uid: string,
    file: Express.Multer.File,
  ): Promise<{ message: string; updatedFields: string[] }> {
    this.validateFile(file);

    // Parse the file into raw rows
    let rows: Record<string, unknown>[];
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      rows = parseCsv(file.buffer);
    } else {
      rows = await parseExcel(file.buffer);
    }

    if (rows.length === 0) {
      throw new BadRequestException('The file is empty');
    }

    // Only take the first row — profile is a single record
    const raw = rows[0];
    const sanitized = sanitizeImportRow(raw);

    const updatedFields = Object.keys(sanitized);
    if (updatedFields.length === 0) {
      throw new BadRequestException(
        `There are no valid fields to import. Allowed fields: ${IMPORTABLE_FIELDS.join(', ')}`,
      );
    }

    await this.usersRepository.updateProfile(uid, sanitized);

    return {
      message: 'Profile successfully updated',
      updatedFields,
    };
  }

  private validateFile(file: Express.Multer.File): void {
    const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('File is too large — 1MB maximum');
    }

    const ALLOWED_MIMETYPES = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    const ALLOWED_EXTENSIONS = ['.csv', '.xlsx'];
    const extension = '.' + (file.originalname.split('.').pop() ?? '');

    if (
      !ALLOWED_MIMETYPES.includes(file.mimetype) &&
      !ALLOWED_EXTENSIONS.includes(extension)
    ) {
      throw new BadRequestException(
        'Wrong file type — allowed formats: CSV, Excel',
      );
    }
  }
}

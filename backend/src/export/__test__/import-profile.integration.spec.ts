import { Test } from '@nestjs/testing';
import { ExportService } from '../export.service';
import { UsersRepository } from '../../users/users.repository';
import { BadRequestException } from '@nestjs/common';

type UploadedFileFixture = Parameters<ExportService['importProfile']>[1];

function createUploadedFileFixture(
  buffer: Buffer,
  mimetype = 'text/csv',
  originalname = 'test.csv',
): UploadedFileFixture {
  return {
    buffer,
    mimetype,
    originalname,
    size: buffer.length,
  };
}

describe('Profile Import — Integration', () => {
  let exportService: ExportService;
  const mockUpdateProfile = jest.fn() as jest.MockedFunction<
    (uid: string, data: Record<string, unknown>) => Promise<void>
  >;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: UsersRepository,
          useValue: {
            findByUid: jest.fn().mockResolvedValue({ uid: 'uid-123' }),
            updateProfile: mockUpdateProfile,
          },
        },
      ],
    }).compile();

    exportService = module.get<ExportService>(ExportService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('CSV import', () => {
    it('should parse and import valid CSV fields', async () => {
      const csv = Buffer.from(
        'bio,affiliation,tags,meetingType\n' +
          'Researcher,FRI,ai|machine-learning,both',
      );

      const file = createUploadedFileFixture(csv);

      const result = await exportService.importProfile('uid-123', file);

      expect(result.updatedFields).toEqual(
        expect.arrayContaining(['bio', 'affiliation', 'tags', 'meetingType']),
      );
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        'uid-123',
        expect.objectContaining({
          bio: 'Researcher',
          affiliation: 'FRI',
          tags: ['ai', 'machine-learning'],
          meetingType: 'both',
        }),
      );
    });

    it('should silently strip forbidden fields like role and uid', async () => {
      const csv = Buffer.from(
        'bio,role,uid,email\n' + 'Researcher,admin,fake-uid,hacker@evil.com',
      );

      const file = createUploadedFileFixture(csv);

      await exportService.importProfile('uid-123', file);

      const calledWith = mockUpdateProfile.mock.calls[0][1];

      expect(calledWith).not.toHaveProperty('role');
      expect(calledWith).not.toHaveProperty('uid');
      expect(calledWith).not.toHaveProperty('email');
    });

    it('should throw BadRequestException for invalid meetingType', async () => {
      const csv = Buffer.from('meetingType\nflying');

      const file = createUploadedFileFixture(csv);

      await expect(
        exportService.importProfile('uid-123', file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no valid fields present', async () => {
      const csv = Buffer.from('role,uid\nadmin,fake');

      const file = createUploadedFileFixture(csv);

      await expect(
        exportService.importProfile('uid-123', file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file over 1MB', async () => {
      const largeBuffer = Buffer.alloc(2 * 1024 * 1024, 'a');

      const file = createUploadedFileFixture(largeBuffer);

      await expect(
        exportService.importProfile('uid-123', file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for wrong file type', async () => {
      const file = createUploadedFileFixture(
        Buffer.from('some data'),
        'application/pdf',
        'test.pdf',
      );

      await expect(
        exportService.importProfile('uid-123', file),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

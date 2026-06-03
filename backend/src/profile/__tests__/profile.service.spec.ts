import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ProfileService } from '../profile.service';
import { UsersRepository } from '../../users/users.repository';
import type { UserProfile } from '../../common/interfaces/user.interface';
import { MatchingIndexService } from '../../matching/matching-index.service';
import { FirebaseService } from '../../firebase/firebase.service';

describe('ProfileService', () => {
  let profileService: ProfileService;

  const mockFindByUid = jest.fn();
  const mockUpdateProfile = jest.fn();
  const mockSafeUpsertProfile = jest.fn();
  const mockSafeRemoveProfile = jest.fn();
  const mockDeleteAccountData = jest.fn();
  const mockDeleteUser = jest.fn();
  const mockUpsertProfileReport = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: UsersRepository,
          useValue: {
            findByUid: mockFindByUid,
            updateProfile: mockUpdateProfile,
            deleteAccountData: mockDeleteAccountData,
            upsertProfileReport: mockUpsertProfileReport,
          },
        },
        {
          provide: MatchingIndexService,
          useValue: {
            safeUpsertProfile: mockSafeUpsertProfile,
            safeRemoveProfile: mockSafeRemoveProfile,
          },
        },
        {
          provide: FirebaseService,
          useValue: {
            getAuth: jest.fn().mockReturnValue({
              deleteUser: mockDeleteUser,
            }),
          },
        },
      ],
    }).compile();

    profileService = module.get<ProfileService>(ProfileService);
    mockUpdateProfile.mockResolvedValue(undefined);
    mockSafeUpsertProfile.mockResolvedValue(undefined);
    mockSafeRemoveProfile.mockResolvedValue(undefined);
    mockDeleteAccountData.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findProfile()', () => {
    it('should return profile when user exists', async () => {
      const mockProfile = {
        uid: 'uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'participant',
        profileStatus: 'incomplete',
        createdAt: new Date(),
      };

      mockFindByUid.mockResolvedValue(mockProfile);

      const result = await profileService.findProfile('uid-123');
      expect(result).toEqual(mockProfile);
      expect(mockFindByUid).toHaveBeenCalledWith('uid-123');
    });

    it('should return null when user does not exist', async () => {
      mockFindByUid.mockResolvedValue(null);

      const result = await profileService.findProfile('non-existent-uid');
      expect(result).toBeNull();
    });
  });

  describe('updateProfile()', () => {
    it('should call updateProfile with only the provided fields', async () => {
      const partialUpdate: Partial<UserProfile> = { bio: 'Researcher at FRI' };
      mockFindByUid.mockResolvedValue({
        uid: 'uid-123',
        bio: 'Researcher at FRI',
      });

      await profileService.updateProfile('uid-123', partialUpdate);

      expect(mockUpdateProfile).toHaveBeenCalledWith('uid-123', partialUpdate);
      expect(mockSafeUpsertProfile).toHaveBeenCalledWith({
        uid: 'uid-123',
        bio: 'Researcher at FRI',
      });
    });

    it('should handle updating multiple fields at once', async () => {
      const partialUpdate: Partial<UserProfile> = {
        bio: 'Researcher',
        affiliation: 'Univerza v Ljubljani',
        interests: ['AI', 'ML'],
        meetingType: 'both',
      };
      mockFindByUid.mockResolvedValue({ uid: 'uid-123', ...partialUpdate });

      await profileService.updateProfile('uid-123', partialUpdate);

      expect(mockUpdateProfile).toHaveBeenCalledWith('uid-123', partialUpdate);
      expect(mockSafeUpsertProfile).toHaveBeenCalledWith({
        uid: 'uid-123',
        ...partialUpdate,
      });
    });

    it('does not sync the matching index when updated profile cannot be reloaded', async () => {
      mockFindByUid.mockResolvedValue(null);

      await profileService.updateProfile('uid-123', { bio: 'New bio' });

      expect(mockUpdateProfile).toHaveBeenCalledWith('uid-123', {
        bio: 'New bio',
      });
      expect(mockSafeUpsertProfile).not.toHaveBeenCalled();
    });
  });

  describe('deleteMyAccount()', () => {
    it('deletes user data, profile index and auth account', async () => {
      mockFindByUid.mockResolvedValue({ uid: 'uid-123' });

      await profileService.deleteMyAccount('uid-123');

      expect(mockDeleteAccountData).toHaveBeenCalledWith('uid-123');
      expect(mockSafeRemoveProfile).toHaveBeenCalledWith('uid-123');
      expect(mockDeleteUser).toHaveBeenCalledWith('uid-123');
    });

    it('throws when deleting a missing profile', async () => {
      mockFindByUid.mockResolvedValue(null);

      await expect(profileService.deleteMyAccount('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockDeleteAccountData).not.toHaveBeenCalled();
    });

    it('ignores Firebase auth deletion when auth user is already gone', async () => {
      mockFindByUid.mockResolvedValue({ uid: 'uid-123' });
      mockDeleteUser.mockRejectedValue({ code: 'auth/user-not-found' });

      await expect(
        profileService.deleteMyAccount('uid-123'),
      ).resolves.toBeUndefined();
      expect(mockDeleteAccountData).toHaveBeenCalledWith('uid-123');
      expect(mockSafeRemoveProfile).toHaveBeenCalledWith('uid-123');
    });

    it('throws when Firebase auth deletion fails unexpectedly', async () => {
      mockFindByUid.mockResolvedValue({ uid: 'uid-123' });
      mockDeleteUser.mockRejectedValue({ code: 'auth/internal-error' });

      await expect(profileService.deleteMyAccount('uid-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('reportProfile()', () => {
    it('creates or updates a profile report with a trimmed custom reason', async () => {
      mockFindByUid.mockResolvedValue({ uid: 'target-uid' });
      mockUpsertProfileReport.mockResolvedValue({
        id: 'report-1',
        targetUid: 'target-uid',
        reporterUid: 'reporter-uid',
        reason: 'spam',
        customReason: 'Repeated messages',
      });

      await expect(
        profileService.reportProfile('target-uid', 'reporter-uid', {
          reason: 'spam',
          customReason: '  Repeated messages  ',
        }),
      ).resolves.toMatchObject({
        id: 'report-1',
        customReason: 'Repeated messages',
      });
      expect(mockUpsertProfileReport).toHaveBeenCalledWith({
        targetUid: 'target-uid',
        reporterUid: 'reporter-uid',
        reason: 'spam',
        customReason: 'Repeated messages',
      });
    });

    it('omits blank custom report reasons', async () => {
      mockFindByUid.mockResolvedValue({ uid: 'target-uid' });
      mockUpsertProfileReport.mockResolvedValue({ id: 'report-1' });

      await profileService.reportProfile('target-uid', 'reporter-uid', {
        reason: 'other',
        customReason: '   ',
      });

      expect(mockUpsertProfileReport).toHaveBeenCalledWith({
        targetUid: 'target-uid',
        reporterUid: 'reporter-uid',
        reason: 'other',
        customReason: undefined,
      });
    });

    it('rejects self reports and missing target profiles', async () => {
      await expect(
        profileService.reportProfile('same-uid', 'same-uid', {
          reason: 'spam',
        }),
      ).rejects.toThrow(BadRequestException);

      mockFindByUid.mockResolvedValue(null);
      await expect(
        profileService.reportProfile('missing-uid', 'reporter-uid', {
          reason: 'spam',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

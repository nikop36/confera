import { Test, TestingModule } from '@nestjs/testing';
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
      mockUpdateProfile.mockResolvedValue(undefined);

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
      mockUpdateProfile.mockResolvedValue(undefined);

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
  });

  describe('deleteMyAccount()', () => {
    it('deletes user data, profile index and auth account', async () => {
      mockFindByUid.mockResolvedValue({ uid: 'uid-123' });
      mockDeleteAccountData.mockResolvedValue(undefined);
      mockSafeRemoveProfile.mockResolvedValue(undefined);
      mockDeleteUser.mockResolvedValue(undefined);

      await profileService.deleteMyAccount('uid-123');

      expect(mockDeleteAccountData).toHaveBeenCalledWith('uid-123');
      expect(mockSafeRemoveProfile).toHaveBeenCalledWith('uid-123');
      expect(mockDeleteUser).toHaveBeenCalledWith('uid-123');
    });
  });
});

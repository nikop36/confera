import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';

describe('UsersService', () => {
  let service: UsersService;
  const mockListUsers = jest.fn();
  const mockFindByUid = jest.fn();
  const mockDeleteAccountData = jest.fn();
  const mockListProfileReports = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            listUsers: mockListUsers,
            findByUid: mockFindByUid,
            saveUser: jest.fn(),
            deleteAccountData: mockDeleteAccountData,
            listProfileReports: mockListProfileReports,
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('listCommunityUsers', () => {
    it('returns public fields for non-admin users', async () => {
      mockListUsers.mockResolvedValue([
        {
          uid: 'u1',
          displayName: 'Ana Kovač',
          email: 'ana@example.com',
          role: 'participant',
          bio: 'Researcher',
          affiliation: 'UL',
          interests: ['AI'],
          goals: ['Networking'],
          meetingType: 'both',
          profileStatus: 'complete',
          createdAt: new Date(),
        },
        {
          uid: 'u2',
          displayName: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          profileStatus: 'complete',
          createdAt: new Date(),
        },
      ]);

      const result = await service.listCommunityUsers();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uid: 'u1',
        displayName: 'Ana Kovač',
        affiliation: 'UL',
        role: 'participant',
        bio: 'Researcher',
        interests: ['AI'],
        goals: ['Networking'],
        meetingType: 'both',
      });
      // must not include email
      expect(result[0]).not.toHaveProperty('email');
    });

    it('returns empty array when no non-admin users exist', async () => {
      mockListUsers.mockResolvedValue([]);
      const result = await service.listCommunityUsers();
      expect(result).toEqual([]);
    });
  });

  describe('deleteUserAsAdmin', () => {
    it('deletes another user profile', async () => {
      mockFindByUid.mockResolvedValue({
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'User One',
        role: 'participant',
        profileStatus: 'complete',
        createdAt: new Date(),
      });

      await service.deleteUserAsAdmin('user-1', 'admin-1');

      expect(mockDeleteAccountData).toHaveBeenCalledWith('user-1');
    });

    it('does not allow admins to delete themselves from the admin panel', async () => {
      await expect(
        service.deleteUserAsAdmin('admin-1', 'admin-1'),
      ).rejects.toThrow('Admins cannot delete their own account here');
      expect(mockDeleteAccountData).not.toHaveBeenCalled();
    });

    it('throws when the user does not exist', async () => {
      mockFindByUid.mockResolvedValue(null);

      await expect(
        service.deleteUserAsAdmin('missing-user', 'admin-1'),
      ).rejects.toThrow('User not found');
      expect(mockDeleteAccountData).not.toHaveBeenCalled();
    });
  });
});

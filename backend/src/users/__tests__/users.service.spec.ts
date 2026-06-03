import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';
import { UserRoleEnum } from '../../common/enums/roles.enum';

describe('UsersService', () => {
  let service: UsersService;
  const mockListUsers = jest.fn();
  const mockFindByUid = jest.fn();
  const mockDeleteAccountData = jest.fn();
  const mockListProfileReports = jest.fn();
  const mockSaveUser = jest.fn();
  const mockFindByEmail = jest.fn();
  const mockUpdateUserActivity = jest.fn();
  const mockUpgradeGuestToParticipant = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            listUsers: mockListUsers,
            findByUid: mockFindByUid,
            saveUser: mockSaveUser,
            findByEmail: mockFindByEmail,
            deleteAccountData: mockDeleteAccountData,
            listProfileReports: mockListProfileReports,
            updateUserActivity: mockUpdateUserActivity,
            upgradeGuestToParticipant: mockUpgradeGuestToParticipant,
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('basic user lookup and persistence', () => {
    it('creates a user through the repository', async () => {
      const user = {
        uid: 'u1',
        email: 'u1@example.com',
        displayName: 'User One',
        role: UserRoleEnum.PARTICIPANT,
        profileStatus: 'incomplete' as const,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      };
      mockSaveUser.mockResolvedValue(user);

      await expect(service.createUser(user)).resolves.toBe(user);
      expect(mockSaveUser).toHaveBeenCalledWith(user);
    });

    it('finds a user by uid', async () => {
      const user = {
        uid: 'u1',
        email: 'u1@example.com',
        displayName: 'User One',
        role: UserRoleEnum.PARTICIPANT,
        profileStatus: 'complete' as const,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      };
      mockFindByUid.mockResolvedValue(user);

      await expect(service.findByUid('u1')).resolves.toBe(user);
    });

    it('throws when finding a missing user by uid', async () => {
      mockFindByUid.mockResolvedValue(null);

      await expect(service.findByUid('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns null for optional uid and email lookups', async () => {
      mockFindByUid.mockResolvedValue(null);
      mockFindByEmail.mockResolvedValue(null);

      await expect(service.findByUidOrNull('missing')).resolves.toBeNull();
      await expect(
        service.findByEmailOrNull('missing@example.com'),
      ).resolves.toBeNull();
    });
  });

  describe('listUsers', () => {
    const users = [
      {
        uid: 'u1',
        displayName: 'Ana Kovač',
        email: 'ana@example.com',
        role: UserRoleEnum.PARTICIPANT,
        profileStatus: 'complete' as const,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      },
      {
        uid: 'u2',
        displayName: 'Boris Novak',
        email: 'boris@example.com',
        role: UserRoleEnum.ORGANIZER,
        profileStatus: 'complete' as const,
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
      },
    ];

    it('returns all users when no search term is provided', async () => {
      mockListUsers.mockResolvedValue(users);

      await expect(service.listUsers()).resolves.toEqual(users);
      expect(mockListUsers).toHaveBeenCalledWith(300);
    });

    it('filters users by display name or email', async () => {
      mockListUsers.mockResolvedValue(users);

      await expect(service.listUsers('ana')).resolves.toEqual([users[0]]);
      await expect(service.listUsers('BORIS@EXAMPLE')).resolves.toEqual([
        users[1],
      ]);
    });
  });

  describe('listUsersForAdmin', () => {
    it('attaches report counts and report details to each user', async () => {
      const reportedUser = {
        uid: 'u1',
        displayName: 'Reported User',
        email: 'reported@example.com',
        role: UserRoleEnum.PARTICIPANT,
        profileStatus: 'complete' as const,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      };
      const cleanUser = {
        uid: 'u2',
        displayName: 'Clean User',
        email: 'clean@example.com',
        role: UserRoleEnum.PARTICIPANT,
        profileStatus: 'complete' as const,
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
      };
      const report = {
        id: 'report-1',
        targetUid: 'u1',
        reporterUid: 'reporter-1',
        reason: 'spam',
        customReason: 'Repeated messages',
        createdAt: new Date('2026-02-01T10:00:00.000Z'),
        updatedAt: new Date('2026-02-01T11:00:00.000Z'),
      };
      mockListUsers.mockResolvedValue([reportedUser, cleanUser]);
      mockListProfileReports.mockResolvedValue([report]);

      const result = await service.listUsersForAdmin();

      expect(result).toEqual([
        {
          ...reportedUser,
          reportCount: 1,
          reports: [
            {
              id: report.id,
              reporterUid: report.reporterUid,
              reason: report.reason,
              customReason: report.customReason,
              createdAt: report.createdAt,
              updatedAt: report.updatedAt,
            },
          ],
        },
        {
          ...cleanUser,
          reportCount: 0,
          reports: [],
        },
      ]);
    });
  });

  describe('listCommunityUsers', () => {
    it('returns public fields for non-admin users', async () => {
      mockListUsers.mockResolvedValue([
        {
          uid: 'u1',
          displayName: 'Ana Kovač',
          email: 'ana@example.com',
          role: UserRoleEnum.PARTICIPANT,
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
          role: UserRoleEnum.ADMIN,
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
        role: UserRoleEnum.PARTICIPANT,
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

  describe('activity and guest upgrades', () => {
    it('marks login and active timestamps together', async () => {
      await service.markLoginActivity('u1');

      expect(mockUpdateUserActivity).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          lastLoginAt: expect.any(Date) as Date,
          lastActiveAt: expect.any(Date) as Date,
        }),
      );
    });

    it('upgrades a guest user to a real participant uid', async () => {
      await service.upgradeGuestToParticipant('guest@example.com', 'real-uid');

      expect(mockUpgradeGuestToParticipant).toHaveBeenCalledWith(
        'guest@example.com',
        'real-uid',
      );
    });

    it('keeps the bad request type for self-deletion checks', async () => {
      await expect(
        service.deleteUserAsAdmin('admin-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

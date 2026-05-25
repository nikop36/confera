import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';

describe('UsersService', () => {
  let service: UsersService;
  const mockListUsers = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            listUsers: mockListUsers,
            findByUid: jest.fn(),
            saveUser: jest.fn(),
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
});

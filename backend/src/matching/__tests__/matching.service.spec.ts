import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRoleEnum } from '../../common/enums/roles.enum';
import { UsersRepository } from '../../users/users.repository';
import { MatchingIndexService } from '../matching-index.service';
import { MatchingService } from '../matching.service';

describe('MatchingService', () => {
  let service: MatchingService;

  const mockFindByUid = jest.fn();
  const mockFindMatches = jest.fn();
  const matchingIndexService = {
    enabled: true,
    findMatches: mockFindMatches,
  };

  const profile = {
    uid: 'uid-1',
    email: 'ales@example.com',
    displayName: 'Aleš Močnik',
    role: UserRoleEnum.PARTICIPANT,
    profileStatus: 'complete',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        {
          provide: UsersRepository,
          useValue: {
            findByUid: mockFindByUid,
          },
        },
        {
          provide: MatchingIndexService,
          useValue: matchingIndexService,
        },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
    matchingIndexService.enabled = true;
  });

  afterEach(() => jest.clearAllMocks());

  it('should return matches for an existing user', async () => {
    const matches = [{ uid: 'uid-2', displayName: 'Dr. Petra Kos' }];
    mockFindByUid.mockResolvedValue(profile);
    mockFindMatches.mockResolvedValue(matches);

    await expect(service.findMatchesForUser('uid-1')).resolves.toEqual(matches);
    expect(mockFindByUid).toHaveBeenCalledWith('uid-1');
    expect(mockFindMatches).toHaveBeenCalledWith(profile);
  });

  it('should reject when matching database is disabled', async () => {
    matchingIndexService.enabled = false;

    await expect(service.findMatchesForUser('uid-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(mockFindByUid).not.toHaveBeenCalled();
  });

  it('should reject when profile does not exist', async () => {
    mockFindByUid.mockResolvedValue(null);

    await expect(service.findMatchesForUser('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(mockFindMatches).not.toHaveBeenCalled();
  });
});

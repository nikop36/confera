import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionsService } from '../connections.service';
import { ConnectionsRepository } from '../connections.repository';
import { UsersRepository } from '../../users/users.repository';
import { NotificationsService } from '../../notifications/notifications.service';
import { MatchingIndexService } from '../../matching/matching-index.service';
import { SchedulingRepository } from '../../scheduling/scheduling.repository';
import { UserRoleEnum } from '../../common/enums/roles.enum';

describe('ConnectionsService - getGraph()', () => {
  let service: ConnectionsService;

  const mockListByUser = jest.fn();
  const mockFindUserByUid = jest.fn();
  const mockFindMatches = jest.fn();
  const mockListMeetingsByParticipant = jest.fn();

  const selfUser = { uid: 'self-1', email: 'self@test.com' };
  const selfProfile = {
    uid: 'self-1',
    email: 'self@test.com',
    displayName: 'Self User',
    role: UserRoleEnum.PARTICIPANT,
    profileStatus: 'complete' as const,
    createdAt: new Date(),
    interests: ['AI'],
    goals: [],
    competencies: [],
    researchKeywords: [],
  };
  const peerProfile = {
    uid: 'peer-1',
    email: 'peer@test.com',
    displayName: 'Peer One',
    role: UserRoleEnum.INDUSTRY,
    affiliation: 'Acme',
    profileStatus: 'complete' as const,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionsService,
        {
          provide: ConnectionsRepository,
          useValue: {
            listByUser: mockListByUser,
            findById: jest.fn(),
            updateStatus: jest.fn(),
            deleteById: jest.fn(),
            findPendingBetweenUsers: jest.fn(),
            findAcceptedBetweenUsers: jest.fn(),
            createRequest: jest.fn(),
            listAccepted: jest.fn(),
          },
        },
        {
          provide: UsersRepository,
          useValue: { findByUid: mockFindUserByUid },
        },
        {
          provide: NotificationsService,
          useValue: { createNotification: jest.fn() },
        },
        {
          provide: MatchingIndexService,
          useValue: { enabled: true, findMatches: mockFindMatches },
        },
        {
          provide: SchedulingRepository,
          useValue: { listMeetingsByParticipant: mockListMeetingsByParticipant },
        },
      ],
    }).compile();

    service = module.get<ConnectionsService>(ConnectionsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns self node and peer connection node', async () => {
    mockListByUser.mockResolvedValue([
      { id: 'conn-1', requesterUid: 'self-1', recipientUid: 'peer-1', status: 'accepted', createdAt: new Date() },
    ]);
    mockFindUserByUid.mockImplementation((uid: string) =>
      Promise.resolve(uid === 'self-1' ? selfProfile : peerProfile),
    );
    mockFindMatches.mockResolvedValue([]);
    mockListMeetingsByParticipant.mockResolvedValue([]);

    const result = await service.getGraph(selfUser);

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.find((n) => n.type === 'self')?.id).toBe('self-1');
    expect(result.nodes.find((n) => n.type === 'connection')?.id).toBe('peer-1');
  });

  it('emits a connection edge for each accepted peer', async () => {
    mockListByUser.mockResolvedValue([
      { id: 'conn-1', requesterUid: 'self-1', recipientUid: 'peer-1', status: 'accepted', createdAt: new Date() },
    ]);
    mockFindUserByUid.mockImplementation((uid: string) =>
      Promise.resolve(uid === 'self-1' ? selfProfile : peerProfile),
    );
    mockFindMatches.mockResolvedValue([]);
    mockListMeetingsByParticipant.mockResolvedValue([]);

    const result = await service.getGraph(selfUser);

    expect(result.edges.some((e) => e.edgeType === 'connection' && e.target === 'peer-1')).toBe(true);
  });

  it('emits match edge when peer appears in AI results', async () => {
    mockListByUser.mockResolvedValue([
      { id: 'conn-1', requesterUid: 'self-1', recipientUid: 'peer-1', status: 'accepted', createdAt: new Date() },
    ]);
    mockFindUserByUid.mockImplementation((uid: string) =>
      Promise.resolve(uid === 'self-1' ? selfProfile : peerProfile),
    );
    mockFindMatches.mockResolvedValue([
      { uid: 'peer-1', score: 0.87, reasons: ['Skupna področja interesa: AI'] },
    ]);
    mockListMeetingsByParticipant.mockResolvedValue([]);

    const result = await service.getGraph(selfUser);

    const matchEdge = result.edges.find((e) => e.edgeType === 'match');
    expect(matchEdge).toBeDefined();
    expect(matchEdge?.weight).toBe(0.87);
    expect(matchEdge?.reasons).toContain('Skupna področja interesa: AI');
  });

  it('emits interaction edge with count when peer shares meetings', async () => {
    mockListByUser.mockResolvedValue([
      { id: 'conn-1', requesterUid: 'self-1', recipientUid: 'peer-1', status: 'accepted', createdAt: new Date() },
    ]);
    mockFindUserByUid.mockImplementation((uid: string) =>
      Promise.resolve(uid === 'self-1' ? selfProfile : peerProfile),
    );
    mockFindMatches.mockResolvedValue([]);
    mockListMeetingsByParticipant.mockResolvedValue([
      { id: 'm1', participantUids: ['self-1', 'peer-1'], slotId: 's1', roomId: 'r1', requestedByUids: [], requestedToUids: [], status: 'scheduled', createdAt: new Date() },
      { id: 'm2', participantUids: ['self-1', 'peer-1'], slotId: 's2', roomId: 'r1', requestedByUids: [], requestedToUids: [], status: 'completed', createdAt: new Date() },
    ]);

    const result = await service.getGraph(selfUser);

    const interactionEdge = result.edges.find((e) => e.edgeType === 'interaction' && e.target === 'peer-1');
    expect(interactionEdge?.count).toBe(2);
  });

  it('omits match edges gracefully when matching throws', async () => {
    mockListByUser.mockResolvedValue([
      { id: 'conn-1', requesterUid: 'self-1', recipientUid: 'peer-1', status: 'accepted', createdAt: new Date() },
    ]);
    mockFindUserByUid.mockImplementation((uid: string) =>
      Promise.resolve(uid === 'self-1' ? selfProfile : peerProfile),
    );
    mockFindMatches.mockRejectedValue(new Error('DB unavailable'));
    mockListMeetingsByParticipant.mockResolvedValue([]);

    const result = await service.getGraph(selfUser);

    expect(result.edges.some((e) => e.edgeType === 'match')).toBe(false);
    expect(result.edges.some((e) => e.edgeType === 'connection')).toBe(true);
  });

  it('filters out pending connections from the graph', async () => {
    mockListByUser.mockResolvedValue([
      { id: 'conn-1', requesterUid: 'self-1', recipientUid: 'peer-1', status: 'pending', createdAt: new Date() },
    ]);
    mockFindUserByUid.mockResolvedValue(selfProfile);
    mockFindMatches.mockResolvedValue([]);
    mockListMeetingsByParticipant.mockResolvedValue([]);

    const result = await service.getGraph(selfUser);

    expect(result.nodes).toHaveLength(1); // only self
    expect(result.edges).toHaveLength(0);
  });
});

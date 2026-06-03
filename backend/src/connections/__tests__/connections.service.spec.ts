import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionsService } from '../connections.service';
import { ConnectionsRepository } from '../connections.repository';
import { UsersRepository } from '../../users/users.repository';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationTypeEnum } from '../../common/enums/notification-type.enum';
import { MatchingIndexService } from '../../matching/matching-index.service';
import { SchedulingRepository } from '../../scheduling/scheduling.repository';

describe('ConnectionsService', () => {
  let service: ConnectionsService;

  const mockFindById = jest.fn();
  const mockUpdateStatus = jest.fn();
  const mockDeleteById = jest.fn();
  const mockListByUser = jest.fn();
  const mockFindPendingBetweenUsers = jest.fn();
  const mockFindAcceptedBetweenUsers = jest.fn();
  const mockCreateRequest = jest.fn();
  const mockFindUserByUid = jest.fn();
  const mockCreateNotification = jest.fn();
  const mockListAcceptedConnectionUids = jest.fn();
  const mockListAccepted = jest.fn();
  const mockFindMatches = jest.fn();
  const mockListMeetingsByParticipant = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionsService,
        {
          provide: ConnectionsRepository,
          useValue: {
            findById: mockFindById,
            updateStatus: mockUpdateStatus,
            deleteById: mockDeleteById,
            listByUser: mockListByUser,
            findPendingBetweenUsers: mockFindPendingBetweenUsers,
            findAcceptedBetweenUsers: mockFindAcceptedBetweenUsers,
            createRequest: mockCreateRequest,
            listAcceptedConnectionUids: mockListAcceptedConnectionUids,
            listAccepted: mockListAccepted,
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByUid: mockFindUserByUid,
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: mockCreateNotification,
          },
        },
        {
          provide: MatchingIndexService,
          useValue: { enabled: true, findMatches: mockFindMatches },
        },
        {
          provide: SchedulingRepository,
          useValue: {
            listMeetingsByParticipant: mockListMeetingsByParticipant,
          },
        },
      ],
    }).compile();

    service = module.get<ConnectionsService>(ConnectionsService);
    mockListAcceptedConnectionUids.mockResolvedValue([]);
    mockListAccepted.mockResolvedValue([]);
    mockFindMatches.mockResolvedValue([]);
    mockListMeetingsByParticipant.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendRequest()', () => {
    it('creates a pending connection request and notifies the recipient', async () => {
      mockFindUserByUid.mockResolvedValue({
        uid: 'recipient-1',
        email: 'recipient@example.com',
        displayName: 'Recipient',
      });
      mockFindPendingBetweenUsers.mockResolvedValue(null);
      mockFindAcceptedBetweenUsers.mockResolvedValue(null);
      mockCreateRequest.mockResolvedValue({
        id: 'req-1',
        requesterUid: 'sender-1',
        recipientUid: 'recipient-1',
        status: 'pending',
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      });

      const result = await service.sendRequest(
        { uid: 'sender-1', email: 'sender@example.com' },
        'recipient-1',
      );

      expect(result).toMatchObject({
        id: 'req-1',
        requesterUid: 'sender-1',
        recipientUid: 'recipient-1',
        status: 'pending',
      });
      expect(mockCreateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterUid: 'sender-1',
          recipientUid: 'recipient-1',
          status: 'pending',
          createdAt: expect.any(Date) as Date,
        }),
      );
      expect(mockCreateNotification).toHaveBeenCalledWith({
        uid: 'recipient-1',
        type: NotificationTypeEnum.CONNECTION_REQUEST,
        message: 'sender@example.com sent you a connection request.',
      });
    });

    it('rejects self requests, missing recipients, duplicates, and existing connections', async () => {
      await expect(
        service.sendRequest(
          { uid: 'sender-1', email: 'sender@example.com' },
          'sender-1',
        ),
      ).rejects.toThrow(BadRequestException);

      mockFindUserByUid.mockResolvedValueOnce(null);
      await expect(
        service.sendRequest(
          { uid: 'sender-1', email: 'sender@example.com' },
          'missing-user',
        ),
      ).rejects.toThrow(NotFoundException);

      mockFindUserByUid.mockResolvedValue({ uid: 'recipient-1' });
      mockFindPendingBetweenUsers.mockResolvedValueOnce({ id: 'pending-1' });
      await expect(
        service.sendRequest(
          { uid: 'sender-1', email: 'sender@example.com' },
          'recipient-1',
        ),
      ).rejects.toThrow(BadRequestException);

      mockFindPendingBetweenUsers.mockResolvedValue(null);
      mockFindAcceptedBetweenUsers.mockResolvedValueOnce({ id: 'accepted-1' });
      await expect(
        service.sendRequest(
          { uid: 'sender-1', email: 'sender@example.com' },
          'recipient-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveRequest()', () => {
    it('approves a pending request and notifies the requester', async () => {
      mockFindById.mockResolvedValue({
        id: 'req-1',
        requesterUid: 'sender-1',
        recipientUid: 'recipient-1',
        status: 'pending',
        createdAt: new Date(),
      });

      await expect(
        service.approveRequest(
          { uid: 'recipient-1', email: 'recipient@example.com' },
          'req-1',
        ),
      ).resolves.toEqual({ message: 'Connection request approved' });

      expect(mockUpdateStatus).toHaveBeenCalledWith('req-1', 'accepted');
      expect(mockCreateNotification).toHaveBeenCalledWith({
        uid: 'sender-1',
        type: NotificationTypeEnum.CONNECTION_ACCEPTED,
        message: 'Your connection request was accepted.',
      });
    });

    it('rejects invalid approval attempts', async () => {
      mockFindById.mockResolvedValueOnce(null);
      await expect(
        service.approveRequest(
          { uid: 'recipient-1', email: 'recipient@example.com' },
          'missing',
        ),
      ).rejects.toThrow(NotFoundException);

      mockFindById.mockResolvedValueOnce({
        id: 'req-1',
        requesterUid: 'sender-1',
        recipientUid: 'recipient-1',
        status: 'pending',
      });
      await expect(
        service.approveRequest(
          { uid: 'other-user', email: 'other@example.com' },
          'req-1',
        ),
      ).rejects.toThrow(ForbiddenException);

      mockFindById.mockResolvedValueOnce({
        id: 'req-1',
        requesterUid: 'sender-1',
        recipientUid: 'recipient-1',
        status: 'accepted',
      });
      await expect(
        service.approveRequest(
          { uid: 'recipient-1', email: 'recipient@example.com' },
          'req-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectRequest()', () => {
    it('updates status to rejected without creating a rejection notification', async () => {
      mockFindById.mockResolvedValue({
        id: 'req-1',
        requesterUid: 'sender-1',
        recipientUid: 'recipient-1',
        status: 'pending',
        createdAt: new Date(),
      });

      await service.rejectRequest(
        { uid: 'recipient-1', email: 'recipient@example.com' },
        'req-1',
      );

      expect(mockUpdateStatus).toHaveBeenCalledWith('req-1', 'rejected');
      expect(mockCreateNotification).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationTypeEnum.CONNECTION_REJECTED,
        }),
      );
    });

    it('rejects invalid rejection attempts', async () => {
      mockFindById.mockResolvedValueOnce(null);
      await expect(
        service.rejectRequest(
          { uid: 'recipient-1', email: 'recipient@example.com' },
          'missing',
        ),
      ).rejects.toThrow(NotFoundException);

      mockFindById.mockResolvedValueOnce({
        id: 'req-1',
        requesterUid: 'sender-1',
        recipientUid: 'recipient-1',
        status: 'pending',
      });
      await expect(
        service.rejectRequest(
          { uid: 'other-user', email: 'other@example.com' },
          'req-1',
        ),
      ).rejects.toThrow(ForbiddenException);

      mockFindById.mockResolvedValueOnce({
        id: 'req-1',
        requesterUid: 'sender-1',
        recipientUid: 'recipient-1',
        status: 'rejected',
      });
      await expect(
        service.rejectRequest(
          { uid: 'recipient-1', email: 'recipient@example.com' },
          'req-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeConnection()', () => {
    it('removes accepted connection when user is involved', async () => {
      mockFindById.mockResolvedValue({
        id: 'req-accepted',
        requesterUid: 'user-a',
        recipientUid: 'user-b',
        status: 'accepted',
        createdAt: new Date(),
      });

      const result = await service.removeConnection(
        { uid: 'user-a', email: 'a@example.com' },
        'req-accepted',
      );

      expect(result).toEqual({ message: 'Connection removed' });
      expect(mockDeleteById).toHaveBeenCalledWith('req-accepted');
    });

    it('throws when request is not found', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(
        service.removeConnection(
          { uid: 'user-a', email: 'a@example.com' },
          'missing-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when user is not part of the connection', async () => {
      mockFindById.mockResolvedValue({
        id: 'req-accepted',
        requesterUid: 'user-a',
        recipientUid: 'user-b',
        status: 'accepted',
        createdAt: new Date(),
      });

      await expect(
        service.removeConnection(
          { uid: 'user-c', email: 'c@example.com' },
          'req-accepted',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when trying to remove non-accepted connection', async () => {
      mockFindById.mockResolvedValue({
        id: 'req-pending',
        requesterUid: 'user-a',
        recipientUid: 'user-b',
        status: 'pending',
        createdAt: new Date(),
      });

      await expect(
        service.removeConnection(
          { uid: 'user-a', email: 'a@example.com' },
          'req-pending',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyConnections()', () => {
    it('groups pending and accepted requests and includes counterpart details', async () => {
      mockListByUser.mockResolvedValue([
        {
          id: 'received-1',
          requesterUid: 'alice',
          recipientUid: 'me',
          status: 'pending',
          createdAt: new Date('2026-01-01T10:00:00.000Z'),
        },
        {
          id: 'sent-1',
          requesterUid: 'me',
          recipientUid: 'boris',
          status: 'pending',
          createdAt: new Date('2026-01-02T10:00:00.000Z'),
        },
        {
          id: 'accepted-1',
          requesterUid: 'me',
          recipientUid: 'carla',
          status: 'accepted',
          createdAt: new Date('2026-01-03T10:00:00.000Z'),
        },
      ]);
      mockFindUserByUid.mockImplementation((uid: string) =>
        Promise.resolve(
          uid === 'boris'
            ? null
            : {
                uid,
                displayName: `${uid} name`,
                email: `${uid}@example.com`,
                affiliation: 'Confera',
              },
        ),
      );

      const result = await service.getMyConnections({
        uid: 'me',
        email: 'me@example.com',
      });

      expect(result.pendingCount).toBe(1);
      expect(result.pendingReceived[0].counterpart).toMatchObject({
        uid: 'alice',
        displayName: 'alice name',
      });
      expect(result.pendingSent[0].counterpart).toEqual({
        uid: 'boris',
        displayName: 'Unknown user',
        email: '',
      });
      expect(result.accepted[0].counterpart).toMatchObject({
        uid: 'carla',
        displayName: 'carla name',
      });
    });
  });

  describe('listAcceptedPairs()', () => {
    it('returns accepted connection pairs without internal fields', async () => {
      mockListAccepted.mockResolvedValue([
        {
          id: 'conn-1',
          requesterUid: 'user-a',
          recipientUid: 'user-b',
          status: 'accepted',
          createdAt: new Date(),
        },
      ]);

      await expect(service.listAcceptedPairs()).resolves.toEqual([
        {
          id: 'conn-1',
          requesterUid: 'user-a',
          recipientUid: 'user-b',
        },
      ]);
    });
  });

  describe('getGraph()', () => {
    it('returns an empty graph when the current profile does not exist', async () => {
      mockFindUserByUid.mockResolvedValue(null);

      await expect(
        service.getGraph({ uid: 'me', email: 'me@example.com' }),
      ).resolves.toEqual({ nodes: [], edges: [] });
    });

    it('builds connection, match, interaction, peer, and friend-of-friend graph data', async () => {
      mockFindUserByUid.mockImplementation((uid: string) =>
        Promise.resolve({
          uid,
          displayName: `${uid} name`,
          email: `${uid}@example.com`,
          role: 'participant',
          affiliation: 'Confera',
          tags: [`${uid}-tag`],
        }),
      );
      mockListByUser.mockResolvedValue([
        {
          id: 'conn-a',
          requesterUid: 'me',
          recipientUid: 'peer-a',
          status: 'accepted',
          createdAt: new Date(),
        },
        {
          id: 'conn-b',
          requesterUid: 'peer-b',
          recipientUid: 'me',
          status: 'accepted',
          createdAt: new Date(),
        },
      ]);
      mockFindMatches.mockResolvedValue([
        {
          uid: 'peer-a',
          score: 0.92,
          reasons: ['Shared AI interest'],
        },
        {
          uid: 'not-connected',
          score: 0.99,
          reasons: ['Ignored because not connected'],
        },
      ]);
      mockListMeetingsByParticipant.mockResolvedValue([
        { participantUids: ['me', 'peer-a'] },
        { participantUids: ['me', 'peer-a', 'peer-b'] },
      ]);
      mockListAcceptedConnectionUids.mockImplementation((uid: string) => {
        if (uid === 'peer-a') return Promise.resolve(['me', 'peer-b', 'fof-a']);
        return Promise.resolve(['me', 'peer-a']);
      });

      const result = await service.getGraph({
        uid: 'me',
        email: 'me@example.com',
      });

      expect(result.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'me', type: 'self' }),
          expect.objectContaining({ id: 'peer-a', type: 'connection' }),
          expect.objectContaining({ id: 'peer-b', type: 'connection' }),
          expect.objectContaining({ id: 'fof-a', type: 'fof' }),
        ]),
      );
      expect(result.edges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'conn-me-peer-a',
            edgeType: 'connection',
          }),
          expect.objectContaining({
            id: 'match-me-peer-a',
            edgeType: 'match',
            weight: 0.92,
          }),
          expect.objectContaining({
            id: 'interaction-me-peer-a',
            edgeType: 'interaction',
            count: 2,
          }),
          expect.objectContaining({
            id: 'peer-conn-peer-a|peer-b',
            edgeType: 'connection',
          }),
          expect.objectContaining({
            id: 'fof-conn-fof-a|peer-a',
            edgeType: 'connection',
          }),
        ]),
      );
    });
  });
});

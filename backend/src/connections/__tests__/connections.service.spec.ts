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
      ],
    }).compile();

    service = module.get<ConnectionsService>(ConnectionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
});

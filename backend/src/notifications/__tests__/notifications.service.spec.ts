import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { NotificationsRepository } from '../notifications.repository';
import { NotificationTypeEnum } from '../../common/enums/notification-type.enum';
import type { FirebaseUser } from '../../common/interfaces/firebase-user.interface';
import type { Notification } from '../../common/interfaces/notification.interface';
import { EmailService } from '../../email/email.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockCreate = jest.fn();
  const mockFindAllByUid = jest.fn();
  const mockFindById = jest.fn();
  const mockMarkAsRead = jest.fn();
  const mockMarkAllAsRead = jest.fn();
  const mockArchive = jest.fn();

  const mockUser: FirebaseUser = {
    uid: 'user-uid-123',
    email: 'test@example.com',
  };

  const mockNotification: Notification = {
    id: 'notif-id-789',
    uid: 'user-uid-123',
    type: NotificationTypeEnum.ROLE_APPROVED,
    message: 'Your Request has been approved.',
    read: false,
    archived: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsRepository,
          useValue: {
            create: mockCreate,
            findAllByUid: mockFindAllByUid,
            findById: mockFindById,
            markAsRead: mockMarkAsRead,
            markAllAsRead: mockMarkAllAsRead,
            archive: mockArchive,
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendNotificationEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── createNotification ──────────────────────────────────────────────────────

  describe('createNotification()', () => {
    it('should create notification with read: false and archived: false', async () => {
      mockCreate.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        uid: mockUser.uid,
        type: NotificationTypeEnum.ROLE_APPROVED,
        message: 'Your request has been approved.',
      });

      expect(result).toEqual(mockNotification);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: mockUser.uid,
          type: NotificationTypeEnum.ROLE_APPROVED,
          read: false,
          archived: false,
          createdAt: expect.any(Date) as Date,
        }),
      );
    });

    it('should not store sendEmail flag in Firestore', async () => {
      mockCreate.mockResolvedValue(mockNotification);

      await service.createNotification({
        uid: mockUser.uid,
        type: NotificationTypeEnum.ROLE_APPROVED,
        message: 'Your request has been approved.',
        sendEmail: true,
      });

      const calls = mockCreate.mock.calls as Array<
        Array<Record<string, unknown>>
      >;
      const calledWith = calls[0][0];
      expect(calledWith).not.toHaveProperty('sendEmail');
    });
  });

  // ─── getMyNotifications ──────────────────────────────────────────────────────

  describe('getMyNotifications()', () => {
    it('should return notifications for the user', async () => {
      mockFindAllByUid.mockResolvedValue([mockNotification]);

      const result = await service.getMyNotifications(mockUser);

      expect(result).toEqual([mockNotification]);
      expect(mockFindAllByUid).toHaveBeenCalledWith(mockUser.uid, undefined);
    });

    it('should return empty array when user has no notifications', async () => {
      mockFindAllByUid.mockResolvedValue([]);

      const result = await service.getMyNotifications(mockUser);

      expect(result).toEqual([]);
    });

    it('should pass parsed cursor to repository when provided', async () => {
      mockFindAllByUid.mockResolvedValue([mockNotification]);
      const cursor = '2026-05-16T09:05:03.112Z';

      await service.getMyNotifications(mockUser, cursor);

      expect(mockFindAllByUid).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({
          _seconds: expect.any(Number) as number,
          _nanoseconds: expect.any(Number) as number,
        }),
      );
    });
  });

  // ─── markAsRead ──────────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('should mark notification as read when user owns it', async () => {
      mockFindById.mockResolvedValue(mockNotification);
      mockMarkAsRead.mockResolvedValue(undefined);

      const result = await service.markAsRead('notif-id-789', mockUser);

      expect(mockMarkAsRead).toHaveBeenCalledWith('notif-id-789');
      expect(result).toEqual({ message: 'Notification marked as read' });
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        service.markAsRead('non-existent-id', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when notification belongs to another user', async () => {
      mockFindById.mockResolvedValue({
        ...mockNotification,
        uid: 'different-uid',
      });

      await expect(
        service.markAsRead('notif-id-789', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── markAllAsRead ───────────────────────────────────────────────────────────

  describe('markAllAsRead()', () => {
    it('should call markAllAsRead with the user uid', async () => {
      mockMarkAllAsRead.mockResolvedValue(undefined);

      const result = await service.markAllAsRead(mockUser);

      expect(mockMarkAllAsRead).toHaveBeenCalledWith(mockUser.uid);
      expect(result).toEqual({ message: 'All notifications marked as read' });
    });
  });

  // ─── deleteNotification ──────────────────────────────────────────────────────

  describe('deleteNotification()', () => {
    it('should archive notification when user owns it', async () => {
      mockFindById.mockResolvedValue(mockNotification);
      mockArchive.mockResolvedValue(undefined);

      const result = await service.deleteNotification('notif-id-789', mockUser);

      expect(mockArchive).toHaveBeenCalledWith('notif-id-789');
      expect(result).toEqual({ message: 'Notification deleted' });
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        service.deleteNotification('non-existent-id', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when notification belongs to another user', async () => {
      mockFindById.mockResolvedValue({
        ...mockNotification,
        uid: 'different-uid',
      });

      await expect(
        service.deleteNotification('notif-id-789', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

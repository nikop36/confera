import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SessionsService } from '../sessions.service';
import {
  SessionsRepository,
  SessionNotFoundError,
  SessionFullError,
} from '../sessions.repository';
import { UsersRepository } from '../../../users/users.repository';
import { NotificationsService } from '../../../notifications/notifications.service';
import { NotificationTypeEnum } from '../../../common/enums/notification-type.enum';

describe('SessionsService', () => {
  let service: SessionsService;
  const mockListSessions = jest.fn();
  const mockCreateSession = jest.fn();
  const mockUpdateSession = jest.fn();
  const mockDeleteSession = jest.fn();
  const mockFindById = jest.fn();
  const mockRegisterAtomic = jest.fn();
  const mockCancelRegistration = jest.fn();
  const mockListRegistrations = jest.fn();
  const mockFindByUid = jest.fn();
  const mockFindByEmail = jest.fn();
  const mockCreateNotification = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: SessionsRepository,
          useValue: {
            listSessions: mockListSessions,
            createSession: mockCreateSession,
            updateSession: mockUpdateSession,
            deleteSession: mockDeleteSession,
            findById: mockFindById,
            registerAtomic: mockRegisterAtomic,
            cancelRegistration: mockCancelRegistration,
            listRegistrations: mockListRegistrations,
          },
        },
        {
          provide: UsersRepository,
          useValue: { findByUid: mockFindByUid, findByEmail: mockFindByEmail },
        },
        {
          provide: NotificationsService,
          useValue: { createNotification: mockCreateNotification },
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('sets registeredCount 0, converts dates, passes speakers', async () => {
      mockCreateSession.mockResolvedValue(undefined);
      const dto = {
        title: 'AI Talk',
        description: 'About AI',
        speakers: [{ name: 'Jana Novak' }],
        startAt: '2026-06-15T09:00:00.000Z',
        endAt: '2026-06-15T10:00:00.000Z',
        location: 'Dvorana A',
        capacity: 60,
      };

      await service.createSession('event1', dto, 'admin-uid');

      expect(mockCreateSession).toHaveBeenCalledWith(
        'event1',
        expect.objectContaining({
          title: 'AI Talk',
          registeredCount: 0,
          createdBy: 'admin-uid',
          capacity: 60,
          speakers: [{ name: 'Jana Novak' }],
          startAt: new Date('2026-06-15T09:00:00.000Z'),
          endAt: new Date('2026-06-15T10:00:00.000Z'),
        }),
      );
    });

    it('stores capacity null when not provided', async () => {
      mockCreateSession.mockResolvedValue(undefined);
      const dto = {
        title: 'CTF',
        description: 'Hacking tournament',
        speakers: [],
        startAt: '2026-06-15T09:00:00.000Z',
        endAt: '2026-06-15T12:00:00.000Z',
        location: 'Učilnica',
      };

      await service.createSession('event1', dto, 'admin-uid');

      expect(mockCreateSession).toHaveBeenCalledWith(
        'event1',
        expect.objectContaining({ capacity: null }),
      );
    });

    it('creates a pending presenter invitation and notifies the presenter', async () => {
      mockCreateSession.mockResolvedValue({
        id: 's1',
        title: 'AI Talk',
      });
      mockFindByUid.mockResolvedValue({
        uid: 'presenter-uid',
        email: 'presenter@example.com',
        displayName: 'Presenter Person',
      });
      mockCreateNotification.mockResolvedValue(undefined);

      await service.createSession(
        'event1',
        {
          title: 'AI Talk',
          description: 'About AI',
          speakers: [],
          presenterUid: 'presenter-uid',
          presenterName: 'Presenter Person',
          startAt: '2026-06-15T09:00:00.000Z',
          endAt: '2026-06-15T10:00:00.000Z',
          location: 'Dvorana A',
          tags: ['ai'],
        },
        'admin-uid',
      );

      expect(mockCreateSession).toHaveBeenCalledWith(
        'event1',
        expect.objectContaining({
          presenterUid: 'presenter-uid',
          presenterName: 'Presenter Person',
          presenterStatus: 'pending',
          tags: ['ai'],
        }),
      );
      expect(mockCreateNotification).toHaveBeenCalledWith({
        uid: 'presenter-uid',
        email: 'presenter@example.com',
        displayName: 'Presenter Person',
        type: NotificationTypeEnum.SESSION_PRESENTER_INVITED,
        message:
          'You have been invited as a presenter for the session "AI Talk".',
      });
    });
  });

  describe('updateSession', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(
        service.updateSession('event1', 'nonexistent', { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates only the provided fields', async () => {
      mockFindById.mockResolvedValue({ id: 's1' });
      mockUpdateSession.mockResolvedValue(undefined);

      await service.updateSession('event1', 's1', { title: 'Updated' });

      expect(mockUpdateSession).toHaveBeenCalledWith('event1', 's1', {
        title: 'Updated',
      });
    });

    it('converts startAt and endAt strings to Date objects', async () => {
      mockFindById.mockResolvedValue({ id: 's1' });
      mockUpdateSession.mockResolvedValue(undefined);

      await service.updateSession('event1', 's1', {
        startAt: '2026-06-15T09:00:00.000Z',
        endAt: '2026-06-15T10:00:00.000Z',
      });

      expect(mockUpdateSession).toHaveBeenCalledWith(
        'event1',
        's1',
        expect.objectContaining({
          startAt: new Date('2026-06-15T09:00:00.000Z'),
          endAt: new Date('2026-06-15T10:00:00.000Z'),
        }),
      );
    });
  });

  describe('deleteSession', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(
        service.deleteSession('event1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes session when it exists', async () => {
      mockFindById.mockResolvedValue({ id: 's1' });
      mockDeleteSession.mockResolvedValue(undefined);

      await service.deleteSession('event1', 's1');

      expect(mockDeleteSession).toHaveBeenCalledWith('event1', 's1');
    });
  });

  describe('registerForSession', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockRegisterAtomic.mockRejectedValue(new SessionNotFoundError());
      await expect(
        service.registerForSession('event1', 'nonexistent', 'user1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when session is full', async () => {
      mockRegisterAtomic.mockRejectedValue(new SessionFullError());
      await expect(
        service.registerForSession('event1', 's1', 'user1'),
      ).rejects.toThrow(
        new ConflictException('Žal so se vsa mesta zapolnila.'),
      );
    });

    it('registers successfully when capacity is available', async () => {
      mockRegisterAtomic.mockResolvedValue(undefined);

      await service.registerForSession('event1', 's1', 'user1');

      expect(mockRegisterAtomic).toHaveBeenCalledWith('event1', 's1', 'user1');
    });
  });

  describe('respondToPresenterInvite', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        service.respondToPresenterInvite(
          'event1',
          'missing',
          'presenter-uid',
          'confirmed',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when session has no invited presenter', async () => {
      mockFindById.mockResolvedValue({
        id: 's1',
        title: 'AI Talk',
        createdBy: 'admin-uid',
      });

      await expect(
        service.respondToPresenterInvite(
          'event1',
          's1',
          'presenter-uid',
          'confirmed',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when another user responds', async () => {
      mockFindById.mockResolvedValue({
        id: 's1',
        title: 'AI Talk',
        createdBy: 'admin-uid',
        presenterUid: 'presenter-uid',
        presenterStatus: 'pending',
      });

      await expect(
        service.respondToPresenterInvite(
          'event1',
          's1',
          'other-uid',
          'confirmed',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when invitation was already answered', async () => {
      mockFindById.mockResolvedValue({
        id: 's1',
        title: 'AI Talk',
        createdBy: 'admin-uid',
        presenterUid: 'presenter-uid',
        presenterStatus: 'confirmed',
      });

      await expect(
        service.respondToPresenterInvite(
          'event1',
          's1',
          'presenter-uid',
          'declined',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('confirms a presenter invitation and notifies the session creator', async () => {
      mockFindById.mockResolvedValue({
        id: 's1',
        title: 'AI Talk',
        createdBy: 'admin-uid',
        presenterUid: 'presenter-uid',
        presenterStatus: 'pending',
      });
      mockUpdateSession.mockResolvedValue(undefined);
      mockFindByUid
        .mockResolvedValueOnce({
          uid: 'presenter-uid',
          displayName: 'Presenter Person',
        })
        .mockResolvedValueOnce({
          uid: 'admin-uid',
          email: 'admin@example.com',
          displayName: 'Admin Person',
        });
      mockCreateNotification.mockResolvedValue(undefined);

      await service.respondToPresenterInvite(
        'event1',
        's1',
        'presenter-uid',
        'confirmed',
      );

      expect(mockUpdateSession).toHaveBeenCalledWith('event1', 's1', {
        presenterStatus: 'confirmed',
      });
      expect(mockCreateNotification).toHaveBeenCalledWith({
        uid: 'admin-uid',
        email: 'admin@example.com',
        displayName: 'Admin Person',
        type: NotificationTypeEnum.SESSION_PRESENTER_CONFIRMED,
        message:
          'Presenter Person has confirmed their role for the session "AI Talk".',
      });
    });

    it('declines a presenter invitation, cancels the session, and notifies the creator', async () => {
      mockFindById.mockResolvedValue({
        id: 's1',
        title: 'AI Talk',
        createdBy: 'admin-uid',
        presenterUid: 'presenter-uid',
        presenterStatus: 'pending',
      });
      mockUpdateSession.mockResolvedValue(undefined);
      mockFindByUid.mockResolvedValue(undefined);
      mockCreateNotification.mockResolvedValue(undefined);

      await service.respondToPresenterInvite(
        'event1',
        's1',
        'presenter-uid',
        'declined',
      );

      expect(mockUpdateSession).toHaveBeenCalledWith('event1', 's1', {
        presenterStatus: 'declined',
        status: 'cancelled',
      });
      expect(mockCreateNotification).toHaveBeenCalledWith({
        uid: 'admin-uid',
        email: undefined,
        displayName: undefined,
        type: NotificationTypeEnum.SESSION_PRESENTER_DECLINED,
        message:
          'The presenter has declined their role for the session "AI Talk".',
      });
    });
  });

  describe('cancelRegistration', () => {
    it('delegates cancellation to repository', async () => {
      mockCancelRegistration.mockResolvedValue(undefined);

      await service.cancelRegistration('event1', 's1', 'user1');

      expect(mockCancelRegistration).toHaveBeenCalledWith(
        'event1',
        's1',
        'user1',
      );
    });
  });

  describe('listRegistrations', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(
        service.listRegistrations('event1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns registrations when session exists', async () => {
      const regs = [{ uid: 'u1', registeredAt: new Date() }];
      mockFindById.mockResolvedValue({ id: 's1' });
      mockListRegistrations.mockResolvedValue(regs);

      const result = await service.listRegistrations('event1', 's1');

      expect(result).toEqual(regs);
    });
  });
});

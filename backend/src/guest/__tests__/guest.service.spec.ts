import { Test, TestingModule } from '@nestjs/testing';
import { GuestsService } from '../guest.service';
import { UsersRepository } from '../../users/users.repository';
import { GuestInvitationsRepository } from '../guest.repository';
import { EventsRepository } from '../../events/events.repository';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('GuestsService', () => {
  let service: GuestsService;

  const mockUsersRepository = {
    findByEmail: jest.fn(),
    findByUid: jest.fn(),
    createGuestUser: jest.fn(),
    confirmGuest: jest.fn(),
  };

  const mockGuestInvitationsRepository = {
    findByGuestAndEvent: jest.fn(),
    findByToken: jest.fn(),
    create: jest.fn(),
    accept: jest.fn(),
  };

  const mockEventsRepository = {
    findById: jest.fn(),
    registerAtomic: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        {
          provide: GuestInvitationsRepository,
          useValue: mockGuestInvitationsRepository,
        },
        { provide: EventsRepository, useValue: mockEventsRepository },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<GuestsService>(GuestsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('addGuest()', () => {
    it('throws NotFoundException when event does not exist', async () => {
      mockEventsRepository.findById.mockResolvedValue(null);

      await expect(
        service.addGuest('event-1', 'caller-1', {
          email: 'guest@example.com',
          displayName: 'Guest User',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not event owner', async () => {
      mockEventsRepository.findById.mockResolvedValue({
        id: 'event-1',
        createdBy: 'other-user',
      });

      await expect(
        service.addGuest('event-1', 'caller-1', {
          email: 'guest@example.com',
          displayName: 'Guest User',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates guest user when email not found', async () => {
      mockEventsRepository.findById.mockResolvedValue({
        id: 'event-1',
        createdBy: 'caller-1',
        title: 'AI Meetup',
      });
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.createGuestUser.mockResolvedValue({
        uid: 'guest-1',
        email: 'guest@example.com',
        guestStatus: 'pending',
      });
      mockGuestInvitationsRepository.findByGuestAndEvent.mockResolvedValue(
        null,
      );
      mockGuestInvitationsRepository.create.mockResolvedValue({
        id: 'inv-1',
        confirmationToken: 'token',
      });

      await service.addGuest('event-1', 'caller-1', {
        email: 'guest@example.com',
        displayName: 'Guest User',
      });

      expect(mockUsersRepository.createGuestUser).toHaveBeenCalled();
      expect(mockGuestInvitationsRepository.create).toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('throws BadRequestException when email belongs to registered user', async () => {
      mockEventsRepository.findById.mockResolvedValue({
        id: 'event-1',
        createdBy: 'caller-1',
      });
      mockUsersRepository.findByEmail.mockResolvedValue({
        uid: 'u1',
        role: 'participant',
      });

      await expect(
        service.addGuest('event-1', 'caller-1', {
          email: 'registered@example.com',
          displayName: 'User',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when guest already invited to event', async () => {
      mockEventsRepository.findById.mockResolvedValue({
        id: 'event-1',
        createdBy: 'caller-1',
      });
      mockUsersRepository.findByEmail.mockResolvedValue({
        uid: 'guest-1',
        role: 'guest',
        guestStatus: 'confirmed',
      });
      mockGuestInvitationsRepository.findByGuestAndEvent.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.addGuest('event-1', 'caller-1', {
          email: 'guest@example.com',
          displayName: 'Guest',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmInvitation()', () => {
    it('throws BadRequestException for invalid token', async () => {
      mockGuestInvitationsRepository.findByToken.mockResolvedValue(null);

      await expect(service.confirmInvitation('bad-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when invitation already used', async () => {
      mockGuestInvitationsRepository.findByToken.mockResolvedValue({
        id: 'inv-1',
        status: 'accepted',
      });

      await expect(service.confirmInvitation('token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when invitation expired', async () => {
      mockGuestInvitationsRepository.findByToken.mockResolvedValue({
        id: 'inv-1',
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.confirmInvitation('token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when guest user does not exist', async () => {
      mockGuestInvitationsRepository.findByToken.mockResolvedValue({
        id: 'inv-1',
        status: 'pending',
        expiresAt: new Date(Date.now() + 10000),
        guestUid: 'missing',
      });
      mockUsersRepository.findByUid.mockResolvedValue(null);

      await expect(service.confirmInvitation('token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('confirms guest and registers them to event', async () => {
      mockGuestInvitationsRepository.findByToken.mockResolvedValue({
        id: 'inv-1',
        eventId: 'event-1',
        guestUid: 'guest-1',
        status: 'pending',
        expiresAt: new Date(Date.now() + 10000),
      });
      mockUsersRepository.findByUid.mockResolvedValue({
        uid: 'guest-1',
        guestStatus: 'pending',
        email: 'guest@example.com',
      });
      mockEventsRepository.registerAtomic.mockResolvedValue(undefined);

      await service.confirmInvitation('token');

      expect(mockUsersRepository.confirmGuest).toHaveBeenCalledWith('guest-1');
      expect(mockGuestInvitationsRepository.accept).toHaveBeenCalledWith(
        'inv-1',
      );
      expect(mockEventsRepository.registerAtomic).toHaveBeenCalledWith(
        'event-1',
        'guest-1',
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });
  });
});

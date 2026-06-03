import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventsExportService } from '../events-export.service';
import { EventFullError } from '../../events/events.repository';
import { UserRoleEnum } from '../../common/enums/roles.enum';
import { NotificationTypeEnum } from '../../common/enums/notification-type.enum';

const event = {
  id: 'event-1',
  title: 'AI Workshop',
  description: 'Workshop',
  startAt: new Date('2026-06-01T09:00:00.000Z'),
  endAt: new Date('2026-06-01T10:00:00.000Z'),
  location: 'Room A',
  capacity: 20,
  registeredCount: 0,
  createdBy: 'organizer-uid',
  createdAt: new Date('2026-05-01T09:00:00.000Z'),
};

const organizer = {
  uid: 'organizer-uid',
  email: 'organizer@example.com',
  displayName: 'Organizer',
  role: UserRoleEnum.ORGANIZER,
  profileStatus: 'complete' as const,
  createdAt: new Date('2026-05-01T09:00:00.000Z'),
};

const participant = {
  uid: 'participant-uid',
  email: 'participant@example.com',
  displayName: 'Participant',
  role: UserRoleEnum.PARTICIPANT,
  profileStatus: 'complete' as const,
  createdAt: new Date('2026-05-01T09:00:00.000Z'),
};

const guest = {
  uid: 'guest-uid',
  email: 'guest@example.com',
  displayName: 'Guest',
  role: UserRoleEnum.GUEST,
  guestStatus: 'confirmed' as const,
  profileStatus: 'complete' as const,
  createdAt: new Date('2026-05-01T09:00:00.000Z'),
};

describe('EventsExportService', () => {
  const eventsRepository = {
    findById: jest.fn(),
    listRegistrations: jest.fn(),
    registerAtomic: jest.fn(),
  };
  const usersRepository = {
    findByUid: jest.fn(),
    findByEmail: jest.fn(),
  };
  const notificationsService = {
    createNotification: jest.fn(),
  };
  const connectionsRepository = {
    areConnected: jest.fn(),
  };
  const guestInvitationsRepository = {
    findByGuestAndEvent: jest.fn(),
    create: jest.fn(),
  };

  let service: EventsExportService;

  beforeEach(() => {
    jest.clearAllMocks();

    eventsRepository.findById.mockResolvedValue(event);
    eventsRepository.listRegistrations.mockResolvedValue([]);
    eventsRepository.registerAtomic.mockResolvedValue(undefined);
    usersRepository.findByUid.mockImplementation((uid: string) => {
      if (uid === organizer.uid) return Promise.resolve(organizer);
      if (uid === participant.uid) return Promise.resolve(participant);
      if (uid === guest.uid) return Promise.resolve(guest);
      return Promise.resolve(null);
    });
    usersRepository.findByEmail.mockResolvedValue(participant);
    notificationsService.createNotification.mockResolvedValue(undefined);
    connectionsRepository.areConnected.mockResolvedValue(false);
    guestInvitationsRepository.findByGuestAndEvent.mockResolvedValue(null);
    guestInvitationsRepository.create.mockResolvedValue(undefined);

    service = new EventsExportService(
      eventsRepository as never,
      usersRepository as never,
      notificationsService as never,
      connectionsRepository as never,
      guestInvitationsRepository as never,
    );
  });

  it('exports event registrations as CSV rows', async () => {
    eventsRepository.listRegistrations.mockResolvedValue([
      { uid: participant.uid, registeredAt: new Date() },
    ]);

    const result = await service.exportRegistrations(
      event.id,
      organizer.uid,
      'csv',
    );

    expect(result.filename).toBe('event-event-1-registrations.csv');
    expect(result.mimetype).toBe('text/csv');
    expect(result.buffer.toString()).toContain('Participant');
    expect(result.buffer.toString()).toContain('participant@example.com');
  });

  it('rejects export when the caller does not own the event', async () => {
    usersRepository.findByUid.mockResolvedValue({
      ...participant,
      uid: 'other-user',
    });

    await expect(
      service.exportRegistrations(event.id, 'other-user', 'csv'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('auto-registers connected users during import', async () => {
    connectionsRepository.areConnected.mockResolvedValue(true);
    usersRepository.findByEmail.mockResolvedValue(participant);
    const csv = Buffer.from(
      'displayName,email\nParticipant,participant@example.com',
    );

    const result = await service.importRegistrations(event.id, organizer.uid, {
      buffer: csv,
      size: csv.length,
      mimetype: 'text/csv',
      originalname: 'registrations.csv',
    });

    expect(result).toMatchObject({
      message: 'Import completed',
      registeredCount: 1,
      invitedCount: 0,
      skippedCount: 0,
    });
    expect(eventsRepository.registerAtomic).toHaveBeenCalledWith(
      event.id,
      participant.uid,
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: participant.uid,
        type: NotificationTypeEnum.EVENT_AUTO_REGISTERED,
        eventId: event.id,
      }),
    );
  });

  it('sends an event invite when imported user is not connected', async () => {
    usersRepository.findByEmail.mockResolvedValue(participant);
    const csv = Buffer.from(
      'displayName,email\nParticipant,participant@example.com',
    );

    const result = await service.importRegistrations(event.id, organizer.uid, {
      buffer: csv,
      size: csv.length,
      mimetype: 'text/csv',
      originalname: 'registrations.csv',
    });

    expect(result.registeredCount).toBe(0);
    expect(result.invitedCount).toBe(1);
    expect(eventsRepository.registerAtomic).not.toHaveBeenCalled();
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: participant.uid,
        type: NotificationTypeEnum.EVENT_INVITE,
        eventId: event.id,
      }),
    );
  });

  it('creates a guest invitation for confirmed guests', async () => {
    usersRepository.findByEmail.mockResolvedValue(guest);
    const csv = Buffer.from('displayName,email\nGuest,guest@example.com');

    const result = await service.importRegistrations(event.id, organizer.uid, {
      buffer: csv,
      size: csv.length,
      mimetype: 'text/csv',
      originalname: 'registrations.csv',
    });

    expect(result.invitedCount).toBe(1);
    expect(guestInvitationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        guestUid: guest.uid,
        eventId: event.id,
        invitedBy: organizer.uid,
        status: 'pending',
      }),
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: guest.uid,
        type: NotificationTypeEnum.GUEST_EVENT_INVITE,
        eventId: event.id,
      }),
    );
  });

  it('skips remaining rows when the event becomes full', async () => {
    connectionsRepository.areConnected.mockResolvedValue(true);
    usersRepository.findByEmail.mockResolvedValue(participant);
    eventsRepository.registerAtomic.mockRejectedValue(new EventFullError());
    const csv = Buffer.from(
      [
        'displayName,email',
        'Participant,participant@example.com',
        'Participant,participant@example.com',
      ].join('\n'),
    );

    const result = await service.importRegistrations(event.id, organizer.uid, {
      buffer: csv,
      size: csv.length,
      mimetype: 'text/csv',
      originalname: 'registrations.csv',
    });

    expect(result.registeredCount).toBe(0);
    expect(result.skippedCount).toBe(2);
  });

  it('rejects invalid files and empty imports', async () => {
    await expect(
      service.importRegistrations(event.id, organizer.uid, {
        buffer: Buffer.from('x'),
        size: 1,
        mimetype: 'application/pdf',
        originalname: 'registrations.pdf',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.importRegistrations(event.id, organizer.uid, {
        buffer: Buffer.from('displayName,email\n'),
        size: 18,
        mimetype: 'text/csv',
        originalname: 'registrations.csv',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when event or caller cannot be found', async () => {
    eventsRepository.findById.mockResolvedValueOnce(null);

    await expect(
      service.exportRegistrations(event.id, organizer.uid, 'csv'),
    ).rejects.toThrow(NotFoundException);

    eventsRepository.findById.mockResolvedValue(event);
    usersRepository.findByUid.mockResolvedValueOnce(null);

    await expect(
      service.exportRegistrations(event.id, organizer.uid, 'csv'),
    ).rejects.toThrow(NotFoundException);
  });
});

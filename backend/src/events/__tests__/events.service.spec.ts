import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { EventsService } from '../events.service';
import {
  EventsRepository,
  EventFullError,
  EventNotFoundError,
} from '../events.repository';

describe('EventsService', () => {
  let service: EventsService;
  const mockListEvents = jest.fn();
  const mockCreateEvent = jest.fn();
  const mockUpdateEvent = jest.fn();
  const mockDeleteEvent = jest.fn();
  const mockFindById = jest.fn();
  const mockRegisterAtomic = jest.fn();
  const mockCancelRegistration = jest.fn();
  const mockListRegistrations = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: EventsRepository,
          useValue: {
            listEvents: mockListEvents,
            createEvent: mockCreateEvent,
            updateEvent: mockUpdateEvent,
            deleteEvent: mockDeleteEvent,
            findById: mockFindById,
            registerAtomic: mockRegisterAtomic,
            cancelRegistration: mockCancelRegistration,
            listRegistrations: mockListRegistrations,
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('passes registeredCount 0 and converts date strings to Date objects', async () => {
      mockCreateEvent.mockResolvedValue(undefined);
      const dto = {
        title: 'AI in Industry',
        speakerName: 'Dr. Jana Novak',
        description: 'Talk about AI applications',
        startAt: '2026-06-15T09:00:00.000Z',
        endAt: '2026-06-15T10:00:00.000Z',
        location: 'Dvorana A',
        capacity: 50,
      };

      await service.createEvent(dto, 'admin-uid');

      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'AI in Industry',
          registeredCount: 0,
          createdBy: 'admin-uid',
          startAt: new Date('2026-06-15T09:00:00.000Z'),
          endAt: new Date('2026-06-15T10:00:00.000Z'),
        }),
      );
    });
  });

  describe('updateEvent', () => {
    it('throws NotFoundException when event does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(
        service.updateEvent('nonexistent', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates only the provided fields', async () => {
      mockFindById.mockResolvedValue({ id: 'e1', title: 'Old Title' });
      mockUpdateEvent.mockResolvedValue(undefined);

      await service.updateEvent('e1', { title: 'New Title' });

      expect(mockUpdateEvent).toHaveBeenCalledWith('e1', {
        title: 'New Title',
      });
    });

    it('converts startAt and endAt strings to Date objects', async () => {
      mockFindById.mockResolvedValue({ id: 'e1', title: 'Old Title' });
      mockUpdateEvent.mockResolvedValue(undefined);

      await service.updateEvent('e1', {
        startAt: '2026-06-15T09:00:00.000Z',
        endAt: '2026-06-15T10:00:00.000Z',
      });

      expect(mockUpdateEvent).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({
          startAt: new Date('2026-06-15T09:00:00.000Z'),
          endAt: new Date('2026-06-15T10:00:00.000Z'),
        }),
      );
    });

    it('does not forward unset fields', async () => {
      mockFindById.mockResolvedValue({ id: 'e1' });
      mockUpdateEvent.mockResolvedValue(undefined);

      await service.updateEvent('e1', { title: 'New Title' });

      const firstCallArgs = mockUpdateEvent.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      const calledWith = firstCallArgs[1];
      expect(Object.keys(calledWith)).toEqual(['title']);
    });
  });

  describe('deleteEvent', () => {
    it('throws NotFoundException when event does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(service.deleteEvent('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes event when it exists', async () => {
      mockFindById.mockResolvedValue({ id: 'e1' });
      mockDeleteEvent.mockResolvedValue(undefined);

      await service.deleteEvent('e1');

      expect(mockDeleteEvent).toHaveBeenCalledWith('e1');
    });
  });

  describe('registerForEvent', () => {
    it('throws NotFoundException when event does not exist', async () => {
      mockRegisterAtomic.mockRejectedValue(new EventNotFoundError());
      await expect(
        service.registerForEvent('nonexistent', 'user1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('registers successfully when capacity is available', async () => {
      mockRegisterAtomic.mockResolvedValue(undefined);

      await service.registerForEvent('e1', 'user1');

      expect(mockRegisterAtomic).toHaveBeenCalledWith('e1', 'user1');
    });

    it('throws ConflictException when event is full', async () => {
      mockRegisterAtomic.mockRejectedValue(new EventFullError());

      await expect(service.registerForEvent('e1', 'user1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('cancelRegistration', () => {
    it('delegates cancellation to repository', async () => {
      mockCancelRegistration.mockResolvedValue(undefined);

      await service.cancelRegistration('e1', 'user1');

      expect(mockCancelRegistration).toHaveBeenCalledWith('e1', 'user1');
    });
  });

  describe('listRegistrations', () => {
    it('throws NotFoundException when event does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(service.listRegistrations('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns registrations when event exists', async () => {
      const regs = [{ uid: 'u1', registeredAt: new Date() }];
      mockFindById.mockResolvedValue({ id: 'e1' });
      mockListRegistrations.mockResolvedValue(regs);

      const result = await service.listRegistrations('e1');

      expect(result).toEqual(regs);
    });
  });

  describe('getEventById', () => {
    it('returns event when it exists', async () => {
      const event = { id: 'e1', title: 'Test Conference' };
      mockFindById.mockResolvedValue(event);

      const result = await service.getEventById('e1');

      expect(result).toEqual(event);
    });

    it('throws NotFoundException when event does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(service.getEventById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

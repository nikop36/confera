import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { EventsService } from '../events.service';
import {
  EventsRepository,
  EventFullError,
  EventNotFoundError,
} from '../events.repository';
import { ConnectionsRepository } from '../../connections/connections.repository';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersRepository } from '../../users/users.repository';
import { EmbeddingService } from '../../matching/embedding.service';
import { EventIndexService } from '../event-index.service';

describe('EventsService', () => {
  let service: EventsService;
  const mockListEvents = jest.fn();
  const mockCreateEvent = jest.fn();
  const mockUpdateEvent = jest.fn();
  const mockDeleteEvent = jest.fn();
  const mockFindById = jest.fn();
  const mockFindByIdWithMeta = jest.fn();
  const mockRegisterAtomic = jest.fn();
  const mockCancelRegistration = jest.fn();
  const mockListRegistrations = jest.fn();
  const mockListAcceptedConnectionUids = jest.fn().mockResolvedValue([]);
  const mockCreateNotification = jest.fn().mockResolvedValue(undefined);
  const mockFindByUid = jest.fn().mockResolvedValue(null);
  const mockCreateEmbedding = jest.fn();
  const mockSafeUpsertEvent = jest.fn().mockResolvedValue(undefined);
  const mockSafeRemoveEvent = jest.fn().mockResolvedValue(undefined);
  const mockSemanticSearchEvents = jest.fn().mockResolvedValue([]);
  const mockEventIndexService = {
    enabled: false,
    safeUpsertEvent: mockSafeUpsertEvent,
    safeRemoveEvent: mockSafeRemoveEvent,
    semanticSearchEvents: mockSemanticSearchEvents,
  };

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
            findByIdWithMeta: mockFindByIdWithMeta,
            registerAtomic: mockRegisterAtomic,
            cancelRegistration: mockCancelRegistration,
            listRegistrations: mockListRegistrations,
          },
        },
        {
          provide: ConnectionsRepository,
          useValue: {
            listAcceptedConnectionUids: mockListAcceptedConnectionUids,
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: mockCreateNotification,
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByUid: mockFindByUid,
          },
        },
        {
          provide: EmbeddingService,
          useValue: {
            createEmbedding: mockCreateEmbedding,
            model: 'test-model',
          },
        },
        {
          provide: EventIndexService,
          useValue: mockEventIndexService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    jest.clearAllMocks();
    mockListAcceptedConnectionUids.mockResolvedValue([]);
    mockEventIndexService.enabled = false;
  });

  describe('createEvent', () => {
    it('passes registeredCount 0 and converts date strings to Date objects', async () => {
      mockCreateEvent.mockResolvedValue(undefined);
      const dto = {
        title: 'AI in Industry',
        description: 'Talk about AI applications',
        startAt: '2026-06-15T09:00:00.000Z',
        endAt: '2026-06-15T10:00:00.000Z',
        location: 'Dvorana A',
        capacity: 50,
      };
      mockCreateEvent.mockResolvedValue({
        id: 'created-id',
        ...dto,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        createdBy: 'admin-uid',
        createdAt: new Date(),
        registeredCount: 0,
      });

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
      expect(mockSafeUpsertEvent).toHaveBeenCalled();
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
      expect(mockSafeRemoveEvent).toHaveBeenCalledWith('e1');
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
    it('returns event with isRegistered when it exists', async () => {
      const event = { id: 'e1', title: 'Test Conference', isRegistered: true };
      mockFindByIdWithMeta.mockResolvedValue(event);

      const result = await service.getEventById('e1', 'caller-uid');

      expect(result).toEqual(event);
      expect(mockFindByIdWithMeta).toHaveBeenCalledWith('e1', 'caller-uid', []);
    });

    it('throws NotFoundException when event does not exist', async () => {
      mockFindByIdWithMeta.mockResolvedValue(null);
      await expect(
        service.getEventById('nonexistent', 'caller-uid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listRecommendedEvents quality', () => {
    it('ranks high-overlap event above random event when no friends are going', async () => {
      mockFindByUid.mockResolvedValue({
        uid: 'u1',
        bio: 'AI engineer',
        affiliation: 'FERI',
        tags: ['artificial-intelligence', 'data-science', 'llm'],
      });

      const now = Date.now();
      mockListEvents.mockResolvedValue([
        {
          id: 'random',
          title: 'Random networking',
          description: 'General event',
          location: 'Hall A',
          tags: ['sports', 'travel'],
          startAt: new Date(now + 3_600_000),
          endAt: new Date(now + 7_200_000),
          capacity: 50,
          registeredCount: 0,
          isRegistered: false,
          friendsGoing: [],
        },
        {
          id: 'aligned',
          title: 'AI seminar',
          description: 'Talk on LLM and data science',
          location: 'Hall B',
          tags: ['artificial-intelligence', 'llm', 'data-science'],
          startAt: new Date(now + 3_600_000),
          endAt: new Date(now + 7_200_000),
          capacity: 50,
          registeredCount: 0,
          isRegistered: false,
          friendsGoing: [],
        },
      ]);

      // Force fallback path and deterministic semantic behavior.
      mockEventIndexService.enabled = false;
      mockCreateEmbedding.mockImplementation((text: string) => {
        if (text.includes('tags: artificial-intelligence')) return [1, 0];
        if (text.includes('tags: sports')) return [0, 1];
        return [1, 0]; // user vector
      });

      const result = await service.listRecommendedEvents('u1');
      expect(result[0].id).toBe('aligned');
      expect(result[1].id).toBe('random');
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    it('returns ranked events even when SQL semantic search returns empty rows', async () => {
      mockFindByUid.mockResolvedValue({
        uid: 'u2',
        bio: 'AI engineer',
        tags: ['artificial-intelligence', 'llm'],
      });
      const now = Date.now();
      mockListEvents.mockResolvedValue([
        {
          id: 'e1',
          title: 'AI event',
          description: 'LLM',
          location: 'A',
          tags: ['artificial-intelligence'],
          startAt: new Date(now + 3_600_000),
          endAt: new Date(now + 7_200_000),
          capacity: 10,
          registeredCount: 0,
          isRegistered: false,
          friendsGoing: [],
        },
      ]);

      mockEventIndexService.enabled = true;
      mockSemanticSearchEvents.mockResolvedValue([]);
      mockCreateEmbedding.mockImplementation((text: string) => {
        if (text.includes('tags: artificial-intelligence')) return [1, 0];
        return [1, 0];
      });

      const result = await service.listRecommendedEvents('u2');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e1');
    });
  });
});

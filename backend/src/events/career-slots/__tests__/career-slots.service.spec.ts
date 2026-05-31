import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CareerSlotsService } from '../career-slots.service';
import { CareerSlotsRepository } from '../career-slots.repository';
import { UsersRepository } from '../../../users/users.repository';
import { NotificationsService } from '../../../notifications/notifications.service';

const mockListSlots = jest.fn();
const mockFindSlotById = jest.fn();
const mockCreateSlot = jest.fn();
const mockUpdateSlot = jest.fn();
const mockDeleteSlot = jest.fn();
const mockListRequests = jest.fn();
const mockFindRequestByRequester = jest.fn();
const mockFindRequestById = jest.fn();
const mockCreateRequest = jest.fn();
const mockUpdateRequest = jest.fn();
const mockCountApproved = jest.fn();
const mockFindByUid = jest.fn();
const mockCreateNotification = jest.fn();

describe('CareerSlotsService', () => {
  let service: CareerSlotsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerSlotsService,
        {
          provide: CareerSlotsRepository,
          useValue: {
            listSlots: mockListSlots,
            findSlotById: mockFindSlotById,
            createSlot: mockCreateSlot,
            updateSlot: mockUpdateSlot,
            deleteSlot: mockDeleteSlot,
            listRequests: mockListRequests,
            findRequestByRequester: mockFindRequestByRequester,
            findRequestById: mockFindRequestById,
            createRequest: mockCreateRequest,
            updateRequest: mockUpdateRequest,
            countApproved: mockCountApproved,
          },
        },
        {
          provide: UsersRepository,
          useValue: { findByUid: mockFindByUid },
        },
        {
          provide: NotificationsService,
          useValue: { createNotification: mockCreateNotification },
        },
      ],
    }).compile();

    service = module.get<CareerSlotsService>(CareerSlotsService);
    jest.clearAllMocks();
  });

  describe('requestSlot', () => {
    it('throws NotFoundException when slot does not exist', async () => {
      mockFindSlotById.mockResolvedValue(null);
      await expect(
        service.requestSlot('event-1', 'slot-1', 'user-1', 0),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when user already has a request', async () => {
      mockFindSlotById.mockResolvedValue({
        id: 'slot-1',
        capacity: 3,
        createdByUid: 'industry-1',
        title: 'Test',
        description: '',
        scheduledAt: new Date(),
        createdAt: new Date(),
      });
      mockFindRequestByRequester.mockResolvedValue({
        id: 'req-1',
        requesterUid: 'user-1',
        status: 'pending',
        requestedAt: new Date(),
      });
      await expect(
        service.requestSlot('event-1', 'slot-1', 'user-1', 0),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when slot is at capacity', async () => {
      mockFindSlotById.mockResolvedValue({
        id: 'slot-1',
        capacity: 1,
        createdByUid: 'industry-1',
        title: 'Test',
        description: '',
        scheduledAt: new Date(),
        createdAt: new Date(),
      });
      mockFindRequestByRequester.mockResolvedValue(null);
      mockCountApproved.mockResolvedValue(1);
      await expect(
        service.requestSlot('event-1', 'slot-1', 'user-1', 0),
      ).rejects.toThrow(ConflictException);
    });

    it('creates request when slot is available', async () => {
      mockFindSlotById.mockResolvedValue({
        id: 'slot-1',
        capacity: 3,
        createdByUid: 'industry-1',
        title: 'Test',
        description: '',
        scheduledAt: new Date(),
        createdAt: new Date(),
      });
      mockFindRequestByRequester.mockResolvedValue(null);
      mockCountApproved.mockResolvedValue(0);
      mockCreateRequest.mockResolvedValue({ id: 'req-new' });
      await service.requestSlot('event-1', 'slot-1', 'user-1', 0);
      expect(mockCreateRequest).toHaveBeenCalledWith(
        'event-1',
        'slot-1',
        expect.objectContaining({ requesterUid: 'user-1', status: 'pending' }),
      );
    });
  });

  describe('respondToRequest', () => {
    const slot = {
      id: 'slot-1',
      capacity: 3,
      createdByUid: 'industry-1',
      title: 'Test',
      description: '',
      scheduledAt: new Date(),
      createdAt: new Date(),
    };
    const request = {
      id: 'req-1',
      requesterUid: 'user-2',
      status: 'pending' as const,
      requestedAt: new Date(),
    };

    it('throws NotFoundException when slot does not exist', async () => {
      mockFindSlotById.mockResolvedValue(null);
      await expect(
        service.respondToRequest(
          'event-1',
          'slot-1',
          'req-1',
          'industry-1',
          'approved',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when responder is not the slot creator', async () => {
      mockFindSlotById.mockResolvedValue(slot);
      mockFindRequestById.mockResolvedValue(request);
      mockFindByUid.mockResolvedValue({ uid: 'other-user', role: 'industry' });
      await expect(
        service.respondToRequest(
          'event-1',
          'slot-1',
          'req-1',
          'other-user',
          'approved',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates request status and fires notification on approve', async () => {
      mockFindSlotById.mockResolvedValue(slot);
      mockFindRequestById.mockResolvedValue(request);
      mockCountApproved.mockResolvedValue(0);
      mockUpdateRequest.mockResolvedValue(undefined);
      mockFindByUid.mockResolvedValue({
        email: 'user@test.com',
        displayName: 'Test User',
        uid: 'user-2',
        role: 'participant',
      });
      mockCreateNotification.mockResolvedValue(undefined);

      await service.respondToRequest(
        'event-1',
        'slot-1',
        'req-1',
        'industry-1',
        'approved',
      );

      expect(mockUpdateRequest).toHaveBeenCalledWith(
        'event-1',
        'slot-1',
        'req-1',
        expect.objectContaining({ status: 'approved' }),
      );
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'user-2' }),
      );
    });
  });
});

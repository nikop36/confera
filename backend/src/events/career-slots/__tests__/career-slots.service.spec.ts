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
import { UserRoleEnum } from '../../../common/enums/roles.enum';

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
const mockFindApprovedBySubSlotIndex = jest.fn();
const mockGetEventCreatedBy = jest.fn();
const mockGetEventTitle = jest.fn();
const mockWriteCareerBooking = jest.fn();
const mockFindBookingsByRequester = jest.fn();
const mockFindByUid = jest.fn();
const mockCreateNotification = jest.fn();

describe('CareerSlotsService', () => {
  let service: CareerSlotsService;
  const startAt = new Date('2026-05-28T08:00:00.000Z');
  const endAt = new Date('2026-05-28T08:30:00.000Z');
  const baseSlot = {
    id: 'slot-1',
    capacity: 3,
    createdByUid: 'industry-1',
    title: 'Portfolio reviews',
    description: 'Career advice',
    location: 'Room A',
    startAt,
    endAt,
    createdAt: new Date('2026-05-01T08:00:00.000Z'),
    approvalStatus: 'approved' as const,
  };

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
            findApprovedBySubSlotIndex: mockFindApprovedBySubSlotIndex,
            getEventCreatedBy: mockGetEventCreatedBy,
            getEventTitle: mockGetEventTitle,
            writeCareerBooking: mockWriteCareerBooking,
            findBookingsByRequester: mockFindBookingsByRequester,
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
    mockFindByUid.mockResolvedValue({
      uid: 'industry-1',
      email: 'industry@example.com',
      displayName: 'Industry Member',
      role: UserRoleEnum.INDUSTRY,
    });
    mockCountApproved.mockResolvedValue(0);
    mockFindRequestByRequester.mockResolvedValue(null);
    mockCreateNotification.mockResolvedValue(undefined);
  });

  describe('listSlots', () => {
    it('shows all slots to admins with metadata', async () => {
      mockListSlots.mockResolvedValue([
        baseSlot,
        {
          ...baseSlot,
          id: 'slot-2',
          createdByUid: 'other-industry',
          approvalStatus: 'pending_approval',
        },
      ]);
      mockFindByUid
        .mockResolvedValueOnce({ uid: 'admin-1', role: UserRoleEnum.ADMIN })
        .mockResolvedValueOnce({ uid: 'industry-1', displayName: 'Creator A' })
        .mockResolvedValueOnce({
          uid: 'other-industry',
          displayName: 'Creator B',
        });
      mockCountApproved.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
      mockFindRequestByRequester
        .mockResolvedValueOnce({ status: 'approved', subSlotIndex: 0 })
        .mockResolvedValueOnce(null);

      const result = await service.listSlots('event-1', 'admin-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          creatorDisplayName: 'Creator A',
          approvedCount: 2,
          myRequestStatus: 'approved',
          mySubSlotIndex: 0,
        }),
      );
      expect(result[1].creatorDisplayName).toBe('Creator B');
    });

    it('hides other pending slots from participants', async () => {
      mockListSlots.mockResolvedValue([
        { ...baseSlot, id: 'approved-slot' },
        {
          ...baseSlot,
          id: 'own-pending-slot',
          createdByUid: 'participant-1',
          approvalStatus: 'pending_approval',
        },
        {
          ...baseSlot,
          id: 'hidden-pending-slot',
          createdByUid: 'other-user',
          approvalStatus: 'pending_approval',
        },
      ]);
      mockFindByUid
        .mockResolvedValueOnce({
          uid: 'participant-1',
          role: UserRoleEnum.PARTICIPANT,
        })
        .mockResolvedValue({ displayName: undefined });

      const result = await service.listSlots('event-1', 'participant-1');

      expect(result.map((slot) => slot.id)).toEqual([
        'approved-slot',
        'own-pending-slot',
      ]);
    });
  });

  describe('createSlot', () => {
    const dto = {
      title: 'Career advice',
      description: 'Discuss CV and goals',
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      location: 'Room A',
      capacity: 2,
      requirements: ['Bring CV'],
    };

    it('creates approved slot for organizer without approval notification', async () => {
      mockFindByUid.mockResolvedValue({
        uid: 'organizer-1',
        role: UserRoleEnum.ORGANIZER,
      });
      mockCreateSlot.mockResolvedValue({ id: 'slot-1', ...dto });

      await service.createSlot('event-1', dto, 'organizer-1');

      expect(mockCreateSlot).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({ approvalStatus: 'approved' }),
      );
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it('creates pending slot for industry user and notifies organizer', async () => {
      mockFindByUid
        .mockResolvedValueOnce({
          uid: 'industry-1',
          displayName: 'Industry Member',
          role: UserRoleEnum.INDUSTRY,
        })
        .mockResolvedValueOnce({
          uid: 'organizer-1',
          email: 'organizer@example.com',
          displayName: 'Organizer',
        });
      mockCreateSlot.mockResolvedValue({ id: 'slot-1', title: dto.title });
      mockGetEventCreatedBy.mockResolvedValue('organizer-1');

      await service.createSlot('event-1', dto, 'industry-1');

      expect(mockCreateSlot).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({ approvalStatus: 'pending_approval' }),
      );
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'organizer-1',
        }),
      );
    });
  });

  describe('updateSlot', () => {
    it('throws NotFoundException when slot is missing', async () => {
      mockFindSlotById.mockResolvedValue(null);

      await expect(
        service.updateSlot('event-1', 'slot-1', {}, 'industry-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller is not creator or manager', async () => {
      mockFindSlotById.mockResolvedValue(baseSlot);
      mockFindByUid.mockResolvedValue({
        uid: 'other-user',
        role: UserRoleEnum.PARTICIPANT,
      });

      await expect(
        service.updateSlot(
          'event-1',
          'slot-1',
          { title: 'New title' },
          'other-user',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates normalized date fields when caller is creator', async () => {
      mockFindSlotById.mockResolvedValue(baseSlot);

      await service.updateSlot(
        'event-1',
        'slot-1',
        {
          title: 'Updated',
          description: 'Updated description',
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          location: 'Room B',
          capacity: 4,
          requirements: ['Portfolio'],
        },
        'industry-1',
      );

      expect(mockUpdateSlot).toHaveBeenCalledWith(
        'event-1',
        'slot-1',
        expect.objectContaining({
          title: 'Updated',
          startAt,
          endAt,
          capacity: 4,
        }),
      );
    });
  });

  describe('deleteSlot', () => {
    it('throws NotFoundException when slot is missing', async () => {
      mockFindSlotById.mockResolvedValue(null);

      await expect(
        service.deleteSlot('event-1', 'slot-1', 'industry-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller cannot delete', async () => {
      mockFindSlotById.mockResolvedValue(baseSlot);
      mockFindByUid.mockResolvedValue({
        uid: 'other-user',
        role: UserRoleEnum.PARTICIPANT,
      });

      await expect(
        service.deleteSlot('event-1', 'slot-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows organizer to delete any slot', async () => {
      mockFindSlotById.mockResolvedValue(baseSlot);
      mockFindByUid.mockResolvedValue({
        uid: 'organizer-1',
        role: UserRoleEnum.ORGANIZER,
      });

      await service.deleteSlot('event-1', 'slot-1', 'organizer-1');

      expect(mockDeleteSlot).toHaveBeenCalledWith('event-1', 'slot-1');
    });
  });

  describe('approval', () => {
    it('approves a slot and notifies creator', async () => {
      mockFindSlotById.mockResolvedValue(baseSlot);
      mockFindByUid.mockResolvedValue({
        uid: 'industry-1',
        email: 'industry@example.com',
        displayName: 'Industry Member',
      });

      await service.approveSlot('event-1', 'slot-1');

      expect(mockUpdateSlot).toHaveBeenCalledWith('event-1', 'slot-1', {
        approvalStatus: 'approved',
      });
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'industry-1' }),
      );
    });

    it('rejects a slot and notifies creator', async () => {
      mockFindSlotById.mockResolvedValue(baseSlot);

      await service.rejectSlot('event-1', 'slot-1');

      expect(mockUpdateSlot).toHaveBeenCalledWith('event-1', 'slot-1', {
        approvalStatus: 'rejected',
      });
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'industry-1',
        }),
      );
    });

    it('throws NotFoundException when approving missing slot', async () => {
      mockFindSlotById.mockResolvedValue(null);

      await expect(service.approveSlot('event-1', 'slot-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('requestSlot', () => {
    it('throws NotFoundException when slot does not exist', async () => {
      mockFindSlotById.mockResolvedValue(null);
      await expect(
        service.requestSlot('event-1', 'slot-1', 'user-1', 0),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when user already has a request', async () => {
      mockFindSlotById.mockResolvedValue(baseSlot);
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

    it('throws ConflictException when sub-slot index is out of range', async () => {
      mockFindSlotById.mockResolvedValue({ ...baseSlot, capacity: 1 });
      await expect(
        service.requestSlot('event-1', 'slot-1', 'user-1', 1),
      ).rejects.toThrow(ConflictException);
    });

    it('creates request when slot is available', async () => {
      mockFindSlotById.mockResolvedValue(baseSlot);
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
    const slot = baseSlot;
    const request = {
      id: 'req-1',
      requesterUid: 'user-2',
      subSlotIndex: 0,
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
      mockFindApprovedBySubSlotIndex.mockResolvedValue(null);
      mockUpdateRequest.mockResolvedValue(undefined);
      mockFindByUid
        .mockResolvedValueOnce({
          uid: 'industry-1',
          role: UserRoleEnum.INDUSTRY,
        })
        .mockResolvedValueOnce({
          email: 'user@test.com',
          displayName: 'Test User',
          uid: 'user-2',
          role: UserRoleEnum.PARTICIPANT,
        })
        .mockResolvedValueOnce({
          displayName: 'Industry Member',
          uid: 'industry-1',
        });
      mockGetEventTitle.mockResolvedValue('Conference Day');
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
      expect(mockWriteCareerBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'req-1',
          eventTitle: 'Conference Day',
          slotStartAt: startAt,
          slotEndAt: endAt,
          industryMemberName: 'Industry Member',
        }),
      );
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'user-2' }),
      );
    });

    it('throws NotFoundException when request is missing', async () => {
      mockFindSlotById.mockResolvedValue(slot);
      mockFindRequestById.mockResolvedValue(null);

      await expect(
        service.respondToRequest(
          'event-1',
          'slot-1',
          'missing',
          'industry-1',
          'approved',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when slot is fully booked', async () => {
      mockFindSlotById.mockResolvedValue({ ...slot, capacity: 1 });
      mockFindRequestById.mockResolvedValue(request);
      mockCountApproved.mockResolvedValue(1);

      await expect(
        service.respondToRequest(
          'event-1',
          'slot-1',
          'req-1',
          'industry-1',
          'approved',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when sub-slot is already taken', async () => {
      mockFindSlotById.mockResolvedValue(slot);
      mockFindRequestById.mockResolvedValue(request);
      mockCountApproved.mockResolvedValue(0);
      mockFindApprovedBySubSlotIndex.mockResolvedValue({
        id: 'approved-request',
      });

      await expect(
        service.respondToRequest(
          'event-1',
          'slot-1',
          'req-1',
          'industry-1',
          'approved',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('declines request without creating booking', async () => {
      mockFindSlotById.mockResolvedValue(slot);
      mockFindRequestById.mockResolvedValue(request);
      mockFindByUid
        .mockResolvedValueOnce({
          uid: 'industry-1',
          role: UserRoleEnum.INDUSTRY,
        })
        .mockResolvedValueOnce({ uid: 'user-2', displayName: 'Requester' });

      await service.respondToRequest(
        'event-1',
        'slot-1',
        'req-1',
        'industry-1',
        'declined',
      );

      expect(mockUpdateRequest).toHaveBeenCalledWith(
        'event-1',
        'slot-1',
        'req-1',
        expect.objectContaining({ status: 'declined' }),
      );
      expect(mockWriteCareerBooking).not.toHaveBeenCalled();
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'user-2',
        }),
      );
    });
  });

  describe('listRequests', () => {
    it('throws NotFoundException when slot is missing', async () => {
      mockFindSlotById.mockResolvedValue(null);

      await expect(
        service.listRequests('event-1', 'slot-1', 'industry-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when caller cannot view requests', async () => {
      mockFindSlotById.mockResolvedValue(baseSlot);
      mockFindByUid.mockResolvedValue({
        uid: 'other-user',
        role: UserRoleEnum.PARTICIPANT,
      });

      await expect(
        service.listRequests('event-1', 'slot-1', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns requests with requester display names', async () => {
      mockFindSlotById.mockResolvedValue(baseSlot);
      mockListRequests.mockResolvedValue([
        { id: 'req-1', requesterUid: 'user-1', status: 'pending' },
        { id: 'req-2', requesterUid: 'user-2', status: 'approved' },
      ]);
      mockFindByUid
        .mockResolvedValueOnce({
          uid: 'industry-1',
          role: UserRoleEnum.INDUSTRY,
        })
        .mockResolvedValueOnce({ uid: 'user-1', displayName: 'User One' })
        .mockResolvedValueOnce(null);

      const result = await service.listRequests(
        'event-1',
        'slot-1',
        'industry-1',
      );

      expect(result).toEqual([
        expect.objectContaining({ requesterDisplayName: 'User One' }),
        expect.objectContaining({ requesterDisplayName: 'user-2' }),
      ]);
    });
  });

  it('returns my bookings from repository', async () => {
    mockFindBookingsByRequester.mockResolvedValue([{ id: 'booking-1' }]);

    await expect(service.listMyBookings('user-1')).resolves.toEqual([
      { id: 'booking-1' },
    ]);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SchedulingService } from '../scheduling.service';
import { SchedulingRepository } from '../scheduling.repository';

describe('SchedulingService', () => {
  let service: SchedulingService;

  const mockCreateRoom = jest.fn();
  const mockListRooms = jest.fn();
  const mockListTimeSlotsInRange = jest.fn();
  const mockCreateTimeSlots = jest.fn();
  const mockFindRoomById = jest.fn();
  const mockFindTimeSlotById = jest.fn();
  const mockFindMeetingByRoomAndSlot = jest.fn();
  const mockFindMeetingsForParticipantAtSlot = jest.fn();
  const mockCreateMeeting = jest.fn();
  const mockListMeetings = jest.fn();
  const mockFindMeetingById = jest.fn();
  const mockDeleteMeeting = jest.fn();
  const mockFindMeetingsByRoomId = jest.fn();
  const mockFindMeetingsBySlotId = jest.fn();
  const mockDeleteRoom = jest.fn();
  const mockDeleteTimeSlot = jest.fn();
  const mockUpdateMeetingStatus = jest.fn();
  const mockUpdateRoom = jest.fn();
  const mockUpdateTimeSlot = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        {
          provide: SchedulingRepository,
          useValue: {
            createRoom: mockCreateRoom,
            listRooms: mockListRooms,
            listTimeSlotsInRange: mockListTimeSlotsInRange,
            createTimeSlots: mockCreateTimeSlots,
            findRoomById: mockFindRoomById,
            findTimeSlotById: mockFindTimeSlotById,
            findMeetingByRoomAndSlot: mockFindMeetingByRoomAndSlot,
            findMeetingsForParticipantAtSlot: mockFindMeetingsForParticipantAtSlot,
            createMeeting: mockCreateMeeting,
            listMeetings: mockListMeetings,
            findMeetingById: mockFindMeetingById,
            deleteMeeting: mockDeleteMeeting,
            findMeetingsByRoomId: mockFindMeetingsByRoomId,
            findMeetingsBySlotId: mockFindMeetingsBySlotId,
            deleteRoom: mockDeleteRoom,
            deleteTimeSlot: mockDeleteTimeSlot,
            updateMeetingStatus: mockUpdateMeetingStatus,
            updateRoom: mockUpdateRoom,
            updateTimeSlot: mockUpdateTimeSlot,
          },
        },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTimeSlots()', () => {
    it('generates slots for the requested window', async () => {
      mockListTimeSlotsInRange.mockResolvedValue([]);
      mockCreateTimeSlots.mockImplementation(async (rows) =>
        rows.map((row, index) => ({ id: `new-${index}`, ...row })),
      );

      const result = await service.generateTimeSlots({
        startDate: '2026-06-10T00:00:00.000Z',
        endDate: '2026-06-10T00:00:00.000Z',
        dayStartTime: '09:00',
        dayEndTime: '10:00',
        slotDurationMinutes: 30,
      });

      expect(result.generatedCount).toBe(2);
      expect(result.existingCount).toBe(0);
      expect(mockCreateTimeSlots).toHaveBeenCalledTimes(1);
    });

    it('throws when date range is invalid', async () => {
      await expect(
        service.generateTimeSlots({
          startDate: '2026-06-12T00:00:00.000Z',
          endDate: '2026-06-10T00:00:00.000Z',
          dayStartTime: '09:00',
          dayEndTime: '17:00',
          slotDurationMinutes: 30,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignMeeting()', () => {
    const dto = {
      slotId: 'slot-1',
      roomId: 'room-1',
      requestedByUids: ['uid-1', 'uid-2'],
      requestedToUids: ['uid-3', 'uid-4'],
    };

    it('creates meeting when no conflicts exist', async () => {
      mockFindRoomById.mockResolvedValue({
        id: 'room-1',
        name: 'Room A',
        capacity: 8,
        active: true,
        createdAt: new Date(),
      });
      mockFindTimeSlotById.mockResolvedValue({
        id: 'slot-1',
        startAt: new Date(),
        endAt: new Date(),
        createdAt: new Date(),
      });
      mockFindMeetingByRoomAndSlot.mockResolvedValue(null);
      mockFindMeetingsForParticipantAtSlot.mockResolvedValue([]);
      mockCreateMeeting.mockResolvedValue({
        id: 'meeting-1',
        slotId: 'slot-1',
        roomId: 'room-1',
        requestedByUids: ['uid-1', 'uid-2'],
        requestedToUids: ['uid-3', 'uid-4'],
        participantUids: ['uid-1', 'uid-2', 'uid-3', 'uid-4'],
        status: 'scheduled',
        createdAt: new Date(),
      });

      const result = await service.assignMeeting(dto);
      expect(result.id).toBe('meeting-1');
      expect(mockCreateMeeting).toHaveBeenCalled();
    });

    it('throws when room is already booked', async () => {
      mockFindRoomById.mockResolvedValue({
        id: 'room-1',
        name: 'Room A',
        capacity: 8,
        active: true,
        createdAt: new Date(),
      });
      mockFindTimeSlotById.mockResolvedValue({
        id: 'slot-1',
        startAt: new Date(),
        endAt: new Date(),
        createdAt: new Date(),
      });
      mockFindMeetingByRoomAndSlot.mockResolvedValue({
        id: 'meeting-existing',
        slotId: 'slot-1',
        roomId: 'room-1',
        participantUids: ['u1', 'u2'],
        status: 'scheduled',
        createdAt: new Date(),
      });

      await expect(service.assignMeeting(dto)).rejects.toThrow(ConflictException);
    });

    it('throws when participant is already booked', async () => {
      mockFindRoomById.mockResolvedValue({
        id: 'room-1',
        name: 'Room A',
        capacity: 8,
        active: true,
        createdAt: new Date(),
      });
      mockFindTimeSlotById.mockResolvedValue({
        id: 'slot-1',
        startAt: new Date(),
        endAt: new Date(),
        createdAt: new Date(),
      });
      mockFindMeetingByRoomAndSlot.mockResolvedValue(null);
      mockFindMeetingsForParticipantAtSlot
        .mockResolvedValueOnce([{ id: 'conflict' }])
        .mockResolvedValue([]);

      await expect(service.assignMeeting(dto)).rejects.toThrow(ConflictException);
    });

    it('throws when room does not exist', async () => {
      mockFindRoomById.mockResolvedValue(null);
      mockFindTimeSlotById.mockResolvedValue({
        id: 'slot-1',
        startAt: new Date(),
        endAt: new Date(),
        createdAt: new Date(),
      });

      await expect(service.assignMeeting(dto)).rejects.toThrow(NotFoundException);
    });

    it('throws when the same user appears on both sides', async () => {
      await expect(
        service.assignMeeting({
          slotId: 'slot-1',
          roomId: 'room-1',
          requestedByUids: ['uid-1'],
          requestedToUids: ['uid-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteMeeting()', () => {
    it('deletes an existing meeting', async () => {
      mockFindMeetingById.mockResolvedValue({
        id: 'meeting-1',
        slotId: 'slot-1',
        roomId: 'room-1',
        requestedByUids: ['uid-1'],
        requestedToUids: ['uid-2'],
        participantUids: ['uid-1', 'uid-2'],
        status: 'scheduled',
        createdAt: new Date(),
      });
      mockDeleteMeeting.mockResolvedValue(undefined);

      const result = await service.deleteMeeting('meeting-1');
      expect(result).toEqual({ message: 'Meeting deleted successfully' });
      expect(mockDeleteMeeting).toHaveBeenCalledWith('meeting-1');
    });

    it('throws when meeting does not exist', async () => {
      mockFindMeetingById.mockResolvedValue(null);
      await expect(service.deleteMeeting('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteRoom()', () => {
    it('deletes room when no meetings are linked', async () => {
      mockFindRoomById.mockResolvedValue({
        id: 'room-1',
        name: 'Room A',
        capacity: 8,
        active: true,
        createdAt: new Date(),
      });
      mockFindMeetingsByRoomId.mockResolvedValue([]);
      mockDeleteRoom.mockResolvedValue(undefined);

      await service.deleteRoom('room-1');
      expect(mockDeleteRoom).toHaveBeenCalledWith('room-1');
    });

    it('throws conflict when room has linked meetings', async () => {
      mockFindRoomById.mockResolvedValue({
        id: 'room-1',
        name: 'Room A',
        capacity: 8,
        active: true,
        createdAt: new Date(),
      });
      mockFindMeetingsByRoomId.mockResolvedValue([{ id: 'meeting-1' }]);

      await expect(service.deleteRoom('room-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteTimeSlot()', () => {
    it('deletes slot when no meetings are linked', async () => {
      mockFindTimeSlotById.mockResolvedValue({
        id: 'slot-1',
        startAt: new Date(),
        endAt: new Date(),
        createdAt: new Date(),
      });
      mockFindMeetingsBySlotId.mockResolvedValue([]);
      mockDeleteTimeSlot.mockResolvedValue(undefined);

      await service.deleteTimeSlot('slot-1');
      expect(mockDeleteTimeSlot).toHaveBeenCalledWith('slot-1');
    });

    it('throws conflict when slot has linked meetings', async () => {
      mockFindTimeSlotById.mockResolvedValue({
        id: 'slot-1',
        startAt: new Date(),
        endAt: new Date(),
        createdAt: new Date(),
      });
      mockFindMeetingsBySlotId.mockResolvedValue([{ id: 'meeting-1' }]);

      await expect(service.deleteTimeSlot('slot-1')).rejects.toThrow(ConflictException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SchedulingService } from '../scheduling.service';
import { SchedulingRepository } from '../scheduling.repository';
import { SchedulingConflictError } from '../scheduling.repository';

describe('SchedulingService', () => {
  let service: SchedulingService;

  const mockCreateRoom = jest.fn();
  const mockListRooms = jest.fn();
  const mockListAllRooms = jest.fn();
  const mockListTimeSlotsInRange = jest.fn();
  const mockCreateTimeSlots = jest.fn();
  const mockFindRoomById = jest.fn();
  const mockFindTimeSlotById = jest.fn();
  const mockFindMeetingByRoomAndSlot = jest.fn();
  const mockFindMeetingsForParticipantAtSlot = jest.fn();
  const mockCreateMeetingAtomically = jest.fn();
  const mockListMeetings = jest.fn();
  const mockListMeetingsByStatus = jest.fn();
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
            listAllRooms: mockListAllRooms,
            listTimeSlotsInRange: mockListTimeSlotsInRange,
            createTimeSlots: mockCreateTimeSlots,
            findRoomById: mockFindRoomById,
            findTimeSlotById: mockFindTimeSlotById,
            findMeetingByRoomAndSlot: mockFindMeetingByRoomAndSlot,
            findMeetingsForParticipantAtSlot:
              mockFindMeetingsForParticipantAtSlot,
            createMeetingAtomically: mockCreateMeetingAtomically,
            listMeetings: mockListMeetings,
            listMeetingsByStatus: mockListMeetingsByStatus,
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

  describe('rooms', () => {
    it('creates room with trimmed values and default active state', async () => {
      mockCreateRoom.mockResolvedValue({ id: 'room-1' });

      await service.createRoom({
        name: '  Room A  ',
        location: '  First floor  ',
        capacity: 12,
      });

      expect(mockCreateRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Room A',
          location: 'First floor',
          capacity: 12,
          active: true,
        }),
      );
    });

    it('returns active and all rooms from repository', async () => {
      mockListRooms.mockResolvedValue([{ id: 'active-room' }]);
      mockListAllRooms.mockResolvedValue([{ id: 'any-room' }]);

      await expect(service.listRooms()).resolves.toEqual([
        { id: 'active-room' },
      ]);
      await expect(service.listAllRooms()).resolves.toEqual([
        { id: 'any-room' },
      ]);
    });

    it('updates room when fields are provided', async () => {
      mockFindRoomById.mockResolvedValue({ id: 'room-1' });

      await expect(
        service.updateRoom('room-1', {
          name: '  Room B  ',
          location: '  Second floor  ',
          capacity: 20,
          active: false,
        }),
      ).resolves.toEqual({ message: 'Room updated successfully' });

      expect(mockUpdateRoom).toHaveBeenCalledWith('room-1', {
        name: 'Room B',
        location: 'Second floor',
        capacity: 20,
        active: false,
      });
    });

    it('rejects room update without fields', async () => {
      mockFindRoomById.mockResolvedValue({ id: 'room-1' });

      await expect(service.updateRoom('room-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when updating or deleting missing room', async () => {
      mockFindRoomById.mockResolvedValue(null);

      await expect(
        service.updateRoom('missing', { name: 'Room B' }),
      ).rejects.toThrow(NotFoundException);
      await expect(service.deleteRoom('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateTimeSlots()', () => {
    it('generates slots for the requested window', async () => {
      mockListTimeSlotsInRange.mockResolvedValue([]);
      mockCreateTimeSlots.mockImplementation(
        (rows: Array<{ startAt: Date; endAt: Date; createdAt: Date }>) =>
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

    it('throws when dates or daily time window are invalid', async () => {
      await expect(
        service.generateTimeSlots({
          startDate: 'invalid',
          endDate: '2026-06-10T00:00:00.000Z',
          dayStartTime: '09:00',
          dayEndTime: '17:00',
          slotDurationMinutes: 30,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.generateTimeSlots({
          startDate: '2026-06-10T00:00:00.000Z',
          endDate: '2026-06-10T00:00:00.000Z',
          dayStartTime: '17:00',
          dayEndTime: '09:00',
          slotDurationMinutes: 30,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.generateTimeSlots({
          startDate: '2026-06-10T00:00:00.000Z',
          endDate: '2026-06-10T00:00:00.000Z',
          dayStartTime: '09:00',
          dayEndTime: '10:00',
          slotDurationMinutes: 90,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('skips slots that already exist', async () => {
      const existingStart = new Date(2026, 5, 10, 9, 0, 0, 0);
      const existingEnd = new Date(2026, 5, 10, 9, 30, 0, 0);
      mockListTimeSlotsInRange.mockResolvedValue([
        { id: 'existing', startAt: existingStart, endAt: existingEnd },
      ]);
      mockCreateTimeSlots.mockImplementation(
        (rows: Array<{ startAt: Date; endAt: Date; createdAt: Date }>) =>
          rows.map((row, index) => ({ id: `new-${index}`, ...row })),
      );

      const result = await service.generateTimeSlots({
        startDate: '2026-06-10T00:00:00.000Z',
        endDate: '2026-06-10T00:00:00.000Z',
        dayStartTime: '09:00',
        dayEndTime: '10:00',
        slotDurationMinutes: 30,
      });

      expect(result.generatedCount).toBe(1);
      expect(result.existingCount).toBe(1);
    });
  });

  describe('time slots', () => {
    it('lists time slots with default and explicit range', async () => {
      mockListTimeSlotsInRange.mockResolvedValue([{ id: 'slot-1' }]);

      await expect(service.listTimeSlots()).resolves.toEqual([
        { id: 'slot-1' },
      ]);
      await service.listTimeSlots(
        '2026-06-10T00:00:00.000Z',
        '2026-06-11T00:00:00.000Z',
      );

      expect(mockListTimeSlotsInRange).toHaveBeenCalledTimes(2);
    });

    it('throws when listing time slots with invalid dates', async () => {
      await expect(service.listTimeSlots('bad-date')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('updates a time slot when no meetings are linked', async () => {
      mockFindTimeSlotById.mockResolvedValue({ id: 'slot-1' });
      mockFindMeetingsBySlotId.mockResolvedValue([]);

      await expect(
        service.updateTimeSlot('slot-1', {
          startAt: '2026-06-10T09:00:00.000Z',
          endAt: '2026-06-10T09:30:00.000Z',
        }),
      ).resolves.toEqual({ message: 'Time slot updated successfully' });

      expect(mockUpdateTimeSlot).toHaveBeenCalledWith(
        'slot-1',
        expect.objectContaining({
          startAt: new Date('2026-06-10T09:00:00.000Z'),
          endAt: new Date('2026-06-10T09:30:00.000Z'),
        }),
      );
    });

    it('rejects invalid or linked time-slot updates', async () => {
      mockFindTimeSlotById.mockResolvedValue({ id: 'slot-1' });

      await expect(
        service.updateTimeSlot('slot-1', {
          startAt: 'invalid',
          endAt: '2026-06-10T09:30:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateTimeSlot('slot-1', {
          startAt: '2026-06-10T09:30:00.000Z',
          endAt: '2026-06-10T09:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);

      mockFindMeetingsBySlotId.mockResolvedValue([{ id: 'meeting-1' }]);

      await expect(
        service.updateTimeSlot('slot-1', {
          startAt: '2026-06-10T09:00:00.000Z',
          endAt: '2026-06-10T09:30:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws when updating or deleting missing time slot', async () => {
      mockFindTimeSlotById.mockResolvedValue(null);

      await expect(
        service.updateTimeSlot('missing', {
          startAt: '2026-06-10T09:00:00.000Z',
          endAt: '2026-06-10T09:30:00.000Z',
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(service.deleteTimeSlot('missing')).rejects.toThrow(
        NotFoundException,
      );
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
      mockCreateMeetingAtomically.mockResolvedValue({
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
      expect(mockCreateMeetingAtomically).toHaveBeenCalled();
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
      mockCreateMeetingAtomically.mockRejectedValue(
        new SchedulingConflictError(
          'Room is already booked for the selected time slot',
        ),
      );

      await expect(service.assignMeeting(dto)).rejects.toThrow(
        ConflictException,
      );
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
      mockCreateMeetingAtomically.mockRejectedValue(
        new SchedulingConflictError(
          'One or more participants are already booked in this time slot',
        ),
      );

      await expect(service.assignMeeting(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws when room does not exist', async () => {
      mockFindRoomById.mockResolvedValue(null);
      mockFindTimeSlotById.mockResolvedValue({
        id: 'slot-1',
        startAt: new Date(),
        endAt: new Date(),
        createdAt: new Date(),
      });

      await expect(service.assignMeeting(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when time slot does not exist', async () => {
      mockFindRoomById.mockResolvedValue({
        id: 'room-1',
        active: true,
      });
      mockFindTimeSlotById.mockResolvedValue(null);

      await expect(service.assignMeeting(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when participant groups are empty after trimming', async () => {
      await expect(
        service.assignMeeting({
          slotId: 'slot-1',
          roomId: 'room-1',
          requestedByUids: ['  '],
          requestedToUids: ['uid-2'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deduplicates and trims participants before creating a meeting', async () => {
      mockFindRoomById.mockResolvedValue({
        id: 'room-1',
        active: true,
      });
      mockFindTimeSlotById.mockResolvedValue({ id: 'slot-1' });
      mockCreateMeetingAtomically.mockResolvedValue({ id: 'meeting-1' });

      await service.assignMeeting({
        slotId: 'slot-1',
        roomId: 'room-1',
        requestedByUids: [' uid-1 ', 'uid-1'],
        requestedToUids: [' uid-2 ', 'uid-2'],
      });

      expect(mockCreateMeetingAtomically).toHaveBeenCalledWith(
        expect.objectContaining({
          requestedByUids: ['uid-1'],
          requestedToUids: ['uid-2'],
          participantUids: ['uid-1', 'uid-2'],
        }),
      );
    });

    it('rethrows unexpected meeting creation errors', async () => {
      const error = new Error('database down');
      mockFindRoomById.mockResolvedValue({ id: 'room-1', active: true });
      mockFindTimeSlotById.mockResolvedValue({ id: 'slot-1' });
      mockCreateMeetingAtomically.mockRejectedValue(error);

      await expect(service.assignMeeting(dto)).rejects.toThrow(error);
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
      await expect(service.deleteMeeting('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMeetingStatus()', () => {
    it('throws when meeting does not exist', async () => {
      mockFindMeetingById.mockResolvedValue(null);

      await expect(
        service.updateMeetingStatus('missing', { status: 'cancelled' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates status without conflict checks when not rescheduling', async () => {
      mockFindMeetingById.mockResolvedValue({
        id: 'meeting-1',
        slotId: 'slot-1',
        roomId: 'room-1',
        participantUids: ['uid-1'],
        status: 'scheduled',
      });

      await expect(
        service.updateMeetingStatus('meeting-1', { status: 'completed' }),
      ).resolves.toEqual({ message: 'Meeting status updated successfully' });

      expect(mockFindMeetingByRoomAndSlot).not.toHaveBeenCalled();
      expect(mockUpdateMeetingStatus).toHaveBeenCalledWith(
        'meeting-1',
        'completed',
      );
    });

    it('reschedules when there are no room or participant conflicts', async () => {
      mockFindMeetingById.mockResolvedValue({
        id: 'meeting-1',
        slotId: 'slot-1',
        roomId: 'room-1',
        participantUids: ['uid-1', 'uid-2'],
        status: 'cancelled',
      });
      mockFindMeetingByRoomAndSlot.mockResolvedValue(null);
      mockFindMeetingsForParticipantAtSlot.mockResolvedValue([]);

      await service.updateMeetingStatus('meeting-1', { status: 'scheduled' });

      expect(mockUpdateMeetingStatus).toHaveBeenCalledWith(
        'meeting-1',
        'scheduled',
      );
    });

    it('throws conflict when reverting to scheduled and room is already booked', async () => {
      mockFindMeetingById.mockResolvedValue({
        id: 'meeting-1',
        slotId: 'slot-1',
        roomId: 'room-1',
        requestedByUids: ['uid-1'],
        requestedToUids: ['uid-2'],
        participantUids: ['uid-1', 'uid-2'],
        status: 'cancelled',
        createdAt: new Date(),
      });
      mockFindMeetingByRoomAndSlot.mockResolvedValue({
        id: 'meeting-2',
        slotId: 'slot-1',
        roomId: 'room-1',
        requestedByUids: ['uid-9'],
        requestedToUids: ['uid-8'],
        participantUids: ['uid-9', 'uid-8'],
        status: 'scheduled',
        createdAt: new Date(),
      });

      await expect(
        service.updateMeetingStatus('meeting-1', { status: 'scheduled' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws conflict when reverting to scheduled and participant has conflict', async () => {
      mockFindMeetingById.mockResolvedValue({
        id: 'meeting-1',
        slotId: 'slot-1',
        roomId: 'room-1',
        requestedByUids: ['uid-1'],
        requestedToUids: ['uid-2'],
        participantUids: ['uid-1', 'uid-2'],
        status: 'completed',
        createdAt: new Date(),
      });
      mockFindMeetingByRoomAndSlot.mockResolvedValue(null);
      mockFindMeetingsForParticipantAtSlot
        .mockResolvedValueOnce([{ id: 'meeting-x' }])
        .mockResolvedValue([]);

      await expect(
        service.updateMeetingStatus('meeting-1', { status: 'scheduled' }),
      ).rejects.toThrow(ConflictException);
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

      await expect(service.deleteRoom('room-1')).rejects.toThrow(
        ConflictException,
      );
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

      await expect(service.deleteTimeSlot('slot-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('listMeetings()', () => {
    it('filters meetings by status, room, and slot date range', async () => {
      mockListMeetingsByStatus.mockResolvedValue([
        { id: 'meeting-1', roomId: 'room-1', slotId: 'slot-1' },
        { id: 'meeting-2', roomId: 'room-2', slotId: 'slot-2' },
      ]);
      mockListTimeSlotsInRange.mockResolvedValue([{ id: 'slot-1' }]);

      await expect(
        service.listMeetings(
          'scheduled',
          'room-1',
          '2026-06-10T00:00:00.000Z',
          '2026-06-11T00:00:00.000Z',
        ),
      ).resolves.toEqual([
        { id: 'meeting-1', roomId: 'room-1', slotId: 'slot-1' },
      ]);
    });

    it('lists all meetings when no status is provided', async () => {
      mockListMeetings.mockResolvedValue([{ id: 'meeting-1' }]);

      await expect(service.listMeetings()).resolves.toEqual([
        { id: 'meeting-1' },
      ]);
    });

    it('throws when meeting filter dates are invalid', async () => {
      mockListMeetings.mockResolvedValue([]);

      await expect(
        service.listMeetings(undefined, undefined, 'invalid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTimeSlotAvailability()', () => {
    it('returns booked status and scheduled meeting counts', async () => {
      mockListTimeSlotsInRange.mockResolvedValue([
        { id: 'slot-1' },
        { id: 'slot-2' },
      ]);
      mockListMeetingsByStatus.mockResolvedValue([
        { id: 'meeting-1', slotId: 'slot-1', roomId: 'room-1' },
        { id: 'meeting-2', slotId: 'slot-1', roomId: 'room-2' },
      ]);

      await expect(service.getTimeSlotAvailability()).resolves.toEqual([
        expect.objectContaining({
          id: 'slot-1',
          scheduledMeetingCount: 2,
          isBooked: true,
        }),
        expect.objectContaining({
          id: 'slot-2',
          scheduledMeetingCount: 0,
          isBooked: false,
        }),
      ]);
    });

    it('filters availability by room id', async () => {
      mockListTimeSlotsInRange.mockResolvedValue([{ id: 'slot-1' }]);
      mockListMeetingsByStatus.mockResolvedValue([
        { id: 'meeting-1', slotId: 'slot-1', roomId: 'room-1' },
        { id: 'meeting-2', slotId: 'slot-1', roomId: 'room-2' },
      ]);

      const result = await service.getTimeSlotAvailability(
        undefined,
        undefined,
        'room-2',
      );

      expect(result[0]).toEqual(
        expect.objectContaining({ scheduledMeetingCount: 1 }),
      );
    });

    it('throws for invalid availability date filters', async () => {
      await expect(service.getTimeSlotAvailability('invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CareerInterviewsService } from '../career-interviews.service';
import { CareerInterviewsRepository } from '../career-interviews.repository';
import { UsersRepository } from '../../users/users.repository';
import { SchedulingRepository } from '../../scheduling/scheduling.repository';
import { NotificationsService } from '../../notifications/notifications.service';
import { ConnectionsRepository } from '../../connections/connections.repository';

describe('CareerInterviewsService', () => {
  let service: CareerInterviewsService;
  const actingUser = { uid: 'admin-1', email: 'admin@example.com' };

  const mockCreate = jest.fn();
  const mockFindById = jest.fn();
  const mockUpdate = jest.fn();
  const mockUpdateStatus = jest.fn();
  const mockDelete = jest.fn();
  const mockList = jest.fn();
  const mockFindScheduledByRoomAndSlot = jest.fn();
  const mockFindScheduledForInterviewerAtSlot = jest.fn();
  const mockFindScheduledForCandidateAtSlot = jest.fn();

  const mockFindByUid = jest.fn();

  const mockFindRoomById = jest.fn();
  const mockFindTimeSlotById = jest.fn();
  const mockFindMeetingByRoomAndSlot = jest.fn();
  const mockFindMeetingsForParticipantAtSlot = jest.fn();
  const mockCreateNotification = jest.fn();
  const mockFindAcceptedBetweenUsers = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerInterviewsService,
        {
          provide: CareerInterviewsRepository,
          useValue: {
            create: mockCreate,
            findById: mockFindById,
            update: mockUpdate,
            updateStatus: mockUpdateStatus,
            delete: mockDelete,
            list: mockList,
            findScheduledByRoomAndSlot: mockFindScheduledByRoomAndSlot,
            findScheduledForInterviewerAtSlot:
              mockFindScheduledForInterviewerAtSlot,
            findScheduledForCandidateAtSlot:
              mockFindScheduledForCandidateAtSlot,
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByUid: mockFindByUid,
          },
        },
        {
          provide: SchedulingRepository,
          useValue: {
            findRoomById: mockFindRoomById,
            findTimeSlotById: mockFindTimeSlotById,
            findMeetingByRoomAndSlot: mockFindMeetingByRoomAndSlot,
            findMeetingsForParticipantAtSlot:
              mockFindMeetingsForParticipantAtSlot,
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: mockCreateNotification,
          },
        },
        {
          provide: ConnectionsRepository,
          useValue: {
            findAcceptedBetweenUsers: mockFindAcceptedBetweenUsers,
          },
        },
      ],
    }).compile();

    service = module.get<CareerInterviewsService>(CareerInterviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('creates draft interview', async () => {
      mockFindByUid.mockResolvedValue({
        uid: 'candidate-1',
        displayName: 'Candidate',
      });
      mockCreate.mockResolvedValue({
        id: 'interview-1',
        candidateUid: 'candidate-1',
        status: 'draft',
      });

      const result = await service.create(actingUser, {
        candidateUid: 'candidate-1',
        notes: 'wants backend internship',
      });

      expect(result.id).toBe('interview-1');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('throws when candidate does not exist', async () => {
      mockFindByUid.mockResolvedValue(null);
      await expect(
        service.create(actingUser, { candidateUid: 'missing-user' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assign()', () => {
    beforeEach(() => {
      mockFindById.mockResolvedValue({
        id: 'interview-1',
        candidateUid: 'candidate-1',
        status: 'draft',
      });
      mockFindByUid.mockResolvedValue({
        uid: 'interviewer-1',
        role: 'organizer',
      });
      mockFindRoomById.mockResolvedValue({
        id: 'room-1',
        name: 'Room 1',
        active: true,
      });
      mockFindTimeSlotById.mockResolvedValue({
        id: 'slot-1',
        startAt: new Date('2026-06-01T10:00:00.000Z'),
        endAt: new Date('2026-06-01T10:30:00.000Z'),
      });
      mockFindMeetingByRoomAndSlot.mockResolvedValue(null);
      mockFindScheduledByRoomAndSlot.mockResolvedValue(null);
      mockFindMeetingsForParticipantAtSlot.mockResolvedValue([]);
      mockFindScheduledForInterviewerAtSlot.mockResolvedValue([]);
      mockFindScheduledForCandidateAtSlot.mockResolvedValue([]);
      mockFindAcceptedBetweenUsers.mockResolvedValue({ id: 'conn-1' });
    });

    it('assigns interviewer/room/slot and schedules interview', async () => {
      await service.assign(actingUser, 'interview-1', {
        interviewerUid: 'interviewer-1',
        slotId: 'slot-1',
        roomId: 'room-1',
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        'interview-1',
        expect.objectContaining({
          interviewerUid: 'interviewer-1',
          slotId: 'slot-1',
          roomId: 'room-1',
        }),
      );
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'interview-1',
        'scheduled',
        expect.objectContaining({
          status: 'scheduled',
          changedByUid: actingUser.uid,
        }),
        actingUser.uid,
      );
      expect(mockCreateNotification).toHaveBeenCalledTimes(3);
    });

    it('throws when interviewer has conflict at slot', async () => {
      mockFindMeetingsForParticipantAtSlot
        .mockResolvedValueOnce([{ id: 'meeting-conflict' }])
        .mockResolvedValueOnce([]);

      await expect(
        service.assign(actingUser, 'interview-1', {
          interviewerUid: 'interviewer-1',
          slotId: 'slot-1',
          roomId: 'room-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws when interviewer role is not allowed', async () => {
      mockFindByUid.mockResolvedValue({
        uid: 'interviewer-1',
        role: 'participant',
      });

      await expect(
        service.assign(actingUser, 'interview-1', {
          interviewerUid: 'interviewer-1',
          slotId: 'slot-1',
          roomId: 'room-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when candidate and interviewer are not connected', async () => {
      mockFindAcceptedBetweenUsers.mockResolvedValue(null);

      await expect(
        service.assign(actingUser, 'interview-1', {
          interviewerUid: 'interviewer-1',
          slotId: 'slot-1',
          roomId: 'room-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus()', () => {
    it('throws when setting scheduled before assignment', async () => {
      mockFindById.mockResolvedValue({
        id: 'interview-1',
        candidateUid: 'candidate-1',
        status: 'draft',
      });

      await expect(
        service.updateStatus(actingUser, 'interview-1', {
          status: 'scheduled',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates status for assigned interview', async () => {
      mockFindById.mockResolvedValue({
        id: 'interview-1',
        candidateUid: 'candidate-1',
        interviewerUid: 'interviewer-1',
        roomId: 'room-1',
        slotId: 'slot-1',
        status: 'cancelled',
      });
      mockFindMeetingByRoomAndSlot.mockResolvedValue(null);
      mockFindScheduledByRoomAndSlot.mockResolvedValue(null);
      mockFindMeetingsForParticipantAtSlot.mockResolvedValue([]);
      mockFindScheduledForInterviewerAtSlot.mockResolvedValue([]);
      mockFindScheduledForCandidateAtSlot.mockResolvedValue([]);

      await service.updateStatus(actingUser, 'interview-1', {
        status: 'scheduled',
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'interview-1',
        'scheduled',
        expect.objectContaining({
          status: 'scheduled',
          changedByUid: actingUser.uid,
        }),
        actingUser.uid,
      );
    });

    it('sends cancellation notifications', async () => {
      mockFindById.mockResolvedValue({
        id: 'interview-1',
        candidateUid: 'candidate-1',
        interviewerUid: 'interviewer-1',
        roomId: 'room-1',
        slotId: 'slot-1',
        status: 'scheduled',
      });

      await service.updateStatus(actingUser, 'interview-1', {
        status: 'cancelled',
      });

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('update() and delete()', () => {
    it('updates notes and candidate', async () => {
      mockFindById.mockResolvedValue({
        id: 'interview-1',
        candidateUid: 'candidate-1',
        status: 'draft',
      });
      mockFindByUid.mockResolvedValue({
        uid: 'candidate-2',
        displayName: 'Candidate 2',
      });

      await service.update(actingUser, 'interview-1', {
        candidateUid: 'candidate-2',
        notes: 'updated',
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        'interview-1',
        expect.objectContaining({
          candidateUid: 'candidate-2',
          notes: 'updated',
          updatedByUid: actingUser.uid,
        }),
      );
    });

    it('deletes interview', async () => {
      mockFindById.mockResolvedValue({
        id: 'interview-1',
        candidateUid: 'candidate-1',
        status: 'draft',
      });
      mockDelete.mockResolvedValue(undefined);

      const result = await service.delete('interview-1');
      expect(result).toEqual({
        message: 'Career interview deleted successfully',
      });
      expect(mockDelete).toHaveBeenCalledWith('interview-1');
    });
  });
});

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvitesService } from '../invites.service';
import { NotificationTypeEnum } from '../../common/enums/notification-type.enum';

const candidateInterview = {
  id: 'interview-1',
  candidateUid: 'candidate-uid',
  interviewerUid: 'interviewer-uid',
  createdByUid: 'creator-uid',
  roomId: 'room-1',
  slotId: 'slot-1',
  status: 'scheduled',
  invitationStatus: 'pending',
  notes: 'Bring CV',
  createdAt: new Date('2026-06-01T09:00:00.000Z'),
};

const interviewerInterview = {
  ...candidateInterview,
  id: 'interview-2',
  invitationStatus: 'accepted',
};

const users = {
  'candidate-uid': {
    uid: 'candidate-uid',
    displayName: 'Candidate',
    email: 'candidate@example.com',
  },
  'interviewer-uid': {
    uid: 'interviewer-uid',
    displayName: 'Interviewer',
    email: 'interviewer@example.com',
  },
  'creator-uid': {
    uid: 'creator-uid',
    displayName: 'Creator',
    email: 'creator@example.com',
  },
};

describe('InvitesService', () => {
  const careerInterviewsRepository = {
    listByCandidateUid: jest.fn(),
    listByInterviewerUid: jest.fn(),
    findById: jest.fn(),
    updateInvitationStatus: jest.fn(),
    updateStatus: jest.fn(),
  };
  const usersRepository = {
    findByUid: jest.fn(),
  };
  const schedulingRepository = {
    findTimeSlotById: jest.fn(),
    findRoomById: jest.fn(),
  };
  const notificationsService = {
    createNotification: jest.fn(),
  };

  let service: InvitesService;

  beforeEach(() => {
    jest.clearAllMocks();

    careerInterviewsRepository.listByCandidateUid.mockResolvedValue([
      candidateInterview,
    ]);
    careerInterviewsRepository.listByInterviewerUid.mockResolvedValue([
      interviewerInterview,
    ]);
    careerInterviewsRepository.findById.mockResolvedValue(candidateInterview);
    careerInterviewsRepository.updateInvitationStatus.mockResolvedValue(
      undefined,
    );
    careerInterviewsRepository.updateStatus.mockResolvedValue(undefined);
    usersRepository.findByUid.mockImplementation((uid: keyof typeof users) =>
      Promise.resolve(users[uid] ?? null),
    );
    schedulingRepository.findTimeSlotById.mockResolvedValue({
      id: 'slot-1',
      startAt: new Date('2026-06-10T09:00:00.000Z'),
      endAt: new Date('2026-06-10T09:30:00.000Z'),
    });
    schedulingRepository.findRoomById.mockResolvedValue({
      id: 'room-1',
      name: 'Room 1',
    });
    notificationsService.createNotification.mockResolvedValue(undefined);

    service = new InvitesService(
      careerInterviewsRepository as never,
      usersRepository as never,
      schedulingRepository as never,
      notificationsService as never,
    );
  });

  it('returns candidate and interviewer invites with related users, slots, and rooms', async () => {
    const result = await service.getMyInvites({
      uid: 'candidate-uid',
      email: 'candidate@example.com',
    });

    expect(result.pendingCount).toBe(1);
    expect(result.pending[0]).toMatchObject({
      id: 'interview-1',
      invitationStatus: 'pending',
      candidate: {
        uid: 'candidate-uid',
        displayName: 'Candidate',
      },
      interviewer: {
        uid: 'interviewer-uid',
        displayName: 'Interviewer',
      },
      room: { id: 'room-1', name: 'Room 1' },
      slot: { id: 'slot-1' },
    });
    expect(result.interviewerPendingCount).toBe(0);
    expect(result.interviewerProcessed[0]).toMatchObject({
      id: 'interview-2',
      invitationStatus: 'accepted',
    });
  });

  it('falls back gracefully when related users, room, or slot are missing', async () => {
    usersRepository.findByUid.mockResolvedValue(null);
    schedulingRepository.findTimeSlotById.mockResolvedValue(null);
    schedulingRepository.findRoomById.mockResolvedValue(null);

    const result = await service.getMyInvites({
      uid: 'candidate-uid',
      email: 'candidate@example.com',
    });

    expect(result.pending[0]).toMatchObject({
      candidate: {
        uid: 'candidate-uid',
        displayName: 'Unknown user',
        email: '',
      },
      interviewer: {
        uid: 'interviewer-uid',
        displayName: 'Unknown user',
        email: '',
      },
      room: null,
      slot: null,
    });
  });

  it('accepts a pending invite and notifies the interviewer', async () => {
    const result = await service.respondToInvite(
      { uid: 'candidate-uid', email: 'candidate@example.com' },
      'interview-1',
      'accepted',
    );

    expect(result).toEqual({ message: 'Invite accepted' });
    expect(
      careerInterviewsRepository.updateInvitationStatus,
    ).toHaveBeenCalledWith('interview-1', 'accepted');
    expect(careerInterviewsRepository.updateStatus).not.toHaveBeenCalled();
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'interviewer-uid',
        email: 'interviewer@example.com',
        type: NotificationTypeEnum.MEETING_ACCEPTED,
      }),
    );
  });

  it('rejects a pending invite, cancels the interview, and notifies the interviewer', async () => {
    const result = await service.respondToInvite(
      { uid: 'candidate-uid', email: 'candidate@example.com' },
      'interview-1',
      'rejected',
    );

    expect(result).toEqual({ message: 'Invite rejected' });
    expect(
      careerInterviewsRepository.updateInvitationStatus,
    ).toHaveBeenCalledWith('interview-1', 'rejected');
    expect(careerInterviewsRepository.updateStatus).toHaveBeenCalledWith(
      'interview-1',
      'cancelled',
      expect.objectContaining({
        status: 'cancelled',
        changedByUid: 'candidate-uid',
      }),
      'candidate-uid',
    );
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'interviewer-uid',
        type: NotificationTypeEnum.MEETING_REJECTED,
      }),
    );
  });

  it('uses creator as notification recipient when there is no interviewer', async () => {
    careerInterviewsRepository.findById.mockResolvedValue({
      ...candidateInterview,
      interviewerUid: undefined,
    });

    await service.respondToInvite(
      { uid: 'candidate-uid', email: 'candidate@example.com' },
      'interview-1',
      'accepted',
    );

    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'creator-uid',
        email: 'creator@example.com',
      }),
    );
  });

  it('rejects invalid invite responses', async () => {
    careerInterviewsRepository.findById.mockResolvedValueOnce(null);

    await expect(
      service.respondToInvite(
        { uid: 'candidate-uid', email: 'candidate@example.com' },
        'missing',
        'accepted',
      ),
    ).rejects.toThrow(NotFoundException);

    careerInterviewsRepository.findById.mockResolvedValueOnce({
      ...candidateInterview,
      candidateUid: 'other-candidate',
    });

    await expect(
      service.respondToInvite(
        { uid: 'candidate-uid', email: 'candidate@example.com' },
        'interview-1',
        'accepted',
      ),
    ).rejects.toThrow(ForbiddenException);

    careerInterviewsRepository.findById.mockResolvedValueOnce({
      ...candidateInterview,
      invitationStatus: 'accepted',
    });

    await expect(
      service.respondToInvite(
        { uid: 'candidate-uid', email: 'candidate@example.com' },
        'interview-1',
        'accepted',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

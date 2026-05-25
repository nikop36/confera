import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from '../analytics.service';
import type { FirebaseService } from '../../firebase/firebase.service';
import type { UsersRepository } from '../../users/users.repository';
import type { SchedulingRepository } from '../../scheduling/scheduling.repository';
import type { CareerInterviewsRepository } from '../../career-interviews/career-interviews.repository';
import type { ConnectionsRepository } from '../../connections/connections.repository';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const usersRepository = {
    listUsers: jest.fn(),
  } as unknown as UsersRepository;
  const schedulingRepository = {
    listMeetings: jest.fn(),
  } as unknown as SchedulingRepository;
  const careerInterviewsRepository = {
    list: jest.fn(),
  } as unknown as CareerInterviewsRepository;
  const connectionsRepository = {
    listAccepted: jest.fn(),
  } as unknown as ConnectionsRepository;
  const firebaseService = {
    getFirestore: jest.fn(),
  } as unknown as FirebaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(
      firebaseService,
      usersRepository,
      schedulingRepository,
      careerInterviewsRepository,
      connectionsRepository,
    );
  });

  it('computes overview metrics correctly', async () => {
    (usersRepository.listUsers as jest.Mock).mockResolvedValue([
      {
        uid: 'u1',
        role: 'participant',
        profileStatus: 'complete',
        createdAt: new Date('2026-05-20T10:00:00.000Z'),
      },
      {
        uid: 'u2',
        role: 'organizer',
        profileStatus: 'incomplete',
        createdAt: new Date('2026-05-21T10:00:00.000Z'),
      },
      {
        uid: 'u3',
        role: 'participant',
        profileStatus: 'complete',
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
      },
    ]);
    (schedulingRepository.listMeetings as jest.Mock).mockResolvedValue([
      { id: 'm1', status: 'scheduled' },
      { id: 'm2', status: 'completed' },
      { id: 'm3', status: 'cancelled' },
    ]);
    (careerInterviewsRepository.list as jest.Mock).mockResolvedValue([
      { id: 'i1', status: 'scheduled' },
      { id: 'i2', status: 'completed' },
      { id: 'i3', status: 'cancelled' },
    ]);
    (connectionsRepository.listAccepted as jest.Mock).mockResolvedValue([
      { id: 'c1' },
      { id: 'c2' },
    ]);

    const result = await service.getOverview(
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
    );

    expect(result.summary).toEqual(
      expect.objectContaining({
        usersTotal: 3,
        usersCreatedInRange: 2,
        profilesCompletedInRange: 1,
        profileCompletionRatePercent: 50,
        confirmedMeetings: 2,
        confirmedCareerInterviews: 2,
        acceptedConnectionsTotal: 2,
      }),
    );
  });

  it('computes matching conversion rate correctly', async () => {
    (connectionsRepository.listAccepted as jest.Mock).mockResolvedValue([
      { id: 'c1', respondedAt: new Date('2026-05-20T10:00:00.000Z') },
      { id: 'c2', respondedAt: new Date('2026-05-20T12:00:00.000Z') },
      { id: 'c3', respondedAt: new Date('2026-05-19T10:00:00.000Z') },
    ]);
    (schedulingRepository.listMeetings as jest.Mock).mockResolvedValue([
      { id: 'm1', status: 'scheduled' },
      { id: 'm2', status: 'completed' },
      { id: 'm3', status: 'cancelled' },
    ]);
    (careerInterviewsRepository.list as jest.Mock).mockResolvedValue([
      { id: 'i1', status: 'scheduled' },
      { id: 'i2', status: 'cancelled' },
    ]);

    const result = await service.getMatchingPerformance(
      '2026-05-20T00:00:00.000Z',
      '2026-05-21T00:00:00.000Z',
    );

    expect(result.summary).toEqual(
      expect.objectContaining({
        acceptedConnectionsInRange: 2,
        meetingConversions: 2,
        interviewConversions: 1,
        totalConversions: 3,
        connectionToConversionRatePercent: 150,
      }),
    );
  });

  it('computes engagement metrics correctly', async () => {
    (connectionsRepository.listAccepted as jest.Mock).mockResolvedValue([
      { id: 'c1' },
    ]);
    (careerInterviewsRepository.list as jest.Mock).mockResolvedValue([
      {
        id: 'i1',
        invitationStatus: 'accepted',
        invitationRespondedAt: new Date('2026-05-20T10:00:00.000Z'),
      },
      {
        id: 'i2',
        invitationStatus: 'rejected',
        invitationRespondedAt: new Date('2026-05-20T12:00:00.000Z'),
      },
      {
        id: 'i3',
        invitationStatus: 'pending',
      },
    ]);
    (firebaseService.getFirestore as jest.Mock).mockReturnValue({
      collection: () => ({
        limit: () => ({
          get: () =>
            Promise.resolve({
              docs: [
                {
                  data: () => ({
                    createdAt: new Date('2026-05-20T09:00:00.000Z'),
                    read: false,
                    archived: false,
                  }),
                },
                {
                  data: () => ({
                    createdAt: new Date('2026-05-20T10:00:00.000Z'),
                    read: true,
                    archived: false,
                  }),
                },
              ],
            }),
        }),
      }),
    });

    const result = await service.getEngagement(
      '2026-05-20T00:00:00.000Z',
      '2026-05-21T00:00:00.000Z',
    );

    expect(result.summary).toEqual(
      expect.objectContaining({
        acceptedConnectionsTotal: 1,
        notificationsInRange: 2,
        unreadNotificationsInRange: 1,
        readRatePercent: 50,
        acceptedInterviewInvites: 1,
        rejectedInterviewInvites: 1,
        inviteDecisionCount: 2,
      }),
    );
  });

  it('throws on invalid range', async () => {
    await expect(
      service.getOverview('invalid', '2026-05-21T00:00:00.000Z'),
    ).rejects.toThrow(BadRequestException);
  });
});

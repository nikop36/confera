import { BadRequestException } from '@nestjs/common';
import { StatisticsService } from '../statistics.service';
import type { SchedulingRepository } from '../../scheduling/scheduling.repository';
import type { CareerInterviewsRepository } from '../../career-interviews/career-interviews.repository';

describe('StatisticsService', () => {
  let service: StatisticsService;

  const mockSchedulingRepository = {
    listTimeSlotsInRange: jest.fn(),
    listAllRooms: jest.fn(),
    listMeetingsByStatus: jest.fn(),
  } as unknown as SchedulingRepository;

  const mockCareerInterviewsRepository = {
    list: jest.fn(),
  } as unknown as CareerInterviewsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StatisticsService(
      mockSchedulingRepository,
      mockCareerInterviewsRepository,
    );
  });

  describe('getRoomOccupancyStats', () => {
    it('returns occupancy per room', async () => {
      (
        mockSchedulingRepository.listTimeSlotsInRange as jest.Mock
      ).mockResolvedValue([
        {
          id: 'slot-1',
          startAt: new Date('2026-05-20T10:00:00.000Z'),
          endAt: new Date('2026-05-20T10:30:00.000Z'),
        },
        {
          id: 'slot-2',
          startAt: new Date('2026-05-20T11:00:00.000Z'),
          endAt: new Date('2026-05-20T11:30:00.000Z'),
        },
      ]);
      (mockSchedulingRepository.listAllRooms as jest.Mock).mockResolvedValue([
        { id: 'room-1', name: 'Room A', capacity: 10, active: true },
      ]);
      (mockSchedulingRepository.listMeetingsByStatus as jest.Mock)
        .mockResolvedValueOnce([
          { id: 'm1', roomId: 'room-1', slotId: 'slot-1', status: 'scheduled' },
        ])
        .mockResolvedValueOnce([]);
      (mockCareerInterviewsRepository.list as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'ci-1',
            roomId: 'room-1',
            slotId: 'slot-2',
            status: 'scheduled',
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getRoomOccupancyStats(
        '2026-05-20T00:00:00.000Z',
        '2026-05-21T00:00:00.000Z',
      );

      expect(result.rooms).toHaveLength(1);
      expect(result.rooms[0]).toEqual(
        expect.objectContaining({
          roomId: 'room-1',
          bookedSlots: 2,
          totalSlots: 2,
          occupancyRatePercent: 100,
          usedSeats: 1,
          totalSeats: 20,
          capacityUtilizationPercent: 5,
        }),
      );
    });
  });

  describe('getConfirmedMeetingsStats', () => {
    it('returns counts and day series', async () => {
      (
        mockSchedulingRepository.listTimeSlotsInRange as jest.Mock
      ).mockImplementation((from: Date, to: Date) => {
        const isCurrentWindow =
          from.toISOString() === '2026-05-20T00:00:00.000Z' &&
          to.toISOString() === '2026-05-22T00:00:00.000Z';
        if (!isCurrentWindow) return [];
        return [
          {
            id: 'slot-1',
            startAt: new Date('2026-05-20T10:00:00.000Z'),
            endAt: new Date('2026-05-20T10:30:00.000Z'),
          },
          {
            id: 'slot-2',
            startAt: new Date('2026-05-21T10:00:00.000Z'),
            endAt: new Date('2026-05-21T10:30:00.000Z'),
          },
        ];
      });
      (
        mockSchedulingRepository.listMeetingsByStatus as jest.Mock
      ).mockImplementation((status: string) => {
        if (status === 'scheduled') {
          return [{ id: 'm1', slotId: 'slot-1', status: 'scheduled' }];
        }
        if (status === 'completed') {
          return [{ id: 'm2', slotId: 'slot-2', status: 'completed' }];
        }
        return [];
      });
      (mockCareerInterviewsRepository.list as jest.Mock).mockImplementation(
        (status: string) => {
          if (status === 'scheduled') {
            return [
              {
                id: 'ci-1',
                slotId: 'slot-1',
                status: 'scheduled',
                candidateUid: 'candidate-1',
                interviewerUid: 'interviewer-1',
              },
              {
                id: 'ci-2',
                slotId: 'slot-out-1',
                status: 'scheduled',
                invitationStatus: 'accepted',
                candidateUid: 'candidate-2',
                interviewerUid: 'interviewer-2',
              },
              {
                id: 'ci-3',
                slotId: 'slot-out-2',
                status: 'scheduled',
                invitationStatus: 'pending',
                candidateUid: 'candidate-3',
                interviewerUid: 'interviewer-3',
              },
            ];
          }
          if (status === 'completed') return [];
          if (status === 'cancelled') {
            return [
              {
                id: 'ci-4',
                slotId: 'slot-1',
                status: 'cancelled',
                invitationStatus: 'rejected',
                candidateUid: 'candidate-4',
              },
            ];
          }
          return [];
        },
      );

      const result = await service.getConfirmedMeetingsStats(
        '2026-05-20T00:00:00.000Z',
        '2026-05-22T00:00:00.000Z',
      );

      expect(result.summary).toEqual(
        expect.objectContaining({
          confirmedMeetingsCount: 2,
          confirmedCareerInterviewsCount: 1,
          confirmedTotalCount: 3,
          pendingInterviewInvitesCount: 1,
          acceptedInterviewInvitesCount: 0,
          rejectedInterviewInvitesCount: 1,
          inviteAcceptanceRatePercent: 0,
        }),
      );
      expect(result.series).toHaveLength(2);
      expect(result.heatmap.length).toBeGreaterThan(0);
      expect(result.funnel).toHaveLength(4);
      expect(result.series[0]).toEqual(
        expect.objectContaining({
          date: '2026-05-20',
          meetings: 1,
          interviews: 1,
          total: 2,
        }),
      );
    });

    it('throws on invalid date range', async () => {
      await expect(
        service.getConfirmedMeetingsStats(
          'invalid',
          '2026-05-22T00:00:00.000Z',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

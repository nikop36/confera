import { BadRequestException, Injectable } from '@nestjs/common';
import { SchedulingRepository } from '../scheduling/scheduling.repository';
import { CareerInterviewsRepository } from '../career-interviews/career-interviews.repository';
import type { TimeSlot } from '../common/interfaces/time-slot.interface';

@Injectable()
export class StatisticsService {
  private readonly cache = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();
  private readonly cacheTtlMs = 5_000;

  constructor(
    private readonly schedulingRepository: SchedulingRepository,
    private readonly careerInterviewsRepository: CareerInterviewsRepository,
  ) {}

  async getRoomOccupancyStats(from?: string, to?: string) {
    const cacheKey = `room-occupancy:${from ?? ''}:${to ?? ''}`;
    const cached =
      this.readCache<
        Awaited<ReturnType<StatisticsService['getRoomOccupancyStatsInternal']>>
      >(cacheKey);
    if (cached) return cached;
    const payload = await this.getRoomOccupancyStatsInternal(from, to);
    this.writeCache(cacheKey, payload);
    return payload;
  }

  private async getRoomOccupancyStatsInternal(from?: string, to?: string) {
    const { fromDate, toDate: endDate } = resolveRange(from, to);
    const slots = await this.schedulingRepository.listTimeSlotsInRange(
      fromDate,
      endDate,
    );
    const [rooms, confirmedMeetings, confirmedInterviews] = await Promise.all([
      this.schedulingRepository.listAllRooms(),
      this.getConfirmedMeetings(),
      this.getConfirmedCareerInterviews(),
    ]);

    const slotMap = createSlotMap(slots);
    const roomStats = rooms.map((room) => {
      const bookedSlotIds = new Set<string>();
      let usedSeats = 0;
      const totalSeats = slots.length * room.capacity;

      for (const meeting of confirmedMeetings) {
        if (meeting.roomId !== room.id || !slotMap.has(meeting.slotId))
          continue;
        bookedSlotIds.add(meeting.slotId);
        usedSeats += meeting.participantUids?.length ?? 0;
      }
      for (const interview of confirmedInterviews) {
        if (
          interview.roomId !== room.id ||
          !interview.slotId ||
          !slotMap.has(interview.slotId)
        ) {
          continue;
        }
        bookedSlotIds.add(interview.slotId);
        usedSeats += interview.interviewerUid ? 2 : 1;
      }

      const totalSlots = slots.length;
      const bookedSlots = bookedSlotIds.size;
      return {
        roomId: room.id,
        roomName: room.name,
        capacity: room.capacity,
        active: room.active,
        bookedSlots,
        totalSlots,
        usedSeats,
        totalSeats,
        occupancyRatePercent: totalSlots
          ? round2((bookedSlots / totalSlots) * 100)
          : 0,
        capacityUtilizationPercent: totalSeats
          ? round2((usedSeats / totalSeats) * 100)
          : 0,
      };
    });

    const allUsedSeats = roomStats.reduce(
      (sum, room) => sum + room.usedSeats,
      0,
    );
    const allTotalSeats = roomStats.reduce(
      (sum, room) => sum + room.totalSeats,
      0,
    );

    return {
      range: {
        from: fromDate.toISOString(),
        to: endDate.toISOString(),
      },
      summary: {
        roomsCount: rooms.length,
        activeRoomsCount: rooms.filter((room) => room.active).length,
        totalSlots: slots.length,
        averageOccupancyPercent:
          roomStats.length > 0
            ? round2(
                roomStats.reduce(
                  (sum, room) => sum + room.occupancyRatePercent,
                  0,
                ) / roomStats.length,
              )
            : 0,
        averageCapacityUtilizationPercent: allTotalSeats
          ? round2((allUsedSeats / allTotalSeats) * 100)
          : 0,
      },
      rooms: roomStats,
    };
  }

  async getConfirmedMeetingsStats(from?: string, to?: string) {
    const cacheKey = `confirmed-meetings:${from ?? ''}:${to ?? ''}`;
    const cached =
      this.readCache<
        Awaited<
          ReturnType<StatisticsService['getConfirmedMeetingsStatsInternal']>
        >
      >(cacheKey);
    if (cached) return cached;
    const payload = await this.getConfirmedMeetingsStatsInternal(from, to);
    this.writeCache(cacheKey, payload);
    return payload;
  }

  private async getConfirmedMeetingsStatsInternal(from?: string, to?: string) {
    const { fromDate, toDate: endDate } = resolveRange(from, to);
    const slots = await this.schedulingRepository.listTimeSlotsInRange(
      fromDate,
      endDate,
    );
    const [confirmedMeetings, confirmedInterviews, rooms] = await Promise.all([
      this.getConfirmedMeetings(),
      this.getConfirmedCareerInterviews(),
      this.schedulingRepository.listAllRooms(),
    ]);
    const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));

    const slotMap = createSlotMap(slots);
    const meetingCountBySlotId = new Map<string, number>();
    const interviewCountBySlotId = new Map<string, number>();

    const rangeMeetings = confirmedMeetings.filter((meeting) =>
      slotMap.has(meeting.slotId),
    );
    const rangeInterviews = confirmedInterviews.filter(
      (interview) => interview.slotId && slotMap.has(interview.slotId),
    );

    for (const meeting of rangeMeetings) {
      if (!slotMap.has(meeting.slotId)) continue;
      meetingCountBySlotId.set(
        meeting.slotId,
        (meetingCountBySlotId.get(meeting.slotId) ?? 0) + 1,
      );
    }

    for (const interview of rangeInterviews) {
      if (!interview.slotId || !slotMap.has(interview.slotId)) continue;
      interviewCountBySlotId.set(
        interview.slotId,
        (interviewCountBySlotId.get(interview.slotId) ?? 0) + 1,
      );
    }

    const seriesByDay = new Map<
      string,
      { date: string; meetings: number; interviews: number; total: number }
    >();
    const heatmapByHour = new Map<
      number,
      { hour: number; meetings: number; interviews: number; total: number }
    >();

    for (const slot of slots) {
      const startAt = normalizeDate(slot.startAt);
      if (!startAt) continue;
      const date = startAt.toISOString().slice(0, 10);
      const hour = startAt.getHours();
      const slotMeetings = meetingCountBySlotId.get(slot.id) ?? 0;
      const slotInterviews = interviewCountBySlotId.get(slot.id) ?? 0;
      const entry = seriesByDay.get(date) ?? {
        date,
        meetings: 0,
        interviews: 0,
        total: 0,
      };
      entry.meetings += slotMeetings;
      entry.interviews += slotInterviews;
      entry.total = entry.meetings + entry.interviews;
      seriesByDay.set(date, entry);

      const hourEntry = heatmapByHour.get(hour) ?? {
        hour,
        meetings: 0,
        interviews: 0,
        total: 0,
      };
      hourEntry.meetings += slotMeetings;
      hourEntry.interviews += slotInterviews;
      hourEntry.total = hourEntry.meetings + hourEntry.interviews;
      heatmapByHour.set(hour, hourEntry);
    }

    const series = [...seriesByDay.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const anomalies = detectAnomalies(series);
    const confirmedMeetingsCount = [...meetingCountBySlotId.values()].reduce(
      (sum, count) => sum + count,
      0,
    );
    const confirmedInterviewsCount = [
      ...interviewCountBySlotId.values(),
    ].reduce((sum, count) => sum + count, 0);
    const cancelledInterviews =
      await this.careerInterviewsRepository.list('cancelled');
    const rangeCancelledInterviews = cancelledInterviews.filter(
      (interview) => interview.slotId && slotMap.has(interview.slotId),
    );
    const pendingInterviewInvitesCount = rangeInterviews.filter(
      (item) => (item.invitationStatus ?? 'pending') === 'pending',
    ).length;
    const acceptedInterviewInvitesCount = rangeInterviews.filter(
      (item) => item.invitationStatus === 'accepted',
    ).length;
    const rejectedInterviewInvitesCount = rangeCancelledInterviews.filter(
      (item) => item.invitationStatus === 'rejected',
    ).length;
    const inviteDecisionBase =
      acceptedInterviewInvitesCount + rejectedInterviewInvitesCount;
    const inviteAcceptanceRatePercent = inviteDecisionBase
      ? round2((acceptedInterviewInvitesCount / inviteDecisionBase) * 100)
      : 0;

    const conflictMetrics = calculateConflictMetrics(
      rangeMeetings,
      rangeInterviews,
    );
    const drilldown = buildDrilldownRecords(
      rangeMeetings,
      rangeInterviews,
      slotMap,
      roomNameById,
    );
    const currentTotal = confirmedMeetingsCount + confirmedInterviewsCount;
    const previous =
      from && to
        ? await this.getPreviousPeriodSummary(fromDate, endDate, currentTotal)
        : {
            confirmedTotalCount: 0,
            confirmedMeetingsCount: 0,
            confirmedCareerInterviewsCount: 0,
            deltaTotalPercent: 0,
          };

    return {
      range: {
        from: fromDate.toISOString(),
        to: endDate.toISOString(),
      },
      summary: {
        confirmedMeetingsCount,
        confirmedCareerInterviewsCount: confirmedInterviewsCount,
        confirmedTotalCount: currentTotal,
        pendingInterviewInvitesCount,
        acceptedInterviewInvitesCount,
        rejectedInterviewInvitesCount,
        inviteAcceptanceRatePercent,
        conflictMetrics,
        previousPeriod: previous,
      },
      series,
      heatmap: [...heatmapByHour.values()].sort((a, b) => a.hour - b.hour),
      anomalies,
      drilldown,
      funnel: [
        { stage: 'pending_invites', value: pendingInterviewInvitesCount },
        { stage: 'accepted_invites', value: acceptedInterviewInvitesCount },
        { stage: 'rejected_invites', value: rejectedInterviewInvitesCount },
        {
          stage: 'confirmed_total',
          value: confirmedMeetingsCount + confirmedInterviewsCount,
        },
      ],
    };
  }

  async getHealthSummary() {
    const [rooms, slots] = await Promise.all([
      this.schedulingRepository.listAllRooms(),
      this.schedulingRepository.listTimeSlotsInRange(
        new Date('1970-01-01T00:00:00.000Z'),
        new Date('1970-01-02T00:00:00.000Z'),
      ),
    ]);

    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      modules: {
        schedulingRepository: true,
        careerInterviewsRepository: true,
      },
      sampleCounts: {
        rooms: rooms.length,
        slotsInSampleWindow: slots.length,
      },
    };
  }

  private async getConfirmedMeetings() {
    const [scheduled, completed] = await Promise.all([
      this.schedulingRepository.listMeetingsByStatus('scheduled'),
      this.schedulingRepository.listMeetingsByStatus('completed'),
    ]);
    return [...scheduled, ...completed];
  }

  private async getConfirmedCareerInterviews() {
    const [scheduled, completed] = await Promise.all([
      this.careerInterviewsRepository.list('scheduled'),
      this.careerInterviewsRepository.list('completed'),
    ]);
    return [...scheduled, ...completed];
  }

  private async getPreviousPeriodSummary(
    fromDate: Date,
    endDate: Date,
    currentTotal: number,
  ) {
    const windowMs = endDate.getTime() - fromDate.getTime();
    if (windowMs <= 0) {
      return {
        confirmedTotalCount: 0,
        confirmedMeetingsCount: 0,
        confirmedCareerInterviewsCount: 0,
        deltaTotalPercent: 0,
      };
    }
    const prevFrom = new Date(fromDate.getTime() - windowMs);
    const prevTo = new Date(fromDate);
    const slots = await this.schedulingRepository.listTimeSlotsInRange(
      prevFrom,
      prevTo,
    );
    const slotMap = createSlotMap(slots);
    const [meetings, interviews] = await Promise.all([
      this.getConfirmedMeetings(),
      this.getConfirmedCareerInterviews(),
    ]);
    const prevMeetings = meetings.filter((meeting) =>
      slotMap.has(meeting.slotId),
    );
    const prevInterviews = interviews.filter(
      (interview) => interview.slotId && slotMap.has(interview.slotId),
    );
    const previousTotal = prevMeetings.length + prevInterviews.length;
    let deltaTotalPercent: number;

    if (previousTotal === 0) {
      deltaTotalPercent = currentTotal > 0 ? 100 : 0;
    } else {
      deltaTotalPercent = round2(
        ((currentTotal - previousTotal) / previousTotal) * 100,
      );
    }

    return {
      confirmedTotalCount: previousTotal,
      confirmedMeetingsCount: prevMeetings.length,
      confirmedCareerInterviewsCount: prevInterviews.length,
      deltaTotalPercent,
    };
  }

  private readCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private writeCache(key: string, value: unknown) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }
}

function resolveRange(from?: string, to?: string) {
  const fromDate = from ? new Date(from) : new Date('1970-01-01T00:00:00.000Z');
  const toDate = to ? new Date(to) : new Date('9999-12-31T23:59:59.999Z');

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new BadRequestException('Invalid from/to date');
  }
  if (toDate <= fromDate) {
    throw new BadRequestException('to must be after from');
  }

  return { fromDate, toDate };
}

function createSlotMap(slots: TimeSlot[]) {
  return new Map(
    slots
      .filter((slot) => Boolean(slot.id))
      .map((slot) => [slot.id, slot] as const),
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function calculateConflictMetrics(
  meetings: Array<{
    roomId: string;
    slotId: string;
    participantUids: string[];
  }>,
  interviews: Array<{
    roomId?: string;
    slotId?: string;
    interviewerUid?: string;
    candidateUid: string;
  }>,
) {
  const roomSlotMap = new Map<string, number>();
  const participantSlotMap = new Map<string, number>();
  const interviewerSlotMap = new Map<string, number>();
  const candidateSlotMap = new Map<string, number>();

  for (const meeting of meetings) {
    const roomKey = `${meeting.roomId}_${meeting.slotId}`;
    roomSlotMap.set(roomKey, (roomSlotMap.get(roomKey) ?? 0) + 1);
    for (const uid of meeting.participantUids ?? []) {
      const participantKey = `${uid}_${meeting.slotId}`;
      participantSlotMap.set(
        participantKey,
        (participantSlotMap.get(participantKey) ?? 0) + 1,
      );
    }
  }

  for (const interview of interviews) {
    if (!interview.slotId) continue;
    if (interview.roomId) {
      const roomKey = `${interview.roomId}_${interview.slotId}`;
      roomSlotMap.set(roomKey, (roomSlotMap.get(roomKey) ?? 0) + 1);
    }
    const candidateKey = `${interview.candidateUid}_${interview.slotId}`;
    candidateSlotMap.set(
      candidateKey,
      (candidateSlotMap.get(candidateKey) ?? 0) + 1,
    );
    if (interview.interviewerUid) {
      const interviewerKey = `${interview.interviewerUid}_${interview.slotId}`;
      interviewerSlotMap.set(
        interviewerKey,
        (interviewerSlotMap.get(interviewerKey) ?? 0) + 1,
      );
    }
  }

  return {
    roomSlotConflicts: countConflicts(roomSlotMap),
    participantConflicts: countConflicts(participantSlotMap),
    interviewerConflicts: countConflicts(interviewerSlotMap),
    candidateConflicts: countConflicts(candidateSlotMap),
  };
}

function countConflicts(source: Map<string, number>) {
  let conflicts = 0;
  for (const count of source.values()) {
    if (count > 1) conflicts += count - 1;
  }
  return conflicts;
}

function detectAnomalies(
  series: Array<{
    date: string;
    total: number;
    meetings: number;
    interviews: number;
  }>,
) {
  const flags: Array<{
    date: string;
    type: 'spike' | 'drop';
    previousTotal: number;
    currentTotal: number;
    deltaPercent: number;
  }> = [];

  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1];
    const current = series[index];
    if (previous.total === 0) continue;

    const deltaPercent = round2(
      ((current.total - previous.total) / previous.total) * 100,
    );
    const absoluteDelta = Math.abs(current.total - previous.total);
    if (absoluteDelta < 3) continue;
    if (deltaPercent >= 50) {
      flags.push({
        date: current.date,
        type: 'spike',
        previousTotal: previous.total,
        currentTotal: current.total,
        deltaPercent,
      });
    } else if (deltaPercent <= -50) {
      flags.push({
        date: current.date,
        type: 'drop',
        previousTotal: previous.total,
        currentTotal: current.total,
        deltaPercent,
      });
    }
  }

  return flags;
}

function buildDrilldownRecords(
  meetings: Array<{
    id: string;
    roomId: string;
    slotId: string;
    status: string;
    participantUids?: string[];
    requestedByUids?: string[];
    requestedToUids?: string[];
  }>,
  interviews: Array<{
    id: string;
    roomId?: string;
    slotId?: string;
    status: string;
    candidateUid: string;
    interviewerUid?: string;
    invitationStatus?: string;
  }>,
  slotMap: Map<string, TimeSlot>,
  roomNameById: Map<string, string>,
) {
  const meetingRecords = meetings
    .map((meeting) => {
      const slot = slotMap.get(meeting.slotId);
      if (!slot) return null;
      const startAt = normalizeDate(slot.startAt);
      const endAt = normalizeDate(slot.endAt);
      if (!startAt || !endAt) return null;
      return {
        type: 'meeting' as const,
        id: meeting.id,
        status: meeting.status,
        date: startAt.toISOString().slice(0, 10),
        hour: startAt.getHours(),
        slotId: meeting.slotId,
        roomId: meeting.roomId,
        roomName: roomNameById.get(meeting.roomId) ?? meeting.roomId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        participantCount: meeting.participantUids?.length ?? 0,
        requestedByCount: meeting.requestedByUids?.length ?? 0,
        requestedToCount: meeting.requestedToUids?.length ?? 0,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const interviewRecords = interviews
    .map((interview) => {
      if (!interview.slotId) return null;
      const slot = slotMap.get(interview.slotId);
      if (!slot) return null;
      const startAt = normalizeDate(slot.startAt);
      const endAt = normalizeDate(slot.endAt);
      if (!startAt || !endAt) return null;
      return {
        type: 'interview' as const,
        id: interview.id,
        status: interview.status,
        invitationStatus: interview.invitationStatus ?? 'pending',
        date: startAt.toISOString().slice(0, 10),
        hour: startAt.getHours(),
        slotId: interview.slotId,
        roomId: interview.roomId ?? '',
        roomName: interview.roomId
          ? (roomNameById.get(interview.roomId) ?? interview.roomId)
          : 'N/A',
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        participantCount: interview.interviewerUid ? 2 : 1,
        candidateUid: interview.candidateUid,
        interviewerUid: interview.interviewerUid ?? null,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  return [...meetingRecords, ...interviewRecords].sort((a, b) =>
    a.startAt.localeCompare(b.startAt),
  );
}

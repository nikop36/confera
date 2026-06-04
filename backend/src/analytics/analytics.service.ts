import { BadRequestException, Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersRepository } from '../users/users.repository';
import { SchedulingRepository } from '../scheduling/scheduling.repository';
import { CareerInterviewsRepository } from '../career-interviews/career-interviews.repository';
import { ConnectionsRepository } from '../connections/connections.repository';
import { EventsRepository } from '../events/events.repository';
import { StatisticsService } from '../statistics/statistics.service';
import type { UserRoleEnum } from '../common/enums/roles.enum';
import { NotificationTypeEnum } from '../common/enums/notification-type.enum';

type AnalyticsRange = {
  from: string;
  to: string;
  fromDate: Date;
  toDate: Date;
};

type OverviewPayload = {
  range: AnalyticsRange;
  generatedAt: string;
  metricsVersion: 'v1';
  summary: {
    usersTotal: number;
    usersCreatedInRange: number;
    profilesCompletedInRange: number;
    profileCompletionRatePercent: number;
    confirmedMeetings: number;
    confirmedCareerInterviews: number;
    acceptedConnectionsTotal: number;
  };
};

type UsagePayload = {
  range: AnalyticsRange;
  generatedAt: string;
  metricsVersion: 'v1';
  summary: {
    usersTotal: number;
    completedProfilesTotal: number;
    profileCompletionRatePercent: number;
    inactive7Days: number;
    inactive30Days: number;
  };
  series: Array<{
    date: string;
    usersCreated: number;
    profilesCompleted: number;
    activeUsers: number;
  }>;
  roleBreakdown: Array<{ role: string; count: number }>;
  inactiveByRole: Array<{ role: string; count: number }>;
};

type MatchingPayload = {
  range: AnalyticsRange;
  generatedAt: string;
  metricsVersion: 'v1';
  summary: {
    acceptedConnectionsInRange: number;
    meetingConversions: number;
    interviewConversions: number;
    totalConversions: number;
    connectionToConversionRatePercent: number;
  };
  notes: string[];
};

type EngagementPayload = {
  range: AnalyticsRange;
  generatedAt: string;
  metricsVersion: 'v1';
  summary: {
    notificationsInRange: number;
    unreadNotificationsInRange: number;
    readRatePercent: number;
    eventRegistrationsInRange: number;
    eventCancellationsInRange: number;
    eventCapacityUtilizationPercent: number;
    activeEventsInRange: number;
  };
  topEvents: Array<{
    eventId: string;
    title: string;
    registeredCount: number;
    capacity: number;
    fillRatePercent: number;
  }>;
  topCancelledEvents: Array<{
    eventId: string;
    title: string;
    cancellationCount: number;
  }>;
  notes: string[];
};

@Injectable()
export class AnalyticsService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();
  private readonly cacheTtlMs = 5_000;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersRepository: UsersRepository,
    private readonly schedulingRepository: SchedulingRepository,
    private readonly careerInterviewsRepository: CareerInterviewsRepository,
    private readonly connectionsRepository: ConnectionsRepository,
    private readonly eventsRepository: EventsRepository,
    private readonly statisticsService: StatisticsService,
  ) {}

  async getOverview(from?: string, to?: string): Promise<OverviewPayload> {
    const cacheKey = `overview:${from ?? ''}:${to ?? ''}`;
    const cached = this.readCache<OverviewPayload>(cacheKey);
    if (cached) return cached;

    const range = resolveRange(from, to);
    const [users, meetings, interviews, connections] = await Promise.all([
      this.usersRepository.listUsers(5000),
      this.schedulingRepository.listMeetings(),
      this.careerInterviewsRepository.list(),
      this.connectionsRepository.listAccepted(5000),
    ]);

    const usersInRange = users.filter((user) =>
      isWithinRange(toDate(user.createdAt), range),
    );
    const completedProfiles = usersInRange.filter(
      (user) => user.profileStatus === 'complete',
    ).length;
    const meetingsConfirmed = meetings.filter((meeting) =>
      ['scheduled', 'completed'].includes(meeting.status),
    ).length;
    const interviewsConfirmed = interviews.filter((interview) =>
      ['scheduled', 'completed'].includes(interview.status),
    ).length;

    const payload: OverviewPayload = {
      range,
      generatedAt: new Date().toISOString(),
      metricsVersion: 'v1',
      summary: {
        usersTotal: users.length,
        usersCreatedInRange: usersInRange.length,
        profilesCompletedInRange: completedProfiles,
        profileCompletionRatePercent: usersInRange.length
          ? round2((completedProfiles / usersInRange.length) * 100)
          : 0,
        confirmedMeetings: meetingsConfirmed,
        confirmedCareerInterviews: interviewsConfirmed,
        acceptedConnectionsTotal: connections.length,
      },
    };
    this.writeCache(cacheKey, payload);
    return payload;
  }

  async getUsageTrend(from?: string, to?: string): Promise<UsagePayload> {
    const cacheKey = `usage:${from ?? ''}:${to ?? ''}`;
    const cached = this.readCache<UsagePayload>(cacheKey);
    if (cached) return cached;

    const range = resolveRange(from, to);
    const users = await this.usersRepository.listUsers(5000);
    const usersInRange = users.filter((user) =>
      isWithinRange(toDate(user.createdAt), range),
    );
    const completedProfilesTotal = users.filter(
      (user) => user.profileStatus === 'complete',
    ).length;
    const now = new Date();
    const inactive7DayUsers = users.filter((user) =>
      isInactiveForDays(getUserActivityDate(user), now, 7),
    );
    const inactive7Days = inactive7DayUsers.length;
    const inactive30Days = users.filter((user) =>
      isInactiveForDays(getUserActivityDate(user), now, 30),
    ).length;
    const inactiveInRangeUsers = users.filter((user) => {
      const activityAt = getUserActivityDate(user);
      const createdAt = toDate(user.createdAt);
      return (
        (!createdAt || createdAt < range.toDate) &&
        (!activityAt || !isWithinRange(activityAt, range))
      );
    });

    const byDay = new Map<
      string,
      {
        date: string;
        usersCreated: number;
        profilesCompleted: number;
        activeUsers: number;
      }
    >();
    for (const user of usersInRange) {
      const createdAt = toDate(user.createdAt);
      if (!createdAt) continue;
      const date = createdAt.toISOString().slice(0, 10);
      const entry = ensureUsageDay(byDay, date);
      entry.usersCreated += 1;
      if (user.profileStatus === 'complete') entry.profilesCompleted += 1;
      byDay.set(date, entry);
    }

    for (const user of users) {
      const activeAt = getUserActivityDate(user);
      if (!isWithinRange(activeAt, range) || !activeAt) continue;
      const date = activeAt.toISOString().slice(0, 10);
      ensureUsageDay(byDay, date).activeUsers += 1;
    }

    const payload: UsagePayload = {
      range,
      generatedAt: new Date().toISOString(),
      metricsVersion: 'v1',
      summary: {
        usersTotal: users.length,
        completedProfilesTotal,
        profileCompletionRatePercent: users.length
          ? round2((completedProfilesTotal / users.length) * 100)
          : 0,
        inactive7Days,
        inactive30Days,
      },
      series: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
      roleBreakdown: buildRoleBreakdown(usersInRange.map((user) => user.role)),
      inactiveByRole: buildRoleBreakdown(
        inactiveInRangeUsers.map((user) => user.role),
      ),
    };
    this.writeCache(cacheKey, payload);
    return payload;
  }

  async getMatchingPerformance(
    from?: string,
    to?: string,
  ): Promise<MatchingPayload> {
    const cacheKey = `matching:${from ?? ''}:${to ?? ''}`;
    const cached = this.readCache<MatchingPayload>(cacheKey);
    if (cached) return cached;

    const range = resolveRange(from, to);
    const [connections, meetings, interviews] = await Promise.all([
      this.connectionsRepository.listAccepted(5000),
      this.schedulingRepository.listMeetings(),
      this.careerInterviewsRepository.list(),
    ]);

    const acceptedConnectionsInRange = connections.filter((connection) =>
      isWithinRange(
        toDate(connection.respondedAt ?? connection.createdAt),
        range,
      ),
    );
    const meetingConversions = meetings.filter((meeting) =>
      ['scheduled', 'completed'].includes(meeting.status),
    ).length;
    const interviewConversions = interviews.filter((interview) =>
      ['scheduled', 'completed'].includes(interview.status),
    ).length;
    const totalConversions = meetingConversions + interviewConversions;
    const totalAcceptedConnections = acceptedConnectionsInRange.length;

    const payload: MatchingPayload = {
      range,
      generatedAt: new Date().toISOString(),
      metricsVersion: 'v1',
      summary: {
        acceptedConnectionsInRange: totalAcceptedConnections,
        meetingConversions,
        interviewConversions,
        totalConversions,
        connectionToConversionRatePercent: totalAcceptedConnections
          ? round2((totalConversions / totalAcceptedConnections) * 100)
          : 0,
      },
      notes: [
        'Current matching performance uses accepted connections as a proxy for accepted recommendations.',
      ],
    };
    this.writeCache(cacheKey, payload);
    return payload;
  }

  async getEngagement(from?: string, to?: string): Promise<EngagementPayload> {
    const cacheKey = `engagement:${from ?? ''}:${to ?? ''}`;
    const cached = this.readCache<EngagementPayload>(cacheKey);
    if (cached) return cached;

    const range = resolveRange(from, to);
    const db = this.firebaseService.getFirestore();
    const [notificationsSnapshot, events, registrations] = await Promise.all([
      db.collection('notifications').limit(5000).get(),
      this.eventsRepository.listAllEvents(),
      this.eventsRepository.listAllRegistrations(),
    ]);

    const notifications = notificationsSnapshot.docs.map((doc) =>
      doc.data(),
    ) as Array<{
      createdAt?: unknown;
      read?: boolean;
      archived?: boolean;
      type?: NotificationTypeEnum | string;
      eventId?: string;
    }>;

    const notificationsInRange = notifications.filter((notification) =>
      isWithinRange(toDate(notification.createdAt), range),
    );
    const unreadNotifications = notificationsInRange.filter(
      (notification) => !notification.read && !notification.archived,
    ).length;
    const eventCancellationsInRange = notificationsInRange.filter(
      (notification) =>
        notification.type === NotificationTypeEnum.EVENT_CANCELLED,
    ).length;
    const eventTitleById = new Map(
      events.map((event) => [event.id, event.title]),
    );
    const cancellationCountByEventId = new Map<string, number>();
    for (const notification of notificationsInRange) {
      if (
        notification.type !== NotificationTypeEnum.EVENT_CANCELLED ||
        !notification.eventId
      ) {
        continue;
      }
      cancellationCountByEventId.set(
        notification.eventId,
        (cancellationCountByEventId.get(notification.eventId) ?? 0) + 1,
      );
    }
    const eventRegistrationsInRange = registrations.filter((registration) =>
      isWithinRange(toDate(registration.registeredAt), range),
    ).length;
    const activeEventsInRange = events.filter(
      (event) =>
        isWithinRange(toDate(event.startAt), range) ||
        isWithinRange(toDate(event.endAt), range),
    );
    const totalEventCapacity = activeEventsInRange.reduce(
      (sum, event) => sum + Math.max(0, event.capacity),
      0,
    );
    const totalEventRegistrations = activeEventsInRange.reduce(
      (sum, event) => sum + Math.max(0, event.registeredCount),
      0,
    );
    const topEvents = [...activeEventsInRange]
      .sort((a, b) => b.registeredCount - a.registeredCount)
      .slice(0, 5)
      .map((event) => ({
        eventId: event.id,
        title: event.title,
        registeredCount: event.registeredCount,
        capacity: event.capacity,
        fillRatePercent: event.capacity
          ? round2((event.registeredCount / event.capacity) * 100)
          : 0,
      }));
    const topCancelledEvents = [...cancellationCountByEventId.entries()]
      .sort(([, left], [, right]) => right - left)
      .slice(0, 5)
      .map(([eventId, cancellationCount]) => ({
        eventId,
        title: eventTitleById.get(eventId) ?? eventId,
        cancellationCount,
      }));

    const payload: EngagementPayload = {
      range,
      generatedAt: new Date().toISOString(),
      metricsVersion: 'v1',
      summary: {
        notificationsInRange: notificationsInRange.length,
        unreadNotificationsInRange: unreadNotifications,
        readRatePercent: notificationsInRange.length
          ? round2(
              ((notificationsInRange.length - unreadNotifications) /
                notificationsInRange.length) *
                100,
            )
          : 0,
        eventRegistrationsInRange,
        eventCancellationsInRange,
        eventCapacityUtilizationPercent: totalEventCapacity
          ? round2((totalEventRegistrations / totalEventCapacity) * 100)
          : 0,
        activeEventsInRange: activeEventsInRange.length,
      },
      topEvents,
      topCancelledEvents,
      notes: [
        'Engagement focuses on user actions: notifications, event registrations, and event cancellations.',
      ],
    };
    this.writeCache(cacheKey, payload);
    return payload;
  }

  async getReportJson(
    from?: string,
    to?: string,
    section:
      | 'all'
      | 'overview'
      | 'operations'
      | 'usage'
      | 'matching'
      | 'engagement' = 'all',
  ): Promise<Record<string, unknown>> {
    const [
      overview,
      operationsConfirmed,
      operationsRooms,
      usage,
      matching,
      engagement,
    ] = await Promise.all([
      this.getOverview(from, to),
      this.statisticsService.getConfirmedMeetingsStats(from, to),
      this.statisticsService.getRoomOccupancyStats(from, to),
      this.getUsageTrend(from, to),
      this.getMatchingPerformance(from, to),
      this.getEngagement(from, to),
    ]);

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        metricsVersion: 'v1',
        section,
        range: overview.range,
      },
      sections: {
        operations: {
          confirmed: operationsConfirmed,
          roomOccupancy: operationsRooms,
        },
        usage: {
          summary: usage.summary,
          series: usage.series,
          roleBreakdown: usage.roleBreakdown,
          inactiveByRole: usage.inactiveByRole,
        },
        matching: {
          summary: matching.summary,
          notes: matching.notes,
        },
        engagement: {
          summary: engagement.summary,
          topEvents: engagement.topEvents,
          notes: engagement.notes,
        },
      },
    };
    if (section === 'all') return report;
    if (section === 'overview') {
      return {
        metadata: report.metadata,
        sections: {
          overview: {
            summary: overview.summary,
          },
        },
      };
    }
    return {
      metadata: report.metadata,
      sections: {
        [section]: report.sections[section],
      },
    };
  }

  async getReportCsv(
    from?: string,
    to?: string,
    section:
      | 'all'
      | 'overview'
      | 'operations'
      | 'usage'
      | 'matching'
      | 'engagement' = 'all',
  ) {
    const [
      overview,
      operationsConfirmed,
      operationsRooms,
      usage,
      matching,
      engagement,
    ] = await Promise.all([
      this.getOverview(from, to),
      this.statisticsService.getConfirmedMeetingsStats(from, to),
      this.statisticsService.getRoomOccupancyStats(from, to),
      this.getUsageTrend(from, to),
      this.getMatchingPerformance(from, to),
      this.getEngagement(from, to),
    ]);

    const rows: string[][] = [['section', 'group', 'metric', 'date', 'value']];

    if (section === 'overview') {
      appendOverviewCsvRows(rows, overview);
    }

    if (section === 'all' || section === 'operations') {
      appendOperationsCsvRows(rows, operationsConfirmed, operationsRooms);
    }

    if (section === 'all' || section === 'matching') {
      appendMatchingCsvRows(rows, matching);
    }

    if (section === 'all' || section === 'engagement') {
      appendEngagementCsvRows(rows, engagement);
    }

    if (section === 'all' || section === 'usage') {
      appendUsageCsvRows(rows, usage);
    }

    return `${rows.map(toCsvRow).join('\n')}\n`;
  }

  private readCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
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

type OperationsConfirmedPayload = Awaited<
  ReturnType<StatisticsService['getConfirmedMeetingsStats']>
>;

type OperationsRoomsPayload = Awaited<
  ReturnType<StatisticsService['getRoomOccupancyStats']>
>;

function appendMetricRow(
  rows: string[][],
  section: string,
  group: string,
  metric: string,
  value: string | number,
  date = '',
) {
  rows.push([section, group, metric, date, String(value)]);
}

function appendOverviewCsvRows(rows: string[][], overview: OverviewPayload) {
  appendMetricRow(
    rows,
    'overview',
    'summary',
    'users_total',
    overview.summary.usersTotal,
  );
  appendMetricRow(
    rows,
    'overview',
    'summary',
    'users_created_in_range',
    overview.summary.usersCreatedInRange,
  );
  appendMetricRow(
    rows,
    'overview',
    'summary',
    'profiles_completed_in_range',
    overview.summary.profilesCompletedInRange,
  );
  appendMetricRow(
    rows,
    'overview',
    'summary',
    'profile_completion_rate_percent',
    overview.summary.profileCompletionRatePercent,
  );
  appendMetricRow(
    rows,
    'overview',
    'summary',
    'confirmed_meetings',
    overview.summary.confirmedMeetings,
  );
  appendMetricRow(
    rows,
    'overview',
    'summary',
    'confirmed_career_interviews',
    overview.summary.confirmedCareerInterviews,
  );
  appendMetricRow(
    rows,
    'overview',
    'summary',
    'accepted_connections_total',
    overview.summary.acceptedConnectionsTotal,
  );
}

function appendOperationsCsvRows(
  rows: string[][],
  confirmed: OperationsConfirmedPayload,
  rooms: OperationsRoomsPayload,
) {
  appendMetricRow(
    rows,
    'operations',
    'confirmed_summary',
    'confirmed_total_count',
    confirmed.summary.confirmedTotalCount,
  );
  appendMetricRow(
    rows,
    'operations',
    'confirmed_summary',
    'confirmed_meetings_count',
    confirmed.summary.confirmedMeetingsCount,
  );
  appendMetricRow(
    rows,
    'operations',
    'confirmed_summary',
    'confirmed_career_interviews_count',
    confirmed.summary.confirmedCareerInterviewsCount,
  );
  appendMetricRow(
    rows,
    'operations',
    'confirmed_summary',
    'pending_interview_invites_count',
    confirmed.summary.pendingInterviewInvitesCount,
  );
  appendMetricRow(
    rows,
    'operations',
    'confirmed_summary',
    'accepted_interview_invites_count',
    confirmed.summary.acceptedInterviewInvitesCount,
  );
  appendMetricRow(
    rows,
    'operations',
    'confirmed_summary',
    'rejected_interview_invites_count',
    confirmed.summary.rejectedInterviewInvitesCount,
  );
  appendMetricRow(
    rows,
    'operations',
    'confirmed_summary',
    'invite_acceptance_rate_percent',
    confirmed.summary.inviteAcceptanceRatePercent,
  );
  appendMetricRow(
    rows,
    'operations',
    'room_summary',
    'rooms_count',
    rooms.summary.roomsCount,
  );
  appendMetricRow(
    rows,
    'operations',
    'room_summary',
    'active_rooms_count',
    rooms.summary.activeRoomsCount,
  );
  appendMetricRow(
    rows,
    'operations',
    'room_summary',
    'total_slots',
    rooms.summary.totalSlots,
  );
  appendMetricRow(
    rows,
    'operations',
    'room_summary',
    'average_occupancy_percent',
    rooms.summary.averageOccupancyPercent,
  );
  appendMetricRow(
    rows,
    'operations',
    'room_summary',
    'average_capacity_utilization_percent',
    rooms.summary.averageCapacityUtilizationPercent,
  );
  appendOperationsSeriesRows(rows, confirmed);
  appendRoomRows(rows, rooms);
}

function appendOperationsSeriesRows(
  rows: string[][],
  confirmed: OperationsConfirmedPayload,
) {
  for (const point of confirmed.series) {
    appendMetricRow(
      rows,
      'operations',
      'daily_confirmed',
      'meetings',
      point.meetings,
      point.date,
    );
    appendMetricRow(
      rows,
      'operations',
      'daily_confirmed',
      'interviews',
      point.interviews,
      point.date,
    );
    appendMetricRow(
      rows,
      'operations',
      'daily_confirmed',
      'total',
      point.total,
      point.date,
    );
  }
}

function appendRoomRows(rows: string[][], rooms: OperationsRoomsPayload) {
  for (const room of rooms.rooms) {
    appendMetricRow(
      rows,
      'operations',
      'rooms',
      `${room.roomName}_occupancy_percent`,
      room.occupancyRatePercent,
    );
    appendMetricRow(
      rows,
      'operations',
      'rooms',
      `${room.roomName}_capacity_utilization_percent`,
      room.capacityUtilizationPercent,
    );
  }
}

function appendMatchingCsvRows(rows: string[][], matching: MatchingPayload) {
  appendMetricRow(
    rows,
    'matching',
    'summary',
    'accepted_connections_in_range',
    matching.summary.acceptedConnectionsInRange,
  );
  appendMetricRow(
    rows,
    'matching',
    'summary',
    'meeting_conversions',
    matching.summary.meetingConversions,
  );
  appendMetricRow(
    rows,
    'matching',
    'summary',
    'interview_conversions',
    matching.summary.interviewConversions,
  );
  appendMetricRow(
    rows,
    'matching',
    'summary',
    'total_conversions',
    matching.summary.totalConversions,
  );
  appendMetricRow(
    rows,
    'matching',
    'summary',
    'connection_to_conversion_rate_percent',
    matching.summary.connectionToConversionRatePercent,
  );
}

function appendEngagementCsvRows(
  rows: string[][],
  engagement: EngagementPayload,
) {
  appendMetricRow(
    rows,
    'engagement',
    'summary',
    'notifications_in_range',
    engagement.summary.notificationsInRange,
  );
  appendMetricRow(
    rows,
    'engagement',
    'summary',
    'unread_notifications_in_range',
    engagement.summary.unreadNotificationsInRange,
  );
  appendMetricRow(
    rows,
    'engagement',
    'summary',
    'read_rate_percent',
    engagement.summary.readRatePercent,
  );
  appendMetricRow(
    rows,
    'engagement',
    'summary',
    'event_registrations_in_range',
    engagement.summary.eventRegistrationsInRange,
  );
  appendMetricRow(
    rows,
    'engagement',
    'summary',
    'event_cancellations_in_range',
    engagement.summary.eventCancellationsInRange,
  );
  appendMetricRow(
    rows,
    'engagement',
    'summary',
    'event_capacity_utilization_percent',
    engagement.summary.eventCapacityUtilizationPercent,
  );
  for (const event of engagement.topEvents) {
    appendMetricRow(
      rows,
      'engagement',
      'top_events',
      event.title,
      event.registeredCount,
    );
  }
}

function appendUsageCsvRows(rows: string[][], usage: UsagePayload) {
  appendMetricRow(
    rows,
    'usage',
    'summary',
    'users_total',
    usage.summary.usersTotal,
  );
  appendMetricRow(
    rows,
    'usage',
    'summary',
    'completed_profiles_total',
    usage.summary.completedProfilesTotal,
  );
  appendMetricRow(
    rows,
    'usage',
    'summary',
    'profile_completion_rate_percent',
    usage.summary.profileCompletionRatePercent,
  );
  appendMetricRow(
    rows,
    'usage',
    'summary',
    'inactive_7_days',
    usage.summary.inactive7Days,
  );
  appendMetricRow(
    rows,
    'usage',
    'summary',
    'inactive_30_days',
    usage.summary.inactive30Days,
  );
  appendMetricRow(
    rows,
    'usage',
    'summary',
    'series_points',
    usage.series.length,
  );
  appendUsageSeriesRows(rows, usage);
  appendUsageRoleRows(rows, usage);
}

function appendUsageSeriesRows(rows: string[][], usage: UsagePayload) {
  for (const point of usage.series) {
    appendMetricRow(
      rows,
      'usage',
      'daily',
      'users_created',
      point.usersCreated,
      point.date,
    );
    appendMetricRow(
      rows,
      'usage',
      'daily',
      'profiles_completed',
      point.profilesCompleted,
      point.date,
    );
    appendMetricRow(
      rows,
      'usage',
      'daily',
      'active_users',
      point.activeUsers,
      point.date,
    );
  }
}

function appendUsageRoleRows(rows: string[][], usage: UsagePayload) {
  for (const role of usage.roleBreakdown) {
    appendMetricRow(rows, 'usage', 'role_breakdown', role.role, role.count);
  }
  for (const role of usage.inactiveByRole) {
    appendMetricRow(rows, 'usage', 'inactive_by_role', role.role, role.count);
  }
}

function resolveRange(from?: string, to?: string): AnalyticsRange {
  const fromDate = from ? new Date(from) : new Date('1970-01-01T00:00:00.000Z');
  const toDate = to ? new Date(to) : new Date('9999-12-31T23:59:59.999Z');

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new BadRequestException('Invalid from/to date');
  }
  if (toDate <= fromDate) {
    throw new BadRequestException('to must be after from');
  }

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    fromDate,
    toDate,
  };
}

function toDate(value: unknown): Date | null {
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
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function isWithinRange(value: Date | null, range: AnalyticsRange) {
  if (!value) return false;
  return value >= range.fromDate && value < range.toDate;
}

function isInactiveForDays(value: Date | null, now: Date, days: number) {
  if (!value) return true;
  return now.getTime() - value.getTime() >= days * 24 * 60 * 60 * 1000;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function buildRoleBreakdown(roles: UserRoleEnum[]) {
  const totals = new Map<string, number>();
  for (const role of roles) {
    totals.set(role, (totals.get(role) ?? 0) + 1);
  }
  const roleRows = [...totals.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);
  return [{ role: 'total', count: roles.length }, ...roleRows];
}

function ensureUsageDay(
  byDay: Map<
    string,
    {
      date: string;
      usersCreated: number;
      profilesCompleted: number;
      activeUsers: number;
    }
  >,
  date: string,
) {
  const entry = byDay.get(date) ?? {
    date,
    usersCreated: 0,
    profilesCompleted: 0,
    activeUsers: 0,
  };
  byDay.set(date, entry);
  return entry;
}

function getUserActivityDate(user: {
  createdAt?: unknown;
  lastActiveAt?: unknown;
  lastLoginAt?: unknown;
  lastSeenAt?: unknown;
  updatedAt?: unknown;
  profileUpdatedAt?: unknown;
}) {
  return (
    toDate(user.lastActiveAt) ??
    toDate(user.lastLoginAt) ??
    toDate(user.lastSeenAt) ??
    toDate(user.updatedAt) ??
    toDate(user.profileUpdatedAt) ??
    toDate(user.createdAt)
  );
}

function toCsvRow(row: string[]) {
  return row
    .map((value) => {
      if (!/[",\n\r]/.test(value)) return value;
      return `"${value.replaceAll('"', '""')}"`;
    })
    .join(',');
}

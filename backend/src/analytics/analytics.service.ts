import { BadRequestException, Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersRepository } from '../users/users.repository';
import { SchedulingRepository } from '../scheduling/scheduling.repository';
import { CareerInterviewsRepository } from '../career-interviews/career-interviews.repository';
import { ConnectionsRepository } from '../connections/connections.repository';
import type { UserRoleEnum } from '../common/enums/roles.enum';

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
  series: Array<{
    date: string;
    usersCreated: number;
    profilesCompleted: number;
  }>;
  roleBreakdown: Array<{ role: string; count: number }>;
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
    acceptedConnectionsTotal: number;
    notificationsInRange: number;
    unreadNotificationsInRange: number;
    readRatePercent: number;
    acceptedInterviewInvites: number;
    rejectedInterviewInvites: number;
    inviteDecisionCount: number;
  };
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

    const byDay = new Map<
      string,
      { date: string; usersCreated: number; profilesCompleted: number }
    >();
    for (const user of usersInRange) {
      const createdAt = toDate(user.createdAt);
      if (!createdAt) continue;
      const date = createdAt.toISOString().slice(0, 10);
      const entry = byDay.get(date) ?? {
        date,
        usersCreated: 0,
        profilesCompleted: 0,
      };
      entry.usersCreated += 1;
      if (user.profileStatus === 'complete') entry.profilesCompleted += 1;
      byDay.set(date, entry);
    }

    const payload: UsagePayload = {
      range,
      generatedAt: new Date().toISOString(),
      metricsVersion: 'v1',
      series: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
      roleBreakdown: buildRoleBreakdown(usersInRange.map((user) => user.role)),
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
    const [connections, notificationsSnapshot, interviews] = await Promise.all([
      this.connectionsRepository.listAccepted(5000),
      db.collection('notifications').limit(5000).get(),
      this.careerInterviewsRepository.list(),
    ]);

    const notifications = notificationsSnapshot.docs.map((doc) =>
      doc.data(),
    ) as Array<{
      createdAt?: unknown;
      read?: boolean;
      archived?: boolean;
    }>;

    const notificationsInRange = notifications.filter((notification) =>
      isWithinRange(toDate(notification.createdAt), range),
    );
    const unreadNotifications = notificationsInRange.filter(
      (notification) => !notification.read && !notification.archived,
    ).length;

    const acceptedInvites = interviews.filter(
      (interview) =>
        interview.invitationStatus === 'accepted' &&
        isWithinRange(toDate(interview.invitationRespondedAt), range),
    ).length;
    const rejectedInvites = interviews.filter(
      (interview) =>
        interview.invitationStatus === 'rejected' &&
        isWithinRange(toDate(interview.invitationRespondedAt), range),
    ).length;

    const payload: EngagementPayload = {
      range,
      generatedAt: new Date().toISOString(),
      metricsVersion: 'v1',
      summary: {
        acceptedConnectionsTotal: connections.length,
        notificationsInRange: notificationsInRange.length,
        unreadNotificationsInRange: unreadNotifications,
        readRatePercent: notificationsInRange.length
          ? round2(
              ((notificationsInRange.length - unreadNotifications) /
                notificationsInRange.length) *
                100,
            )
          : 0,
        acceptedInterviewInvites: acceptedInvites,
        rejectedInterviewInvites: rejectedInvites,
        inviteDecisionCount: acceptedInvites + rejectedInvites,
      },
      notes: [
        'Connection engagement by user is available in /connections endpoints; admin engagement summary focuses on notifications and invite responses.',
      ],
    };
    this.writeCache(cacheKey, payload);
    return payload;
  }

  async getReportJson(
    from?: string,
    to?: string,
    section: 'all' | 'overview' | 'usage' | 'matching' | 'engagement' = 'all',
  ): Promise<Record<string, unknown>> {
    const [overview, usage, matching, engagement] = await Promise.all([
      this.getOverview(from, to),
      this.getUsageTrend(from, to),
      this.getMatchingPerformance(from, to),
      this.getEngagement(from, to),
    ]);

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        metricsVersion: 'v1',
        section,
      },
      overview,
      usage,
      matching,
      engagement,
    };
    if (section === 'all') return report;
    return {
      metadata: report.metadata,
      [section]: report[section],
    };
  }

  async getReportCsv(
    from?: string,
    to?: string,
    section: 'all' | 'overview' | 'usage' | 'matching' | 'engagement' = 'all',
  ) {
    const [overview, usage, matching, engagement] = await Promise.all([
      this.getOverview(from, to),
      this.getUsageTrend(from, to),
      this.getMatchingPerformance(from, to),
      this.getEngagement(from, to),
    ]);

    const rows: string[] = ['section,metric,value'];

    if (section === 'all' || section === 'overview') {
      rows.push(`overview,users_total,${overview.summary.usersTotal}`);
      rows.push(
        `overview,users_created_in_range,${overview.summary.usersCreatedInRange}`,
      );
      rows.push(
        `overview,profile_completion_rate_percent,${overview.summary.profileCompletionRatePercent}`,
      );
      rows.push(
        `overview,confirmed_meetings,${overview.summary.confirmedMeetings}`,
      );
      rows.push(
        `overview,confirmed_career_interviews,${overview.summary.confirmedCareerInterviews}`,
      );
      rows.push(
        `overview,accepted_connections_total,${overview.summary.acceptedConnectionsTotal}`,
      );
    }

    if (section === 'all' || section === 'matching') {
      rows.push(
        `matching,accepted_connections_in_range,${matching.summary.acceptedConnectionsInRange}`,
      );
      rows.push(
        `matching,meeting_conversions,${matching.summary.meetingConversions}`,
      );
      rows.push(
        `matching,interview_conversions,${matching.summary.interviewConversions}`,
      );
      rows.push(
        `matching,conversion_rate_percent,${matching.summary.connectionToConversionRatePercent}`,
      );
    }

    if (section === 'all' || section === 'engagement') {
      rows.push(
        `engagement,accepted_connections_total,${engagement.summary.acceptedConnectionsTotal}`,
      );
      rows.push(
        `engagement,notifications_in_range,${engagement.summary.notificationsInRange}`,
      );
      rows.push(
        `engagement,unread_notifications_in_range,${engagement.summary.unreadNotificationsInRange}`,
      );
      rows.push(
        `engagement,read_rate_percent,${engagement.summary.readRatePercent}`,
      );
      rows.push(
        `engagement,accepted_interview_invites,${engagement.summary.acceptedInterviewInvites}`,
      );
      rows.push(
        `engagement,rejected_interview_invites,${engagement.summary.rejectedInterviewInvites}`,
      );
    }

    if (section === 'all' || section === 'usage') {
      rows.push(`usage,series_points,${usage.series.length}`);
      for (const point of usage.series) {
        rows.push(
          `usage_daily,${point.date}_users_created,${point.usersCreated}`,
        );
        rows.push(
          `usage_daily,${point.date}_profiles_completed,${point.profilesCompleted}`,
        );
      }
    }

    return `${rows.join('\n')}\n`;
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

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function buildRoleBreakdown(roles: UserRoleEnum[]) {
  const totals = new Map<string, number>();
  for (const role of roles) {
    totals.set(role, (totals.get(role) ?? 0) + 1);
  }
  return [...totals.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);
}

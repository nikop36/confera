'use client';

import Link from 'next/link';
import { useT } from '../../lib/i18n';

export default function AdminStatisticsOverviewPage() {
  const t = useT();
  const SECTIONS = [
    {
      title: t('admin.nav.stats.overview', 'Overview'),
      description: t('admin.stats.overview.desc', 'Unified view of all statistics modules.'),
      details: t('admin.stats.overview.overviewDetails', 'Entry point for all admin statistics areas.'),
      href: '/admin/statistics',
    },
    {
      title: t('admin.nav.stats.operations', 'Operations'),
      description: t('admin.stats.operations.desc', 'Room occupancy, confirmed meetings, interview invites, and schedule volume.'),
      details: t('admin.stats.overview.operationsDetails', 'Meetings, interviews, rooms, capacity, and time-slot usage.'),
      href: '/admin/statistics/operations',
    },
    {
      title: t('admin.nav.stats.usage', 'Usage'),
      description: t('admin.stats.usage.desc', 'Registration and completed profile trends.'),
      details: t('admin.stats.overview.usageDetails', 'User growth, active users, profile completion, and role distribution.'),
      href: '/admin/statistics/usage',
    },
    {
      title: t('admin.nav.stats.matching', 'Matching'),
      description: t('admin.stats.matching.desc', 'Conversions from connections to meetings and interviews.'),
      details: t('admin.stats.overview.matchingDetails', 'Accepted connections and conversion outcomes from matching workflows.'),
      href: '/admin/statistics/matching',
    },
    {
      title: t('admin.nav.stats.engagement', 'Engagement'),
      description: t('admin.stats.engagement.desc', 'Notifications, read-rate, and invite response metrics.'),
      details: t('admin.stats.overview.engagementDetails', 'Notification reading, event registrations, cancellations, and capacity usage.'),
      href: '/admin/statistics/engagement',
    },
    {
      title: t('admin.nav.stats.reports', 'Reports'),
      description: t('admin.stats.reports.desc', 'Export reports (JSON/CSV) for admin analysis.'),
      details: t('admin.stats.overview.reportsDetails', 'Download structured analytics data for external reporting.'),
      href: '/admin/statistics/reports',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[32px] font-bold tracking-tight">{t('admin.stats.title', 'Statistics')}</h1>
        <p className="text-sm text-[#8e8e93] mt-1">
          {t('admin.stats.overview.subtitle', 'Unified view for operational statistics and analytics.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-[12px] border border-[#ececec] bg-white p-4 no-underline hover:bg-[#fafafa] transition-colors"
          >
            <h2 className="text-[18px] font-semibold text-[#111827]">{section.title}</h2>
            <p className="mt-2 text-sm text-[#6b7280]">{section.description}</p>
            <p className="mt-4 text-xs leading-relaxed text-[#9ca3af]">{section.details}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

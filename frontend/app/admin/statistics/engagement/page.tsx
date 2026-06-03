'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../../lib/auth';
import { useT } from '../../../lib/i18n';
import { StatisticsRangeFilter } from '../range-filter';
import { datesForPreset, toIsoRange, type RangePreset } from '../range';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type EngagementPayload = {
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
};

export default function AdminStatisticsEngagementPage() {
  const t = useT();
  const user = useStoredUser();
  const [payload, setPayload] = useState<EngagementPayload | null>(null);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState<RangePreset>('30d');
  const initialDates = datesForPreset('30d');
  const [from, setFrom] = useState(initialDates.from);
  const [to, setTo] = useState(initialDates.to);

  const range = useMemo(() => toIsoRange(from, to), [from, to]);

  function applyPreset(nextPreset: RangePreset) {
    setPreset(nextPreset);
    const dates = datesForPreset(nextPreset);
    setFrom(dates.from);
    setTo(dates.to);
  }

  useEffect(() => {
    if (!user?.idToken) return;
    const idToken = user.idToken;
    const controller = new AbortController();
    async function load() {
      setError('');
      const url = new URL(`${API}/analytics/engagement`);
      if (range.from) url.searchParams.set('from', range.from);
      if (range.to) url.searchParams.set('to', range.to);
      try {
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(t('admin.stats.engagement.errorLoad', 'Failed to load engagement statistics'));
          return;
        }
        setPayload((await response.json()) as EngagementPayload);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : t('admin.stats.engagement.errorLoad', 'Failed to load engagement statistics'));
      }
    }
    void load();
    return () => controller.abort();
  }, [range.from, range.to, t, user?.idToken]);

  const summary = payload?.summary;
  return (
    <div>
      <h1 className="text-[32px] font-bold tracking-tight">{t('admin.nav.stats.engagement', 'Engagement')}</h1>
      <p className="text-sm text-[#8e8e93] mt-1 mb-5">
        {t('admin.stats.engagement.subtitle', 'User activity through notifications and event participation.')}
      </p>
      <StatisticsRangeFilter
        preset={preset}
        from={from}
        to={to}
        onPresetChange={applyPreset}
        onFromChange={setFrom}
        onToChange={setTo}
      />
      {error && <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">{error}</div>}
      <SectionHeader
        title={t('admin.stats.engagement.notificationsSection', 'Notifications')}
        description={t(
          'admin.stats.engagement.notificationsSectionDesc',
          'Message volume and read status for the selected period.',
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card
          label={t('admin.stats.engagement.notifications', 'Notifications')}
          value={summary?.notificationsInRange ?? 0}
          description={t('admin.stats.engagement.notificationsDesc', 'Notifications created in the selected period.')}
        />
        <Card
          label={t('admin.stats.engagement.unreadNotifications', 'Unread notifications')}
          value={summary?.unreadNotificationsInRange ?? 0}
          description={t('admin.stats.engagement.unreadNotificationsDesc', 'Notifications that have not been opened yet.')}
        />
        <Card
          label={t('admin.stats.engagement.readRate', 'Read rate')}
          value={`${summary?.readRatePercent ?? 0}%`}
          description={t('admin.stats.engagement.readRateDesc', 'Share of notifications marked as read.')}
        />
      </div>
      <section className="mt-5 rounded-[12px] border border-[#ececec] bg-white p-4">
        <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.engagement.readVsUnread', 'Read vs Unread')}</h2>
        <p className="text-xs text-[#8e8e93] mb-3">
          {t('admin.stats.engagement.readVsUnreadDesc', 'Shows how many notifications in the selected period were read or remain unread.')}
        </p>
        <ReadUnreadChart
          total={summary?.notificationsInRange ?? 0}
          unread={summary?.unreadNotificationsInRange ?? 0}
        />
      </section>

      <SectionHeader
        title={t('admin.stats.engagement.eventsSection', 'Events')}
        description={t(
          'admin.stats.engagement.eventsSectionDesc',
          'Event registrations, cancellations, capacity usage, and popularity.',
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card
          label={t('admin.stats.engagement.eventRegistrations', 'Event registrations')}
          value={summary?.eventRegistrationsInRange ?? 0}
          description={t('admin.stats.engagement.eventRegistrationsDesc', 'Event registrations created in the selected period.')}
        />
        <Card
          label={t('admin.stats.engagement.eventCancellations', 'Event cancellations')}
          value={summary?.eventCancellationsInRange ?? 0}
          description={t('admin.stats.engagement.eventCancellationsDesc', 'Event cancellation actions in the selected period.')}
        />
        <Card
          label={t('admin.stats.engagement.activeEvents', 'Active events')}
          value={summary?.activeEventsInRange ?? 0}
          description={t('admin.stats.engagement.activeEventsDesc', 'Events that overlap the selected period.')}
        />
        <Card
          label={t('admin.stats.engagement.eventCapacityUtilization', 'Event capacity usage')}
          value={`${summary?.eventCapacityUtilizationPercent ?? 0}%`}
          description={t('admin.stats.engagement.eventCapacityUtilizationDesc', 'Share of available seats filled across active events.')}
        />
      </div>
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-[12px] border border-[#ececec] bg-white p-5">
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.engagement.eventActivity', 'Event Activity')}</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t('admin.stats.engagement.eventActivityDesc', 'Compares registrations, cancellations, and active events in the selected period.')}
          </p>
          <EventActivityChart summary={summary} />
        </section>
        <section className="rounded-[12px] border border-[#ececec] bg-white p-5">
          <h2 className="text-[16px] font-semibold mb-1">
            {t('admin.stats.engagement.eventCapacityVsFilled', 'Event Capacity vs Filled')}
          </h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t(
              'admin.stats.engagement.eventCapacityVsFilledDesc',
              'Compares total capacity with currently filled seats for the most registered events.',
            )}
          </p>
          <EventCapacityFilledChart events={payload?.topEvents ?? []} />
        </section>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 mb-3">
      <h2 className="text-[18px] font-semibold">{title}</h2>
      <p className="text-xs text-[#8e8e93] mt-1">{description}</p>
    </div>
  );
}

function Card({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <section className="rounded-[10px] border border-[#ececec] bg-white px-4 py-3">
      <p className="text-[12px] text-[#8e8e93]">{label}</p>
      <p className="text-[26px] font-bold mt-1">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-[#9ca3af]">{description}</p>
    </section>
  );
}

function ReadUnreadChart({ total, unread }: { total: number; unread: number }) {
  const t = useT();
  const read = Math.max(0, total - unread);
  const safeTotal = Math.max(1, total);
  const readPct = Math.round((read / safeTotal) * 100);
  const unreadPct = Math.round((unread / safeTotal) * 100);
  return (
    <div>
      <div className="h-4 rounded-full bg-[#eef2f7] overflow-hidden">
        <div className="h-full bg-[#111827] float-left" style={{ width: `${readPct}%` }} />
        <div className="h-full bg-[#93c5fd] float-left" style={{ width: `${unreadPct}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-[8px] border border-[#f1f5f9] p-2">
          <p className="text-[#6b7280]">{t('admin.stats.engagement.read', 'Read')}</p>
          <p className="font-semibold">{read}</p>
        </div>
        <div className="rounded-[8px] border border-[#f1f5f9] p-2">
          <p className="text-[#6b7280]">{t('admin.stats.engagement.unread', 'Unread')}</p>
          <p className="font-semibold">{unread}</p>
        </div>
      </div>
    </div>
  );
}

function EventActivityChart({
  summary,
}: {
  summary: EngagementPayload['summary'] | undefined;
}) {
  const t = useT();
  const bars = [
    {
      label: t('admin.stats.engagement.registrations', 'Registrations'),
      value: summary?.eventRegistrationsInRange ?? 0,
      color: '#2563eb',
    },
    {
      label: t('admin.stats.engagement.cancellations', 'Cancellations'),
      value: summary?.eventCancellationsInRange ?? 0,
      color: '#ef4444',
    },
    {
      label: t('admin.stats.engagement.activeEventsShort', 'Active events'),
      value: summary?.activeEventsInRange ?? 0,
      color: '#10b981',
    },
  ];

  if (bars.every((bar) => bar.value === 0)) {
    return <p className="text-sm text-[#8e8e93]">{t('admin.stats.noDataPeriod', 'No data for the selected period.')}</p>;
  }

  return (
    <SimpleBarChart
      bars={bars}
      yLabel={t('admin.chart.axis.count', 'Count')}
      xLabel={t('admin.stats.engagement.metric', 'Metric')}
    />
  );
}

function EventCapacityFilledChart({
  events,
}: {
  events: EngagementPayload['topEvents'];
}) {
  const t = useT();
  if (events.length === 0) {
    return <p className="text-sm text-[#8e8e93]">{t('admin.stats.noDataPeriod', 'No data for the selected period.')}</p>;
  }

  return (
    <GroupedBarChart
      groups={events.map((event) => ({
        label: event.title,
        bars: [
          {
            label: t('admin.stats.engagement.capacity', 'Capacity'),
            value: event.capacity,
            color: '#cbd5e1',
          },
          {
            label: t('admin.stats.engagement.filledSeats', 'Filled'),
            value: event.registeredCount,
            color: '#2563eb',
          },
        ],
      }))}
      yLabel={t('admin.chart.axis.count', 'Count')}
      xLabel={t('admin.stats.engagement.event', 'Event')}
    />
  );
}

function GroupedBarChart({
  groups,
  yLabel,
  xLabel,
}: {
  groups: Array<{
    label: string;
    bars: Array<{ label: string; value: number; color: string }>;
  }>;
  yLabel: string;
  xLabel: string;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    series: string;
    value: number;
  } | null>(null);
  const width = 560;
  const height = 300;
  const padding = { top: 20, right: 16, bottom: 58, left: 42 };
  const rawMax = Math.max(
    1,
    ...groups.flatMap((group) => group.bars.map((bar) => bar.value)),
  );
  const max = rawMax <= 5 ? 5 : Math.ceil(rawMax / 5) * 5;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const groupWidth = plotWidth / Math.max(1, groups.length);
  const innerGap = 4;
  const barWidth = Math.max(
    10,
    Math.min(28, (groupWidth - 28) / Math.max(1, groups[0]?.bars.length ?? 1)),
  );
  const yTicks = 5;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[420px] h-[260px]">
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="#d1d5db" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#d1d5db" />
        {Array.from({ length: yTicks + 1 }, (_, index) => index).map((tick) => {
          const step = tick / yTicks;
          const y = padding.top + (1 - step) * plotHeight;
          const value = Math.round(step * max);
          return (
            <g key={tick}>
              <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke="#e8edf3" />
              <text x={12} y={y + 4} fontSize={11} fill="#94a3b8">
                {value}
              </text>
            </g>
          );
        })}
        <text x={12} y={14} fontSize={10} fill="#6b7280">{yLabel}</text>
        <text x={width - 60} y={height - 8} fontSize={10} fill="#6b7280">{xLabel}</text>
        {groups.map((group, groupIndex) => {
          const totalBarsWidth = group.bars.length * barWidth + (group.bars.length - 1) * innerGap;
          const groupX = padding.left + groupIndex * groupWidth + (groupWidth - totalBarsWidth) / 2;
          return (
            <g key={group.label}>
              {group.bars.map((bar, barIndex) => {
                const x = groupX + barIndex * (barWidth + innerGap);
                const h = (bar.value / max) * plotHeight;
                const y = padding.top + plotHeight - h;
                return (
                  <rect
                    key={bar.label}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={h}
                    rx={4}
                    fill={bar.color}
                    onMouseMove={(event) =>
                      setTooltip({
                        x: event.clientX,
                        y: event.clientY,
                        label: group.label,
                        series: bar.label,
                        value: bar.value,
                      })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
              <text x={padding.left + groupIndex * groupWidth + groupWidth / 2} y={height - 32} textAnchor="middle" fontSize={10} fill="#64748b">
                {group.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#64748b]">
        {groups[0]?.bars.map((bar) => (
          <span key={bar.label} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bar.color }} />
            {bar.label}
          </span>
        ))}
      </div>
      {tooltip && (
        <div className="fixed z-20 rounded-[8px] border border-[#e5e7eb] bg-white px-2 py-1 text-xs shadow" style={{ left: tooltip.x + 10, top: tooltip.y - 42 }}>
          {tooltip.label}<br />
          {tooltip.series}: {tooltip.value}
        </div>
      )}
    </div>
  );
}

function SimpleBarChart({
  bars,
  yLabel,
  xLabel,
  maxValue,
}: {
  bars: Array<{ label: string; value: number; color: string }>;
  yLabel: string;
  xLabel: string;
  maxValue?: number;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const width = 500;
  const height = 290;
  const padding = { top: 20, right: 16, bottom: 48, left: 42 };
  const rawMax = Math.max(1, ...bars.map((bar) => bar.value));
  const max = maxValue ?? (rawMax <= 5 ? 5 : Math.ceil(rawMax / 5) * 5);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barWidth = Math.max(50, plotWidth / Math.max(1, bars.length) - 30);
  const yTicks = 5;
  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[360px] h-[250px]">
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="#d1d5db" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#d1d5db" />
        {Array.from({ length: yTicks + 1 }, (_, index) => index).map((tick) => {
          const step = tick / yTicks;
          const y = padding.top + (1 - step) * plotHeight;
          const value = Math.round(step * max);
          return (
            <g key={tick}>
              <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke="#e8edf3" />
              <text x={12} y={y + 4} fontSize={11} fill="#94a3b8">
                {value}
              </text>
            </g>
          );
        })}
        <text x={12} y={14} fontSize={10} fill="#6b7280">{yLabel}</text>
        <text x={width - 60} y={height - 8} fontSize={10} fill="#6b7280">{xLabel}</text>
        {bars.map((bar, index) => {
          const x = padding.left + index * (plotWidth / bars.length) + 15;
          const h = (bar.value / max) * plotHeight;
          const y = padding.top + plotHeight - h;
          return (
            <g key={bar.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={4}
                fill={bar.color}
                onMouseMove={(event) =>
                  setTooltip({ x: event.clientX, y: event.clientY, label: bar.label, value: bar.value })
                }
                onMouseLeave={() => setTooltip(null)}
              />
              <text x={x + barWidth / 2} y={height - 24} textAnchor="middle" fontSize={10} fill="#64748b">
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
      {tooltip && (
        <div className="fixed z-20 rounded-[8px] border border-[#e5e7eb] bg-white px-2 py-1 text-xs shadow" style={{ left: tooltip.x + 10, top: tooltip.y - 36 }}>
          {tooltip.label}: {tooltip.value}
        </div>
      )}
    </div>
  );
}

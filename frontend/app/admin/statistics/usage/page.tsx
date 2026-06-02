'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../../lib/auth';
import { useT } from '../../../lib/i18n';
import { StatisticsRangeFilter } from '../range-filter';
import { datesForPreset, toIsoRange, type RangePreset } from '../range';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type UsagePayload = {
  series: Array<{
    date: string;
    usersCreated: number;
    profilesCompleted: number;
    activeUsers: number;
  }>;
  roleBreakdown: Array<{ role: string; count: number }>;
};

export default function AdminStatisticsUsagePage() {
  const t = useT();
  const user = useStoredUser();
  const [payload, setPayload] = useState<UsagePayload | null>(null);
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
      const url = new URL(`${API}/analytics/usage-trend`);
      if (range.from) url.searchParams.set('from', range.from);
      if (range.to) url.searchParams.set('to', range.to);
      try {
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(t('admin.stats.usage.errorLoad', 'Failed to load usage statistics'));
          return;
        }
        setPayload((await response.json()) as UsagePayload);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : t('admin.stats.usage.errorLoad', 'Failed to load usage statistics'));
      }
    }
    void load();
    return () => controller.abort();
  }, [range.from, range.to, t, user?.idToken]);

  return (
    <div>
      <h1 className="text-[32px] font-bold tracking-tight">{t('admin.nav.stats.usage', 'Usage')}</h1>
      <p className="text-sm text-[#8e8e93] mt-1 mb-5">
        {t('admin.stats.usage.subtitle', 'Daily trend of registrations and completed profiles.')}
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-[12px] border border-[#ececec] bg-white p-4">
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.usage.dailyTrend', 'Daily Trend')}</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t('admin.stats.usage.dailyTrendDesc', 'Shows daily new user registrations and completed profiles in the selected period.')}
          </p>
          <UsageLineChart series={(payload?.series ?? []).slice(-14)} />
        </section>
        <section className="rounded-[12px] border border-[#ececec] bg-white p-4">
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.usage.activeUsers', 'Active Users')}</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t('admin.stats.usage.activeUsersDesc', 'Shows users with recorded activity in the selected period.')}
          </p>
          <ActiveUsersLineChart series={(payload?.series ?? []).slice(-14)} />
        </section>
        <section className="rounded-[12px] border border-[#ececec] bg-white p-4">
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.usage.roleBreakdown', 'Role Breakdown')}</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t('admin.stats.usage.roleBreakdownDesc', 'Compares how many users currently belong to each application role.')}
          </p>
          <RoleBarChart roles={payload?.roleBreakdown ?? []} />
        </section>
      </div>
    </div>
  );
}

function UsageLineChart({
  series,
}: {
  series: Array<{
    date: string;
    usersCreated: number;
    profilesCompleted: number;
    activeUsers: number;
  }>;
}) {
  const t = useT();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    users: number;
    profiles: number;
  } | null>(null);
  if (series.length === 0) {
    return <p className="text-sm text-[#8e8e93]">{t('admin.stats.noDataPeriod', 'No data for the selected period.')}</p>;
  }

  const width = 680;
  const height = 260;
  const padding = { top: 20, right: 16, bottom: 44, left: 42 };
  const rawMaxValue = Math.max(
    1,
    ...series.flatMap((item) => [item.usersCreated, item.profilesCompleted]),
  );
  const maxValue = rawMaxValue <= 5 ? 5 : Math.ceil(rawMaxValue / 5) * 5;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const yTicks = 5;
  const points = series.map((item, index) => {
    const x =
      padding.left +
      (series.length > 1 ? (index / (series.length - 1)) * plotWidth : plotWidth / 2);
    const toY = (value: number) => padding.top + (1 - value / maxValue) * plotHeight;
    return {
      x,
      usersY: toY(item.usersCreated),
      profilesY: toY(item.profilesCompleted),
      date: item.date,
      users: item.usersCreated,
      profiles: item.profilesCompleted,
    };
  });
  const toPath = (key: 'usersY' | 'profilesY') =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point[key]}`).join(' ');

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[430px] h-[220px]">
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="#d1d5db" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#d1d5db" />
        {Array.from({ length: yTicks + 1 }, (_, index) => index).map((tick) => {
          const step = tick / yTicks;
          const y = padding.top + (1 - step) * plotHeight;
          const value = Math.round(step * maxValue);
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="#e8edf3"
              />
              <text x={10} y={y + 4} fontSize={11} fill="#94a3b8">
                {value}
              </text>
            </g>
          );
        })}
        <path d={toPath('usersY')} fill="none" stroke="#111827" strokeWidth={2.2} />
        <path d={toPath('profilesY')} fill="none" stroke="#2563eb" strokeWidth={2.2} />
        <text x={12} y={14} fontSize={10} fill="#6b7280">{t('admin.chart.axis.count', 'Count')}</text>
        <text x={width - 46} y={height - 8} fontSize={10} fill="#6b7280">{t('admin.chart.axis.date', 'Date')}</text>
        {points.map((point, index) => (
          <g key={point.date}>
            <circle
              cx={point.x}
              cy={point.usersY}
              r={3}
              fill="#111827"
              onMouseMove={(event) =>
                setTooltip({
                  x: event.clientX,
                  y: event.clientY,
                  label: point.date,
                  users: point.users,
                  profiles: point.profiles,
                })
              }
              onMouseLeave={() => setTooltip(null)}
            />
            <circle
              cx={point.x}
              cy={point.profilesY}
              r={3}
              fill="#2563eb"
              onMouseMove={(event) =>
                setTooltip({
                  x: event.clientX,
                  y: event.clientY,
                  label: point.date,
                  users: point.users,
                  profiles: point.profiles,
                })
              }
              onMouseLeave={() => setTooltip(null)}
            />
            {index % 2 === 0 && (
              <text x={point.x} y={height - 20} textAnchor="middle" fontSize={10} fill="#64748b">
                {point.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {tooltip && (
        <div
          className="fixed z-20 rounded-[8px] border border-[#e5e7eb] bg-white px-2 py-1 text-xs shadow"
          style={{ left: tooltip.x + 10, top: tooltip.y - 40 }}
        >
          <div>{tooltip.label}</div>
          <div>{t('admin.stats.usage.registrations', 'Registrations')}: {tooltip.users}</div>
          <div>{t('admin.stats.usage.completedProfiles', 'Completed profiles')}: {tooltip.profiles}</div>
        </div>
      )}
      <div className="mt-2 flex gap-4 text-xs text-[#6b7280]">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#111827]" /> {t('admin.stats.usage.registrations', 'Registrations')}</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2563eb]" /> {t('admin.stats.usage.completedProfiles', 'Completed profiles')}</span>
      </div>
    </div>
  );
}

function ActiveUsersLineChart({
  series,
}: {
  series: Array<{
    date: string;
    activeUsers: number;
  }>;
}) {
  const t = useT();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    activeUsers: number;
  } | null>(null);
  if (series.length === 0) {
    return <p className="text-sm text-[#8e8e93]">{t('admin.stats.noDataPeriod', 'No data for the selected period.')}</p>;
  }

  const width = 680;
  const height = 260;
  const padding = { top: 20, right: 16, bottom: 44, left: 42 };
  const rawMaxValue = Math.max(1, ...series.map((item) => item.activeUsers));
  const maxValue = rawMaxValue <= 5 ? 5 : Math.ceil(rawMaxValue / 5) * 5;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const yTicks = 5;
  const points = series.map((item, index) => {
    const x =
      padding.left +
      (series.length > 1 ? (index / (series.length - 1)) * plotWidth : plotWidth / 2);
    const y = padding.top + (1 - item.activeUsers / maxValue) * plotHeight;
    return {
      x,
      y,
      date: item.date,
      activeUsers: item.activeUsers,
    };
  });
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[430px] h-[220px]">
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="#d1d5db" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#d1d5db" />
        {Array.from({ length: yTicks + 1 }, (_, index) => index).map((tick) => {
          const step = tick / yTicks;
          const y = padding.top + (1 - step) * plotHeight;
          const value = Math.round(step * maxValue);
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="#e8edf3"
              />
              <text x={10} y={y + 4} fontSize={11} fill="#94a3b8">
                {value}
              </text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="#16a34a" strokeWidth={2.2} />
        <text x={12} y={14} fontSize={10} fill="#6b7280">{t('admin.chart.axis.count', 'Count')}</text>
        <text x={width - 46} y={height - 8} fontSize={10} fill="#6b7280">{t('admin.chart.axis.date', 'Date')}</text>
        {points.map((point, index) => (
          <g key={point.date}>
            <circle
              cx={point.x}
              cy={point.y}
              r={3}
              fill="#16a34a"
              onMouseMove={(event) =>
                setTooltip({
                  x: event.clientX,
                  y: event.clientY,
                  label: point.date,
                  activeUsers: point.activeUsers,
                })
              }
              onMouseLeave={() => setTooltip(null)}
            />
            {index % 2 === 0 && (
              <text x={point.x} y={height - 20} textAnchor="middle" fontSize={10} fill="#64748b">
                {point.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {tooltip && (
        <div
          className="fixed z-20 rounded-[8px] border border-[#e5e7eb] bg-white px-2 py-1 text-xs shadow"
          style={{ left: tooltip.x + 10, top: tooltip.y - 36 }}
        >
          <div>{tooltip.label}</div>
          <div>{t('admin.stats.usage.activeUsers', 'Active Users')}: {tooltip.activeUsers}</div>
        </div>
      )}
      <div className="mt-2 flex gap-4 text-xs text-[#6b7280]">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#16a34a]" /> {t('admin.stats.usage.activeUsers', 'Active Users')}</span>
      </div>
    </div>
  );
}

function RoleBarChart({ roles }: { roles: Array<{ role: string; count: number }> }) {
  const t = useT();
  if (roles.length === 0) {
    return <p className="text-sm text-[#8e8e93]">{t('admin.stats.usage.noRoles', 'No role data available.')}</p>;
  }
  const max = Math.max(1, ...roles.map((item) => item.count));
  return (
    <div className="space-y-2">
      {roles.map((item) => (
        <div key={item.role}>
          <div className="mb-1 flex items-center justify-between text-xs text-[#6b7280]">
            <span>{roleLabel(item.role, t)}</span>
            <span>{item.count}</span>
          </div>
          <div className="h-2 rounded-full bg-[#eef2f7]">
            <div className="h-2 rounded-full bg-[#111827]" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function roleLabel(role: string, t: ReturnType<typeof useT>) {
  if (role === 'total') return t('admin.stats.usage.totalUsers', 'Total users');
  return t(`role.${role.toLowerCase()}`, role);
}

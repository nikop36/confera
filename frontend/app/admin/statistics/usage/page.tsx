'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type UsagePayload = {
  series: Array<{
    date: string;
    usersCreated: number;
    profilesCompleted: number;
  }>;
  roleBreakdown: Array<{ role: string; count: number }>;
};

export default function AdminStatisticsUsagePage() {
  const user = useStoredUser();
  const [payload, setPayload] = useState<UsagePayload | null>(null);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [preset, setPreset] = useState<'all' | '7d' | '30d'>('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const range = useMemo(() => {
    const now = new Date();
    let baseFrom = '';
    let baseTo = '';
    if (preset === '7d') {
      baseFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      baseTo = now.toISOString();
    } else if (preset === '30d') {
      baseFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      baseTo = now.toISOString();
    }
    return {
      from: from ? new Date(`${from}T00:00:00`).toISOString() : baseFrom,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : baseTo,
    };
  }, [preset, from, to]);

  useEffect(() => {
    if (!user?.idToken) return;
    const idToken = user.idToken;
    async function load() {
      setError('');
      const url = new URL(`${API}/analytics/usage-trend`);
      if (range.from) url.searchParams.set('from', range.from);
      if (range.to) url.searchParams.set('to', range.to);
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        setError('Failed to load usage statistics');
        return;
      }
      setPayload((await response.json()) as UsagePayload);
    }
    void load();
  }, [range.from, range.to, refreshTick, user?.idToken]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="text-[32px] font-bold tracking-tight">Usage</h1>
      <p className="text-sm text-[#8e8e93] mt-1 mb-5">
        Dnevni trend registracij in dokončanih profilov.
      </p>
      <section className="rounded-[12px] border border-[#ececec] bg-white p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <PresetButton active={preset === 'all'} label="All" onClick={() => setPreset('all')} />
          <PresetButton active={preset === '7d'} label="Last 7d" onClick={() => setPreset('7d')} />
          <PresetButton active={preset === '30d'} label="Last 30d" onClick={() => setPreset('30d')} />
          <div className="ml-auto flex gap-2">
            <label className="text-xs text-[#6b7280]">From
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="ml-1 rounded-[8px] border border-[#d1d5db] px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs text-[#6b7280]">To
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="ml-1 rounded-[8px] border border-[#d1d5db] px-2 py-1.5 text-sm" />
            </label>
          </div>
        </div>
      </section>
      {error && <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-[12px] border border-[#ececec] bg-white p-4">
          <h2 className="text-[16px] font-semibold mb-3">Daily Trend</h2>
          <UsageLineChart series={(payload?.series ?? []).slice(-14)} />
        </section>
        <section className="rounded-[12px] border border-[#ececec] bg-white p-4">
          <h2 className="text-[16px] font-semibold mb-3">Role Breakdown</h2>
          <RoleBarChart roles={payload?.roleBreakdown ?? []} />
        </section>
      </div>
    </div>
  );
}

function UsageLineChart({
  series,
}: {
  series: Array<{ date: string; usersCreated: number; profilesCompleted: number }>;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    users: number;
    profiles: number;
  } | null>(null);
  if (series.length === 0) {
    return <p className="text-sm text-[#8e8e93]">Ni podatkov za izbrano obdobje.</p>;
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
        <text x={12} y={14} fontSize={10} fill="#6b7280">Število</text>
        <text x={width - 46} y={height - 8} fontSize={10} fill="#6b7280">Datum</text>
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
          <div>Registracije: {tooltip.users}</div>
          <div>Dokončani profili: {tooltip.profiles}</div>
        </div>
      )}
      <div className="mt-2 flex gap-4 text-xs text-[#6b7280]">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#111827]" /> Registracije</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2563eb]" /> Dokončani profili</span>
      </div>
    </div>
  );
}

function PresetButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[8px] px-3 py-1.5 text-sm border ${
        active
          ? 'bg-[#111827] text-white border-[#111827]'
          : 'bg-white text-[#374151] border-[#d1d5db] hover:bg-[#f9fafb]'
      }`}
    >
      {label}
    </button>
  );
}

function RoleBarChart({ roles }: { roles: Array<{ role: string; count: number }> }) {
  if (roles.length === 0) {
    return <p className="text-sm text-[#8e8e93]">Ni podatkov o vlogah.</p>;
  }
  const max = Math.max(1, ...roles.map((item) => item.count));
  return (
    <div className="space-y-2">
      {roles.map((item) => (
        <div key={item.role}>
          <div className="mb-1 flex items-center justify-between text-xs text-[#6b7280]">
            <span>{item.role}</span>
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

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../../lib/auth';
import { useT } from '../../../lib/i18n';
import { StatisticsRangeFilter } from '../range-filter';
import { datesForPreset, toIsoRange, type RangePreset } from '../range';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type MatchingPayload = {
  summary: {
    acceptedConnectionsInRange: number;
    meetingConversions: number;
    interviewConversions: number;
    totalConversions: number;
    connectionToConversionRatePercent: number;
  };
};

export default function AdminStatisticsMatchingPage() {
  const t = useT();
  const user = useStoredUser();
  const [payload, setPayload] = useState<MatchingPayload | null>(null);
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
      const url = new URL(`${API}/analytics/matching-performance`);
      if (range.from) url.searchParams.set('from', range.from);
      if (range.to) url.searchParams.set('to', range.to);
      try {
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          setError(t('admin.stats.matching.errorLoad', 'Failed to load matching statistics'));
          return;
        }
        setPayload((await response.json()) as MatchingPayload);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : t('admin.stats.matching.errorLoad', 'Failed to load matching statistics'));
      }
    }
    void load();
    return () => controller.abort();
  }, [range.from, range.to, t, user?.idToken]);

  const summary = payload?.summary;
  return (
    <div>
      <h1 className="text-[32px] font-bold tracking-tight">{t('admin.nav.stats.matching', 'Matching')}</h1>
      <p className="text-sm text-[#8e8e93] mt-1 mb-5">
        {t('admin.stats.matching.subtitle', 'Conversion efficiency from connections into meetings and interviews.')}
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card
          label={t('admin.stats.matching.acceptedConnections', 'Accepted connections')}
          value={summary?.acceptedConnectionsInRange ?? 0}
          description={t('admin.stats.matching.acceptedConnectionsDesc', 'Accepted connection requests in the selected period.')}
        />
        <Card
          label={t('admin.stats.matching.meetingConversions', 'Meeting conversions')}
          value={summary?.meetingConversions ?? 0}
          description={t('admin.stats.matching.meetingConversionsDesc', 'Meetings created from accepted connections.')}
        />
        <Card
          label={t('admin.stats.matching.interviewConversions', 'Interview conversions')}
          value={summary?.interviewConversions ?? 0}
          description={t('admin.stats.matching.interviewConversionsDesc', 'Career interviews created from accepted connections.')}
        />
        <Card
          label={t('admin.stats.matching.totalConversions', 'Total conversions')}
          value={summary?.totalConversions ?? 0}
          description={t('admin.stats.matching.totalConversionsDesc', 'Meetings and interviews combined.')}
        />
      </div>
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="rounded-[12px] border border-[#ececec] bg-white p-4">
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.matching.conversionMix', 'Conversion Mix')}</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t('admin.stats.matching.conversionMixDesc', 'Shows the share of meeting and interview conversions created from accepted connections.')}
          </p>
          <ConversionMixChart
            meetings={summary?.meetingConversions ?? 0}
            interviews={summary?.interviewConversions ?? 0}
          />
        </section>
        <section className="rounded-[12px] border border-[#ececec] bg-white p-4">
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.matching.conversionBars', 'Conversion Bars')}</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t('admin.stats.matching.conversionBarsDesc', 'Compares accepted connections, meeting conversions, interview conversions, and total conversions.')}
          </p>
          <SimpleBarChart
            bars={[
              { label: t('admin.stats.operations.accepted', 'Accepted'), value: summary?.acceptedConnectionsInRange ?? 0 },
              { label: t('admin.stats.operations.meetings', 'Meetings'), value: summary?.meetingConversions ?? 0 },
              { label: t('admin.stats.operations.interviews', 'Interviews'), value: summary?.interviewConversions ?? 0 },
              { label: t('admin.stats.operations.total', 'Total'), value: summary?.totalConversions ?? 0 },
            ]}
            yLabel={t('admin.chart.axis.count', 'Count')}
            xLabel={t('admin.stats.matching.metric', 'Metric')}
          />
        </section>
      </div>
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

function ConversionMixChart({
  meetings,
  interviews,
}: {
  meetings: number;
  interviews: number;
}) {
  const t = useT();
  const total = Math.max(1, meetings + interviews);
  const meetingsWidth = (meetings / total) * 100;
  const interviewsWidth = (interviews / total) * 100;
  return (
    <div>
      <div className="h-4 w-full rounded-full overflow-hidden bg-[#eef2f7]">
        <div className="h-full bg-[#111827] float-left" style={{ width: `${meetingsWidth}%` }} />
        <div className="h-full bg-[#2563eb] float-left" style={{ width: `${interviewsWidth}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-[8px] border border-[#f1f5f9] p-2">
          <p className="text-[#6b7280]">{t('admin.stats.operations.meetings', 'Meetings')}</p>
          <p className="font-semibold">{meetings}</p>
        </div>
        <div className="rounded-[8px] border border-[#f1f5f9] p-2">
          <p className="text-[#6b7280]">{t('admin.stats.operations.interviews', 'Interviews')}</p>
          <p className="font-semibold">{interviews}</p>
        </div>
      </div>
    </div>
  );
}

function SimpleBarChart({
  bars,
  yLabel,
  xLabel,
}: {
  bars: Array<{ label: string; value: number }>;
  yLabel: string;
  xLabel: string;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const width = 620;
  const height = 260;
  const padding = { top: 20, right: 16, bottom: 48, left: 42 };
  const rawMax = Math.max(1, ...bars.map((bar) => bar.value));
  const max = rawMax <= 5 ? 5 : Math.ceil(rawMax / 5) * 5;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barWidth = Math.max(20, plotWidth / Math.max(1, bars.length) - 20);
  const yTicks = 5;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[420px] h-[230px]">
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
        <text x={width - 54} y={height - 8} fontSize={10} fill="#6b7280">{xLabel}</text>
        {bars.map((bar, index) => {
          const x = padding.left + index * (plotWidth / bars.length) + 10;
          const h = (bar.value / max) * plotHeight;
          const y = padding.top + plotHeight - h;
          return (
            <g key={bar.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                fill="#111827"
                rx={4}
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

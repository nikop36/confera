'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../../lib/auth';
import { useT } from '../../../lib/i18n';
import { StatisticsRangeFilter } from '../range-filter';
import { datesForPreset, toIsoRange, type RangePreset } from '../range';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function AdminStatisticsReportsPage() {
  const t = useT();
  const user = useStoredUser();
  const [preset, setPreset] = useState<RangePreset>('30d');
  const initialDates = datesForPreset('30d');
  const [from, setFrom] = useState(initialDates.from);
  const [to, setTo] = useState(initialDates.to);
  const [volumes, setVolumes] = useState<Array<{ label: string; value: number }>>([]);
  const [error, setError] = useState('');

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
      const buildUrl = (path: string) => {
        const url = new URL(`${API}${path}`);
        if (range.from) url.searchParams.set('from', range.from);
        if (range.to) url.searchParams.set('to', range.to);
        return url.toString();
      };
      try {
        const [overviewRes, usageRes, matchingRes, engagementRes] = await Promise.all([
          fetch(buildUrl('/analytics/overview'), { headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store', signal: controller.signal }),
          fetch(buildUrl('/analytics/usage-trend'), { headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store', signal: controller.signal }),
          fetch(buildUrl('/analytics/matching-performance'), { headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store', signal: controller.signal }),
          fetch(buildUrl('/analytics/engagement'), { headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store', signal: controller.signal }),
        ]);
        if (!overviewRes.ok || !usageRes.ok || !matchingRes.ok || !engagementRes.ok) {
          setError(t('admin.stats.reports.errorLoad', 'Failed to load report volumes'));
          return;
        }

        const usage = (await usageRes.json()) as {
          series: Array<unknown>;
          roleBreakdown: Array<unknown>;
        };
        setVolumes([
          { label: t('admin.nav.stats.overview', 'Overview'), value: 1 },
          { label: t('admin.stats.reports.usageTrendRows', 'Usage trend rows'), value: usage.series.length },
          { label: t('admin.stats.reports.usageRoleRows', 'Usage role rows'), value: usage.roleBreakdown.length },
          { label: t('admin.nav.stats.matching', 'Matching'), value: 1 },
          { label: t('admin.nav.stats.engagement', 'Engagement'), value: 1 },
        ]);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : t('admin.stats.reports.errorLoad', 'Failed to load report volumes'));
      }
    }
    void load();
    return () => controller.abort();
  }, [range.from, range.to, t, user?.idToken]);

  return (
    <div>
      <h1 className="text-[32px] font-bold tracking-tight">{t('admin.nav.stats.reports', 'Reports')}</h1>
      <p className="text-sm text-[#8e8e93] mt-1 mb-5">
        {t('admin.stats.reports.subtitle', 'Export consolidated statistical reports for admin analysis.')}
      </p>
      {error && <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">{error}</div>}

      <StatisticsRangeFilter
        preset={preset}
        from={from}
        to={to}
        onPresetChange={applyPreset}
        onFromChange={setFrom}
        onToChange={setTo}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <ExportButton
          idToken={user?.idToken}
          href={buildExportHref('json', 'all', range)}
          filename="analytics-all-report.json"
          label={`JSON / ${t('admin.filter.all', 'All')}`}
          onError={setError}
        />
        <ExportButton
          idToken={user?.idToken}
          href={buildExportHref('csv', 'all', range)}
          filename="analytics-all-report.csv"
          label={`CSV / ${t('admin.filter.all', 'All')}`}
          onError={setError}
        />
        <ExportButton
          idToken={user?.idToken}
          href={buildExportHref('csv', 'overview', range)}
          filename="analytics-overview-report.csv"
          label={`CSV / ${t('admin.nav.stats.overview', 'Overview')}`}
          onError={setError}
        />
        <ExportButton
          idToken={user?.idToken}
          href={buildExportHref('csv', 'usage', range)}
          filename="analytics-usage-report.csv"
          label={`CSV / ${t('admin.nav.stats.usage', 'Usage')}`}
          onError={setError}
        />
        <ExportButton
          idToken={user?.idToken}
          href={buildExportHref('csv', 'matching', range)}
          filename="analytics-matching-report.csv"
          label={`CSV / ${t('admin.nav.stats.matching', 'Matching')}`}
          onError={setError}
        />
        <ExportButton
          idToken={user?.idToken}
          href={buildExportHref('csv', 'engagement', range)}
          filename="analytics-engagement-report.csv"
          label={`CSV / ${t('admin.nav.stats.engagement', 'Engagement')}`}
          onError={setError}
        />
      </div>

      <section className="mt-5 rounded-[12px] border border-[#ececec] bg-white p-4">
        <h2 className="text-[16px] font-semibold mb-1">
          {t('admin.stats.reports.estimatedRows', 'Estimated Report Rows by Section')}
        </h2>
        <p className="text-xs text-[#8e8e93] mb-3">
          {t(
            'admin.stats.reports.estimatedRowsDesc',
            'Shows the estimated number of rows included in exports by report section.',
          )}
        </p>
        <VolumeChartXY items={volumes} />
      </section>
    </div>
  );
}

function buildExportHref(
  format: 'json' | 'csv',
  section: 'all' | 'overview' | 'usage' | 'matching' | 'engagement',
  range: { from: string; to: string },
) {
  const url = new URL(`${API}/analytics/report`);
  url.searchParams.set('format', format);
  url.searchParams.set('section', section);
  if (range.from) url.searchParams.set('from', range.from);
  if (range.to) url.searchParams.set('to', range.to);
  return url.toString();
}

function ExportButton({
  idToken,
  href,
  filename,
  label,
  onError,
}: {
  idToken?: string;
  href: string;
  filename: string;
  label: string;
  onError: (message: string) => void;
}) {
  const t = useT();
  const [loading, setLoading] = useState(false);

  async function download() {
    if (!idToken) {
      onError(t('admin.stats.reports.errorAuth', 'You must be signed in to export reports.'));
      return;
    }
    setLoading(true);
    onError('');
    try {
      const response = await fetch(href, {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(t('admin.stats.reports.errorExport', 'Report export failed.'));
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('admin.stats.reports.errorExport', 'Report export failed.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void download()}
      disabled={loading}
      className="rounded-[10px] border border-[#ececec] bg-white px-4 py-3 text-left text-[#111827] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? t('admin.stats.reports.downloading', 'Downloading...') : label}
    </button>
  );
}

function VolumeChartXY({ items }: { items: Array<{ label: string; value: number }> }) {
  const t = useT();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  if (items.length === 0) {
    return <p className="text-sm text-[#8e8e93]">{t('admin.stats.noDataDisplay', 'No data to display.')}</p>;
  }
  const width = 620;
  const height = 260;
  const padding = { top: 20, right: 16, bottom: 48, left: 42 };
  const rawMax = Math.max(1, ...items.map((item) => item.value));
  const max = rawMax <= 5 ? 5 : Math.ceil(rawMax / 5) * 5;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barWidth = Math.max(20, plotWidth / Math.max(1, items.length) - 20);
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
        <text x={12} y={14} fontSize={10} fill="#6b7280">
          {t('admin.stats.reports.rows', 'rows')}
        </text>
        <text x={width - 54} y={height - 8} fontSize={10} fill="#6b7280">
          {t('admin.stats.reports.section', 'section')}
        </text>
        {items.map((item, index) => {
          const x = padding.left + index * (plotWidth / items.length) + 10;
          const h = (item.value / max) * plotHeight;
          const y = padding.top + plotHeight - h;
          return (
            <g key={item.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={4}
                fill="#111827"
                onMouseMove={(event) =>
                  setTooltip({ x: event.clientX, y: event.clientY, label: item.label, value: item.value })
                }
                onMouseLeave={() => setTooltip(null)}
              />
              <text x={x + barWidth / 2} y={height - 24} textAnchor="middle" fontSize={10} fill="#64748b">
                {item.label}
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

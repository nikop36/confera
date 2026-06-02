'use client';

import { useT } from '../../lib/i18n';
import type { RangePreset } from './range';

export function StatisticsRangeFilter({
  preset,
  from,
  to,
  onPresetChange,
  onFromChange,
  onToChange,
}: {
  preset: RangePreset;
  from: string;
  to: string;
  onPresetChange: (preset: RangePreset) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  const t = useT();

  return (
    <section className="rounded-[12px] border border-[#ececec] bg-white p-4 mb-5">
      <div className="flex flex-wrap items-end gap-3">
        <PresetButton
          active={preset === 'all'}
          label={t('admin.filter.all', 'All')}
          onClick={() => onPresetChange('all')}
        />
        <PresetButton
          active={preset === '7d'}
          label={t('admin.filter.last7d', 'Last 7d')}
          onClick={() => onPresetChange('7d')}
        />
        <PresetButton
          active={preset === '30d'}
          label={t('admin.filter.last30d', 'Last 30d')}
          onClick={() => onPresetChange('30d')}
        />
        <div className="ml-auto flex gap-2">
          <label className="text-xs text-[#6b7280]">
            {t('admin.filter.from', 'From')}
            <input
              type="date"
              value={from}
              onChange={(event) => onFromChange(event.target.value)}
              className="ml-1 rounded-[8px] border border-[#d1d5db] px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-[#6b7280]">
            {t('admin.filter.to', 'To')}
            <input
              type="date"
              value={to}
              onChange={(event) => onToChange(event.target.value)}
              className="ml-1 rounded-[8px] border border-[#d1d5db] px-2 py-1.5 text-sm"
            />
          </label>
        </div>
      </div>
    </section>
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

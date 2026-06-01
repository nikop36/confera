'use client';

import { useT } from '../lib/i18n';

export type CommunityFilter =
  | 'all'
  | 'match'
  | 'participant'
  | 'industry'
  | 'organizer';

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: CommunityFilter;
  onFilterChange: (filter: CommunityFilter) => void;
};

export default function FilterBar({
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
}: FilterBarProps) {
  const t = useT();
  const chips: Array<{ value: CommunityFilter; label: string }> = [
    { value: 'all', label: t('community.filter.all', 'All') },
    { value: 'match', label: t('community.filter.match', '✨ Matches') },
    { value: 'participant', label: t('community.filter.participant', 'Academics') },
    { value: 'industry', label: t('community.filter.industry', 'Industry') },
    { value: 'organizer', label: t('community.filter.organizer', 'Organizers') },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t('community.searchPlaceholder', '🔍 Search participants...')}
        className="min-w-[180px] max-w-[240px] flex-1 rounded-full border border-[#e5e7eb] bg-white px-4 py-[7px] text-[13px] text-[#1d1d1f] outline-none placeholder:text-[#a1a1aa] focus:border-[#0d0d0d] transition-colors"
      />
      {chips.map((chip) => {
        const active = activeFilter === chip.value;
        const isMatchChip = chip.value === 'match';
        let className =
          'rounded-full px-[14px] py-[6px] text-[12px] font-medium border cursor-pointer transition-colors whitespace-nowrap ';
        if (active) {
          className += 'bg-[#0d0d0d] text-white border-[#0d0d0d]';
        } else if (isMatchChip) {
          className +=
            'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] hover:bg-[#dbeafe]';
        } else {
          className +=
            'bg-white text-[#3d3d3d] border-[#e5e7eb] hover:bg-[#f7f7f7]';
        }
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onFilterChange(chip.value)}
            className={className}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type Tag = { id: string; label: string; slug: string };

const TAG_COLOURS = [
  { bg: '#eff6ff', text: '#1d4ed8' },
  { bg: '#faf5ff', text: '#7e22ce' },
  { bg: '#f0fdf4', text: '#15803d' },
  { bg: '#fff7ed', text: '#c2410c' },
  { bg: '#fdf2f8', text: '#9d174d' },
];

export function tagColour(slug: string): { bg: string; text: string } {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return TAG_COLOURS[hash % TAG_COLOURS.length];
}

type TagPill = { slug: string; label: string };

type TagPillsProps = { tags: TagPill[] };

/** Read-only display of tag pills — for EventCard and SessionCard */
export function TagPills({ tags }: TagPillsProps) {
  if (tags.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {tags.map(({ slug, label }) => {
        const { bg, text } = tagColour(slug);
        return (
          <span
            key={slug}
            style={{ background: bg, color: text }}
            className="text-[10px] font-semibold px-[7px] py-[2px] rounded-full"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

type TagPickerProps = {
  token: string;
  value: string[]; // selected slugs
  onChange: (slugs: string[]) => void;
  tags?: Tag[];    // when provided, skip internal fetch
};

const COLLAPSED_LIMIT = 16;

/** Interactive multi-select tag picker with search and collapsible rows */
export default function TagPicker({ token, value, onChange, tags: externalTags }: TagPickerProps) {
  const [internalTags, setInternalTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (externalTags !== undefined) return;
    fetch(`${API}/tags`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setInternalTags(data as Tag[]);
      })
      .catch(() => {});
  }, [token, externalTags]);

  const allTags = externalTags ?? internalTags;

  if (allTags.length === 0) return null;

  function toggle(slug: string) {
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  }

  const query = search.trim().toLowerCase();

  // Selected tags first, then unselected — keeps selections visible in collapsed mode
  const sorted = [
    ...allTags.filter((t) => value.includes(t.slug)),
    ...allTags.filter((t) => !value.includes(t.slug)),
  ];

  const filtered = query
    ? sorted.filter((t) => t.label.toLowerCase().includes(query) || t.slug.toLowerCase().includes(query))
    : sorted;

  const isSearching = query.length > 0;
  const needsCollapse = !isSearching && filtered.length > COLLAPSED_LIMIT;
  const visible = needsCollapse && !expanded ? filtered.slice(0, COLLAPSED_LIMIT) : filtered;
  const hiddenCount = filtered.length - COLLAPSED_LIMIT;

  return (
    <div className="flex flex-col gap-2">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        >
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tags…"
          className="w-full pl-9 pr-3 py-[6px] text-[12px] rounded-lg border border-[#e5e7eb] bg-[#f9fafb] outline-none focus:border-[#0d0d0d] focus:bg-white transition-colors placeholder:text-[#9ca3af] font-sans"
        />
      </div>

      {/* Tag pills */}
      {visible.length > 0 ? (
        <div className="flex flex-wrap gap-[6px]">
          {visible.map((tag) => {
            const selected = value.includes(tag.slug);
            const { bg, text } = tagColour(tag.slug);
            return (
              <button
                key={tag.slug}
                type="button"
                onClick={() => toggle(tag.slug)}
                style={selected ? { background: bg, color: text, borderColor: text } : {}}
                className={`text-[11px] font-semibold px-[9px] py-[3px] rounded-full border transition-all cursor-pointer font-sans ${
                  selected
                    ? 'border-current'
                    : 'bg-[#f3f4f6] text-[#6b7280] border-transparent hover:border-[#d1d5db]'
                }`}
              >
                {tag.label}
              </button>
            );
          })}

          {/* Collapse / expand toggle */}
          {needsCollapse && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] font-semibold px-[9px] py-[3px] rounded-full border border-dashed border-[#d1d5db] text-[#6b7280] bg-transparent cursor-pointer font-sans hover:border-[#0d0d0d] hover:text-[#0d0d0d] transition-colors"
            >
              {expanded ? 'Show less' : `+${hiddenCount} more`}
            </button>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-[#9ca3af] py-1">No tags match &ldquo;{search}&rdquo;</p>
      )}
    </div>
  );
}

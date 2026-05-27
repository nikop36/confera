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
  tags?: Tag[];    // ← when provided, skip internal fetch
};

/** Interactive multi-select tag picker — for form modals */
export default function TagPicker({ token, value, onChange, tags: externalTags }: TagPickerProps) {
  const [internalTags, setInternalTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (externalTags !== undefined) return; // managed externally
    fetch(`${API}/tags`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setInternalTags(data as Tag[]);
      })
      .catch(() => {});
  }, [token, externalTags]);

  const tags = externalTags ?? internalTags;

  if (tags.length === 0) return null;

  function toggle(slug: string) {
    onChange(
      value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const selected = value.includes(tag.slug);
        const { bg, text } = tagColour(tag.slug);
        return (
          <button
            key={tag.slug}
            type="button"
            onClick={() => toggle(tag.slug)}
            style={
              selected ? { background: bg, color: text, borderColor: text } : {}
            }
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
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import type { Speaker } from './SessionCard';

type CommunityUser = {
  uid: string;
  displayName: string;
  bio?: string;
};

type SpeakerInputProps = {
  value: Speaker;
  onChange: (updated: Speaker) => void;
  onRemove: () => void;
  users: CommunityUser[];
};

export default function SpeakerInput({
  value,
  onChange,
  onRemove,
  users,
}: SpeakerInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value.name.trim()
    ? users.filter((u) =>
        u.displayName.toLowerCase().includes(value.name.toLowerCase()),
      )
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectUser(user: CommunityUser) {
    onChange({ name: user.displayName, bio: user.bio ?? '', userId: user.uid });
    setShowDropdown(false);
  }

  function handleNameChange(name: string) {
    // Clear userId when name is manually edited
    onChange({ ...value, name, userId: undefined });
    setShowDropdown(true);
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#fafafa] rounded-[8px] border border-[#e5e7eb]">
      <div className="flex items-center gap-2">
        <div ref={containerRef} className="flex-1 relative">
          <input
            value={value.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Ime predavatelja (lahko zunanji)"
            className="w-full border border-[#e5e7eb] rounded-[6px] px-3 py-[6px] text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
          />
          {value.userId ? (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#059669] font-semibold">
              ✓ V sistemu
            </span>
          ) : value.name.trim() ? (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#8e8e93] font-semibold">
              Zunanji
            </span>
          ) : null}
          {showDropdown && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e5e7eb] rounded-[8px] shadow-md z-10 max-h-[160px] overflow-y-auto">
              {filtered.slice(0, 6).map((u) => (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => selectUser(u)}
                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#f3f4f6] border-0 bg-transparent cursor-pointer font-sans"
                >
                  <span className="font-semibold">{u.displayName}</span>
                  {u.bio && (
                    <span className="text-[#8e8e93] ml-2 truncate">
                      {u.bio.slice(0, 40)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 rounded-full bg-[#fff1f2] text-[#dc2626] text-[12px] flex items-center justify-center border-0 cursor-pointer hover:bg-[#fee2e2] font-sans flex-shrink-0"
        >
          ✕
        </button>
      </div>
      <textarea
        rows={2}
        value={value.bio ?? ''}
        onChange={(e) => onChange({ ...value, bio: e.target.value })}
        placeholder="Kratka bio (neobvezno)"
        className="border border-[#e5e7eb] rounded-[6px] px-3 py-[6px] text-[12px] outline-none focus:border-[#0d0d0d] transition-colors resize-none"
      />
    </div>
  );
}

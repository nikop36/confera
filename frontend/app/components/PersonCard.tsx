'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '../lib/i18n';

export type CommunityUser = {
  uid: string;
  displayName: string;
  affiliation?: string;
  role: string;
  bio?: string;
  tags?: string[];
  meetingType?: 'online' | 'in-person' | 'both';
  score?: number;
};

type PersonCardProps = {
  person: CommunityUser;
  isExpanded: boolean;
  onToggle: () => void;
  isConnected: boolean;
  isPending: boolean;
  isConnecting: boolean;
  onConnect: () => void;
};

const AVATAR_GRADIENTS = [
  { from: '#a8edea', to: '#fed6e3', text: '#3d3d3d' },
  { from: '#667eea', to: '#764ba2', text: '#ffffff' },
  { from: '#4facfe', to: '#00f2fe', text: '#ffffff' },
  { from: '#f093fb', to: '#f5576c', text: '#ffffff' },
  { from: '#43e97b', to: '#38f9d7', text: '#1a5c3a' },
  { from: '#fd746c', to: '#ff9068', text: '#ffffff' },
  { from: '#f7971e', to: '#ffd200', text: '#5a3000' },
  { from: '#a18cd1', to: '#fbc2eb', text: '#3d3d3d' },
];

const CHIP_COLORS: Record<number, string> = {
  0: 'bg-[#eff6ff] text-[#1e40af]',
  1: 'bg-[#f0fdf4] text-[#166534]',
  2: 'bg-[#fdf4ff] text-[#7e22ce]',
  3: 'bg-[#fff7ed] text-[#c2410c]',
};

function chipColor(index: number): string {
  return CHIP_COLORS[index % 4] ?? CHIP_COLORS[0];
}

function avatarGradient(uid: string) {
  return AVATAR_GRADIENTS[uid.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function initials(displayName: string): string {
  return displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function meetingLabel(type?: string): string | null {
  if (type === 'in-person') return 'in-person';
  if (type === 'online') return 'online';
  if (type === 'both') return 'both';
  return null;
}

export default function PersonCard({
  person,
  isExpanded,
  onToggle,
  isConnected,
  isPending,
  isConnecting,
  onConnect,
}: PersonCardProps) {
  const t = useT();
  const gradient = avatarGradient(person.uid);
  const topTags = (person.tags ?? []).slice(0, 2);
  const meeting = meetingLabel(person.meetingType);

  const borderClass = isExpanded
    ? person.score !== undefined
      ? 'border-[#059669] border-2'
      : 'border-[#0d0d0d] border-2'
    : person.score !== undefined
      ? 'border-[#a7f3d0]'
      : 'border-[#f0f0f0]';

  return (
    <div
      className={`bg-white rounded-[14px] border p-[13px] cursor-pointer transition-colors hover:border-[#d1d5db] ${borderClass}`}
      onClick={onToggle}
    >
      {/* Header row */}
      <div className="flex items-center gap-[9px] mb-2">
        <div
          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
            color: gradient.text,
          }}
        >
          {initials(person.displayName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[5px] mb-[1px]">
            <p className="text-[12px] font-semibold text-[#0d0d0d] leading-[1.3] truncate">
              {person.displayName}
            </p>
            {person.score !== undefined && (
              <span className="shrink-0 px-[6px] py-[1px] rounded-full text-[9px] font-semibold bg-[#ecfdf5] text-[#059669]">
                Ujemanje
              </span>
            )}
          </div>
          {person.affiliation && (
            <p className="text-[10px] text-[#8e8e93] truncate">
              {person.affiliation}
            </p>
          )}
        </div>
      </div>

      {/* Bio snippet — always visible */}
      {person.bio && (
        <p className="text-[10px] text-[#6e6e73] leading-[1.5] mb-[9px] line-clamp-2">
          {person.bio}
        </p>
      )}

      {/* Tag chips — always visible */}
      {topTags.length > 0 && (
        <div className="flex flex-wrap gap-[3px]">
          {topTags.map((tag, i) => (
            <span
              key={tag}
              className={`px-[7px] py-[2px] rounded-full text-[9px] font-medium ${chipColor(i)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Animated expanded panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-t border-[#f0f0f0] mt-[11px] pt-[11px]">
              {/* Full tags */}
              <div className="mb-[8px]">
                {(person.tags ?? []).length > 0 && (
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.05em] text-[#a1a1aa] mb-[4px]">
                      {t('profile.field.tags', 'Tags')}
                    </p>
                    <div className="flex flex-wrap gap-[3px]">
                      {(person.tags ?? []).map((tag, i) => (
                        <span
                          key={tag}
                          className={`px-[7px] py-[2px] rounded-full text-[9px] font-medium ${chipColor(i)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Meeting preference */}
              {meeting && (
                <p className="text-[10px] text-[#8e8e93] mb-[9px]">
                  {meeting === 'in-person'
                    ? t('personcard.meeting.inPerson', '📍 In person')
                    : meeting === 'online'
                      ? t('personcard.meeting.online', '🌐 Online')
                      : t('personcard.meeting.both', '🌐 Both')}
                </p>
              )}

              {/* Actions row */}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isConnected || isPending || isConnecting}
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnect();
                  }}
                  className={`flex-1 py-[7px] rounded-[8px] text-[10px] font-semibold border-0 cursor-pointer font-sans transition-colors ${
                    isConnected
                      ? 'bg-[#ecfdf3] text-[#166534] cursor-default'
                      : isPending
                        ? 'bg-[#f3f4f6] text-[#6b7280] cursor-default'
                        : 'bg-[#0d0d0d] text-white hover:bg-[#1f1f1f] disabled:opacity-50'
                  }`}
                >
                  {isConnected
                    ? t('personcard.connected', 'Connected ✓')
                    : isPending
                      ? t('personcard.pending', 'Pending')
                      : isConnecting
                        ? t('personcard.connecting', 'Sending...')
                        : t('personcard.connect', 'Connect')}
                </button>
                <Link
                  href={`/profile/${person.uid}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-[7px] rounded-[8px] text-[10px] font-semibold border border-[#e5e7eb] text-[#3d3d3d] hover:border-[#0d0d0d] no-underline transition-colors"
                >
                  {t('personcard.profile', 'Profile')} →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

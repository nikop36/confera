import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { TagPills } from './TagPicker';
import { useT, useLocale } from '../lib/i18n';
// avatar helpers — inline so there's no external dependency
function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function avatarColour(uid: string): string {
  const colours = [
    '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
    '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  ];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return colours[Math.abs(hash) % colours.length];
}

export type EventItem = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  capacity: number;
  registeredCount: number;
  tags?: string[];
  isRegistered: boolean;
  friendsGoing?: { uid: string; displayName: string }[];
  createdBy: string;
  archived?: boolean;
};

type EventCardProps = {
  event: EventItem;
  tagMap: Record<string, string>;
  isExpanded: boolean;
  onToggle: () => void;
  isRegistering: boolean;
  registerError?: string;
  onRegister: () => void;
  onCancel: () => void;
  isAdminOrOrganizer: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function formatTimeRange(startAt: string, endAt: string, locale: 'sl' | 'en'): string {
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const l = locale === 'en' ? 'en-GB' : 'sl-SI';
  return `${new Date(startAt).toLocaleTimeString(l, opts)} – ${new Date(endAt).toLocaleTimeString(l, opts)}`;
}

export default function EventCard({
  event,
  tagMap,
  isExpanded,
  onToggle,
  isRegistering,
  registerError,
  onRegister,
  onCancel,
  isAdminOrOrganizer,
  onEdit,
  onDelete,
}: EventCardProps) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const isFull = event.registeredCount >= event.capacity;
  const spotsLeft = event.capacity - event.registeredCount;

  const borderClass = isExpanded
    ? event.isRegistered
      ? 'border-[#059669] border-2'
      : 'border-[#0d0d0d] border-2'
    : event.isRegistered
      ? 'border-[#a7f3d0]'
      : 'border-[#e5e7eb]';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      className={`bg-white rounded-[12px] border p-[12px] cursor-pointer transition-colors hover:border-[#d1d5db] ${borderClass}`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Collapsed header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#0d0d0d] truncate">
            {event.title}
          </p>
          <p className="text-[11px] text-[#8e8e93] truncate">
            {formatTimeRange(event.startAt, event.endAt, locale)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {event.isRegistered ? (
            <span className="bg-[#ecfdf3] text-[#166534] text-[10px] font-semibold px-[7px] py-[2px] rounded-[5px]">
              ✓ {t('eventDetail.registered', 'Registered')}
            </span>
          ) : isFull ? (
            <span className="bg-[#f3f4f6] text-[#6b7280] text-[10px] font-semibold px-[7px] py-[2px] rounded-[5px]">
              {t('events.soldOut', 'Sold out')}
            </span>
          ) : (
            <span className="text-[11px] text-[#6e6e73]">
              {spotsLeft} {t('eventDetail.seats', 'seats')}
            </span>
          )}
          <span className="bg-[#eff6ff] text-[#1d4ed8] text-[10px] font-medium px-[7px] py-[2px] rounded-[5px]">
            {event.location}
          </span>
        </div>
      </div>

      {(event.tags ?? []).length > 0 && (
        <div className="mt-2">
          <TagPills
            tags={(event.tags ?? []).map((slug) => ({
              slug,
              label: tagMap[slug] ?? slug,
            }))}
          />
        </div>
      )}

      {(event.friendsGoing ?? []).length > 0 && (
        <div className="flex items-center gap-[5px] mt-[6px]">
          <div className="flex">
            {(event.friendsGoing ?? []).slice(0, 3).map((friend, idx) => (
              <div
                key={friend.uid}
                title={friend.displayName}
                style={{
                  background: avatarColour(friend.uid),
                  zIndex: 3 - idx,
                  marginRight: idx < 2 ? '-5px' : 0,
                }}
                className="w-[18px] h-[18px] rounded-full border-2 border-white text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0"
              >
                {initials(friend.displayName)}
              </div>
            ))}
          </div>
          <span className="text-[11px] text-[#6366f1] font-semibold">
            {(event.friendsGoing ?? []).length === 1
              ? t('events.friendGoing.one', '1 friend is going')
              : t('events.friendGoing.many', '{{count}} friends are going').replace(
                  '{{count}}',
                  String((event.friendsGoing ?? []).length),
                )}
          </span>
        </div>
      )}

      {/* Expanded panel */}
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
            <div className="border-t border-[#f0f0f0] mt-[10px] pt-[10px]">
              {/* Time + capacity */}
              <div className="flex items-center justify-between mb-[8px]">
                <span className="text-[11px] text-[#6e6e73]">
                  {formatTimeRange(event.startAt, event.endAt, locale)}
                </span>
                <span className="text-[11px] text-[#6e6e73]">
                  {event.registeredCount} / {event.capacity}{' '}
                  {t('eventDetail.seats', 'seats')}
                </span>
              </div>

              {/* Description */}
              <p className="text-[12px] text-[#3d3d3d] leading-[1.6] mb-[8px]">
                {event.description}
              </p>

              {/* Register error */}
              {registerError && (
                <p className="text-[11px] text-[#dc2626] mb-[8px]">
                  {registerError}
                </p>
              )}

              {/* Action row */}
              <div className="flex gap-2 items-center">
                {event.isRegistered ? (
                  // ── CHANGED: red Leave button ──────────────────────────────
                  <button
                    type="button"
                    disabled={isRegistering}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel();
                    }}
                    className="flex-1 py-[7px] rounded-[8px] text-[11px] font-semibold bg-[#fff1f2] text-[#dc2626] hover:bg-[#fee2e2] transition-colors disabled:opacity-50 border-0 cursor-pointer font-sans"
                  >
                    {isRegistering
                      ? t('events.cancelling', 'Prekinjam...')
                      : t('events.leave', 'Zapusti')}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isFull || isRegistering}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegister();
                    }}
                    className="flex-1 py-[7px] rounded-[8px] text-[11px] font-semibold bg-[#0d0d0d] text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer font-sans"
                  >
                    {isRegistering
                      ? t('events.registering', 'Prijavljam...')
                      : isFull
                        ? t('events.soldOut', 'Sold out')
                        : t('events.register', 'Register')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/events/${event.id}`);
                  }}
                  className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold bg-[#eff6ff] text-[#1d4ed8] hover:bg-[#dbeafe] transition-colors border-0 cursor-pointer font-sans"
                >
                  {t('eventDetail.program', 'Program')} →
                </button>

                {isAdminOrOrganizer && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] transition-colors border-0 cursor-pointer font-sans"
                    >
                      {t('common.edit', 'Edit')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold bg-[#fff1f2] text-[#dc2626] hover:bg-[#fee2e2] transition-colors border-0 cursor-pointer font-sans"
                    >
                      {t('common.delete', 'Delete')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
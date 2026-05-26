'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export type EventItem = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  capacity: number;
  registeredCount: number;
  isRegistered: boolean;
};

type EventCardProps = {
  event: EventItem;
  isExpanded: boolean;
  onToggle: () => void;
  isRegistering: boolean;
  registerError?: string | null;
  onRegister: () => void;
  onCancel: () => void;
  isAdminOrOrganizer: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function formatTimeRange(startAt: string, endAt: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  return `${new Date(startAt).toLocaleTimeString('sl-SI', opts)} – ${new Date(endAt).toLocaleTimeString('sl-SI', opts)}`;
}

export default function EventCard({
  event,
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
            {formatTimeRange(event.startAt, event.endAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {event.isRegistered ? (
            <span className="bg-[#ecfdf3] text-[#166534] text-[10px] font-semibold px-[7px] py-[2px] rounded-[5px]">
              ✓ Prijavljen/a
            </span>
          ) : isFull ? (
            <span className="bg-[#f3f4f6] text-[#6b7280] text-[10px] font-semibold px-[7px] py-[2px] rounded-[5px]">
              Razprodano
            </span>
          ) : (
            <span className="text-[11px] text-[#6e6e73]">
              {spotsLeft} mest
            </span>
          )}
          <span className="bg-[#eff6ff] text-[#1d4ed8] text-[10px] font-medium px-[7px] py-[2px] rounded-[5px]">
            {event.location}
          </span>
        </div>
      </div>

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
            <div className="border-t border-[#f0f0f0] mt-[10px] pt-[10px]">
              {/* Time + capacity */}
              <div className="flex items-center justify-between mb-[8px]">
                <span className="text-[11px] text-[#6e6e73]">
                  {formatTimeRange(event.startAt, event.endAt)}
                </span>
                <span className="text-[11px] text-[#6e6e73]">
                  {event.registeredCount} / {event.capacity} mest
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
                  <button
                    type="button"
                    disabled={isRegistering}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel();
                    }}
                    className="flex-1 py-[7px] rounded-[8px] text-[11px] font-semibold bg-[#ecfdf3] text-[#166534] hover:bg-[#d1fae5] transition-colors disabled:opacity-50 border-0 cursor-pointer font-sans"
                  >
                    {isRegistering ? 'Preklicujem...' : 'Odjavi se'}
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
                      ? 'Prijavljujem...'
                      : isFull
                        ? 'Razprodano'
                        : 'Prijavi se'}
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
                  Program →
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
                      Uredi
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold bg-[#fff1f2] text-[#dc2626] hover:bg-[#fee2e2] transition-colors border-0 cursor-pointer font-sans"
                    >
                      Izbriši
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

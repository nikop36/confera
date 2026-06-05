'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import EventCard, { type EventItem } from '../components/EventCard';
import EventFormModal, { type EventFormValues } from '../components/EventFormModal';
import { useStoredUser } from '../lib/auth';
import TagPicker, { type Tag } from '../components/TagPicker';
import { useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateHeading(dateKey: string, locale: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(
    locale === 'sl' ? 'sl-SI' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  );
}

/** Groups events by calendar date (YYYY-MM-DD) based on startAt. */
function groupByDate(events: EventItem[]): { dateKey: string; events: EventItem[] }[] {
  const map = new Map<string, EventItem[]>();
  for (const e of events) {
    const key = toDateKey(new Date(e.startAt));
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, events]) => ({ dateKey, events }));
}

/** Returns all unique YYYY-MM-DD keys that have at least one event. */
function eventDateKeys(events: EventItem[]): Set<string> {
  const s = new Set<string>();
  for (const e of events) s.add(toDateKey(new Date(e.startAt)));
  return s;
}

/** Simple calendar month picker — renders a grid of days for one month. */
function MonthCalendar({
  year,
  month,
  activeDates,
  selectedDate,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: {
  year: number;
  month: number; // 0-indexed
  activeDates: Set<string>;
  selectedDate: string | null;
  onSelect: (key: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const t = useT();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Shift so Monday = 0
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  const monthLabel = new Date(year, month, 1).toLocaleDateString('sl-SI', {
    month: 'long',
    year: 'numeric',
  });

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const dayNames = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[14px] p-4 mb-5 select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onPrevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] text-[#6b7280] bg-transparent border-0 cursor-pointer font-sans text-[14px]"
        >
          ‹
        </button>
        <span className="text-[13px] font-semibold text-[#0d0d0d] capitalize">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] text-[#6b7280] bg-transparent border-0 cursor-pointer font-sans text-[14px]"
        >
          ›
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-[#9ca3af] py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-[2px]">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const m = String(month + 1).padStart(2, '0');
          const d = String(day).padStart(2, '0');
          const key = `${year}-${m}-${d}`;
          const isActive = activeDates.has(key);
          const isSelected = selectedDate === key;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              type="button"
              disabled={!isActive}
              onClick={() => onSelect(key)}
              className={[
                'h-8 w-full rounded-[8px] text-[12px] font-medium transition-colors border-0 cursor-pointer font-sans',
                isSelected
                  ? 'bg-[#0d0d0d] text-white'
                  : isActive
                    ? 'text-[#0d0d0d] hover:bg-[#f3f4f6]'
                    : 'text-[#d1d5db] cursor-default',
                isToday && !isSelected ? 'ring-1 ring-[#0d0d0d]' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {day}
              {isActive && !isSelected && (
                <span className="block mx-auto mt-[1px] w-[3px] h-[3px] rounded-full bg-[#0071e3]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Clear selection */}
      {selectedDate && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => onSelect('')}
            className="text-[11px] text-[#8e8e93] hover:text-[#0d0d0d] bg-transparent border-0 cursor-pointer font-sans"
          >
            {t('events.showAll', 'Prikaži vse datume')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const user = useStoredUser();
  const t = useT();

  // All fetched events (including archived)
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [registeringIds] = useState<Record<string, boolean>>({});
  const [registerErrors] = useState<Record<string, string>>({});
  const [modalEvent, setModalEvent] = useState<EventItem | null | undefined>(undefined);

  // Calendar state
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadTags = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTags((await res.json()) as Tag[]);
    } catch { /* non-fatal */ }
  }, []);

  const loadEvents = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
    try {
      // /events/mine returns ALL of the organizer's events including archived
      const res = await fetch(`${API}/events/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t('events.error.load'));
      const json = await res.json();
      const list: EventItem[] = Array.isArray(json) ? json : (json.data ?? []);
      // Sort ascending by startAt
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      setEvents(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.error.generic'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!user?.idToken) return;

    const token = user.idToken;
    const initialLoad = window.setTimeout(() => {
      void loadEvents(token);
      void loadTags(token);
    }, 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadEvents, loadTags, user?.idToken]);

  // ── handlers ───────────────────────────────────────────────────────────────

  async function handleSave(values: EventFormValues) {
    if (!user?.idToken) return;
    const isEdit = modalEvent != null;
    const url = isEdit ? `${API}/events/${modalEvent.id}` : `${API}/events`;
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${user.idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...values,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = Array.isArray(body.message) ? body.message[0] : body.message;
      throw new Error(msg ?? t('events.error.save'));
    }
    void loadEvents(user.idToken);
  }

  async function handleDelete(eventId: string) {
    if (!user?.idToken || !confirm(t('events.confirmDelete'))) return;
    try {
      const res = await fetch(`${API}/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? t('events.error.delete'));
      }
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      if (expandedId === eventId) setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.error.delete'));
    }
  }

  // ── derived state ──────────────────────────────────────────────────────────

  const tagMap = Object.fromEntries(tags.map((tag) => [tag.slug, tag.label]));

  // Dates that have events (for calendar dot indicators)
  const activeDates = eventDateKeys(events);

  // Apply tag filter first
  const tagFiltered =
    selectedTags.length === 0
      ? events
      : events.filter((e) => selectedTags.some((slug) => e.tags?.includes(slug)));

  // Then apply date filter
  const dateFiltered = selectedDate
    ? tagFiltered.filter((e) => toDateKey(new Date(e.startAt)) === selectedDate)
    : tagFiltered;

  const groups = groupByDate(dateFiltered);

  const locale = typeof navigator !== 'undefined'
    ? navigator.language.startsWith('sl') ? 'sl' : 'en'
    : 'sl';

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-bold">{t('events.title')}</h2>
          <p className="text-[13px] text-[#8e8e93] mt-1">
            {t('events.subtitle')}
            {!loading && ` · ${events.length} ${t('events.count')}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalEvent(null)}
          className="px-4 py-[8px] rounded-full bg-[#0d0d0d] text-white text-[13px] font-semibold hover:bg-[#1f1f1f] transition-colors border-0 cursor-pointer font-sans"
        >
          {t('events.add')}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {/* Calendar date picker */}
      <MonthCalendar
        year={calYear}
        month={calMonth}
        activeDates={activeDates}
        selectedDate={selectedDate}
        onSelect={(key) => setSelectedDate(key || null)}
        onPrevMonth={() => {
          if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
          else setCalMonth((m) => m - 1);
        }}
        onNextMonth={() => {
          if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
          else setCalMonth((m) => m + 1);
        }}
      />

      {/* Tag filter */}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <TagPicker
            token={user?.idToken ?? ''}
            value={selectedTags}
            onChange={setSelectedTags}
            tags={tags}
          />
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className="text-[11px] font-semibold px-[9px] py-[3px] rounded-full border border-transparent text-[#8e8e93] hover:text-[#0d0d0d] bg-transparent cursor-pointer font-sans"
            >
              {t('events.clearFilter')}
            </button>
          )}
        </div>
      )}

      {/* Event list */}
      {loading ? (
        <SkeletonTimeline />
      ) : dateFiltered.length === 0 ? (
        <div className="rounded-[14px] border border-[#f0f0f0] px-5 py-6 text-sm text-[#8e8e93]">
          {selectedDate
            ? t('events.noneForDate', 'Ni dogodkov za izbrani datum.')
            : selectedTags.length > 0
              ? t('events.noneForTags')
              : t('events.none')}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(({ dateKey, events: dayEvents }) => (
            <div key={dateKey}>
              {/* Date heading */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] font-bold text-[#0d0d0d] tracking-[0.06em] shrink-0 capitalize">
                  {formatDateHeading(dateKey, locale)}
                </span>
                <div className="flex-1 h-px bg-[#e5e7eb]" />
              </div>

              <div className="flex flex-col gap-2">
                {dayEvents.map((event) => {
                  const isArchived = !!event.archived;
                  return (
                    <div
                      key={event.id}
                      className={isArchived ? 'opacity-50 pointer-events-none' : ''}
                    >
                      {isArchived && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[10px] font-semibold text-[#9ca3af] bg-[#f3f4f6] px-[6px] py-[2px] rounded-[4px]">
                            {t('events.archived', 'Arhivirano')}
                          </span>
                        </div>
                      )}
                      <EventCard
                        event={event}
                        tagMap={tagMap}
                        isExpanded={!isArchived && expandedId === event.id}
                        onToggle={() => {
                          if (isArchived) return;
                          setExpandedId((prev) =>
                            prev === event.id ? null : event.id,
                          );
                        }}
                        isRegistering={Boolean(registeringIds[event.id])}
                        registerError={registerErrors[event.id]}
                        onRegister={() => {}}
                        onCancel={() => {}}
                        // Archived events: no edit/delete
                        isAdminOrOrganizer={!isArchived}
                        onEdit={() => setModalEvent(event)}
                        onDelete={() => void handleDelete(event.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      {modalEvent !== undefined && (
        <EventFormModal
          key={modalEvent?.id ?? 'create'}
          event={modalEvent}
          token={user?.idToken ?? ''}
          onClose={() => setModalEvent(undefined)}
          onSave={handleSave}
        />
      )}
    </AppShell>
  );
}

function SkeletonTimeline() {
  return (
    <div className="flex flex-col gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-[11px] w-[120px] bg-[#f0f0f0] rounded animate-pulse" />
            <div className="flex-1 h-px bg-[#f0f0f0]" />
          </div>
          <div className="flex flex-col gap-2">
            {[1, 2].map((j) => (
              <div
                key={j}
                className="bg-white border border-[#f0f0f0] rounded-[12px] p-[12px] animate-pulse"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="h-[13px] w-[160px] bg-[#f0f0f0] rounded mb-2" />
                    <div className="h-[11px] w-[100px] bg-[#f0f0f0] rounded" />
                  </div>
                  <div className="h-[20px] w-[60px] bg-[#f0f0f0] rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

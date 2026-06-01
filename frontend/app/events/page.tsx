'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import EventCard, { type EventItem } from '../components/EventCard';
import EventFormModal, { type EventFormValues } from '../components/EventFormModal';
import { useStoredUser } from '../lib/auth';
import TagPicker, { type Tag } from '../components/TagPicker';
import { useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type TimeGroup = {
  timeLabel: string;
  events: EventItem[];
};

function groupByTime(events: EventItem[]): TimeGroup[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const groups = new Map<string, EventItem[]>();
  for (const event of sorted) {
    const label = new Date(event.startAt).toLocaleTimeString('sl-SI', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const existing = groups.get(label) ?? [];
    groups.set(label, [...existing, event]);
  }
  return Array.from(groups.entries()).map(([timeLabel, events]) => ({
    timeLabel,
    events,
  }));
}

export default function EventsPage() {
  const user = useStoredUser();
  const t = useT();
  const isAdminOrOrganizer =
    user?.role === 'admin' || user?.role === 'organizer';

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [registeringIds, setRegisteringIds] = useState<Record<string, boolean>>(
    {},
  );
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>(
    {},
  );
  // undefined = modal closed, null = create mode, EventItem = edit mode
  const [modalEvent, setModalEvent] = useState<EventItem | null | undefined>(
    undefined,
  );

  const loadTags = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as Tag[];
        setTags(data);
      }
    } catch {
      // non-fatal
    }
  }, []);

  const loadEvents = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(t('events.error.load'));
      const data = (await res.json()) as EventItem[];
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.error.generic'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!user?.idToken) return;
    void loadEvents(user.idToken);
    void loadTags(user.idToken);
  }, [user?.idToken, loadEvents, loadTags]);

  async function handleRegister(eventId: string) {
    if (!user?.idToken) return;
    setRegisteringIds((prev) => ({ ...prev, [eventId]: true }));
    setRegisterErrors((prev) => ({ ...prev, [eventId]: '' }));
    try {
      const res = await fetch(`${API}/events/${eventId}/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? t('events.error.register'));
      }
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, isRegistered: true, registeredCount: e.registeredCount + 1 }
            : e,
        ),
      );
    } catch (err) {
      setRegisterErrors((prev) => ({
        ...prev,
        [eventId]:
          err instanceof Error ? err.message : t('events.error.register'),
      }));
    } finally {
      setRegisteringIds((prev) => ({ ...prev, [eventId]: false }));
    }
  }

  async function handleCancel(eventId: string) {
    if (!user?.idToken) return;
    setRegisteringIds((prev) => ({ ...prev, [eventId]: true }));
    setRegisterErrors((prev) => ({ ...prev, [eventId]: '' }));
    try {
      const res = await fetch(`${API}/events/${eventId}/register`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? t('events.error.cancel'));
      }
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                isRegistered: false,
                registeredCount: Math.max(0, e.registeredCount - 1),
              }
            : e,
        ),
      );
    } catch (err) {
      setRegisterErrors((prev) => ({
        ...prev,
        [eventId]: err instanceof Error ? err.message : t('events.error.cancel'),
      }));
    } finally {
      setRegisteringIds((prev) => ({ ...prev, [eventId]: false }));
    }
  }

  async function handleSave(values: EventFormValues) {
    if (!user?.idToken) return;
    const isEdit = modalEvent != null;
    const url = isEdit ? `${API}/events/${modalEvent.id}` : `${API}/events`;
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
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
    if (
      !user?.idToken ||
      !confirm(t('events.confirmDelete'))
    )
      return;
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

  const tagMap = Object.fromEntries(tags.map((t) => [t.slug, t.label]));

  const filteredEvents =
    selectedTags.length === 0
      ? events
      : events.filter((e) =>
          selectedTags.some((slug) => e.tags?.includes(slug)),
        );

  const groups = groupByTime(filteredEvents);

  return (
    <AppShell>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-[22px] font-bold">{t('events.title')}</h2>
          <p className="text-[13px] text-[#8e8e93] mt-1">
            {t('events.subtitle')}
            {!loading && ` · ${events.length} ${t('events.count')}`}
          </p>
        </div>
        {isAdminOrOrganizer && (
          <button
            type="button"
            onClick={() => setModalEvent(null)}
            className="px-4 py-[8px] rounded-full bg-[#0d0d0d] text-white text-[13px] font-semibold hover:bg-[#1f1f1f] transition-colors border-0 cursor-pointer font-sans"
          >
            {t('events.add')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {tags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
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
        </div>
      )}

      {loading ? (
        <SkeletonTimeline />
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-[14px] border border-[#f0f0f0] px-5 py-6 text-sm text-[#8e8e93]">
          {selectedTags.length > 0
            ? t('events.noneForTags')
            : t('events.none')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map(({ timeLabel, events: groupEvents }) => (
            <div key={timeLabel}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] font-bold text-[#0d0d0d] tracking-[0.06em] shrink-0">
                  {timeLabel}
                </span>
                <div className="flex-1 h-px bg-[#e5e7eb]" />
              </div>
              <div className="flex flex-col gap-2">
                {groupEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    tagMap={tagMap}
                    isExpanded={expandedId === event.id}
                    onToggle={() =>
                      setExpandedId((prev) =>
                        prev === event.id ? null : event.id,
                      )
                    }
                    isRegistering={Boolean(registeringIds[event.id])}
                    registerError={registerErrors[event.id]}
                    onRegister={() => void handleRegister(event.id)}
                    onCancel={() => void handleCancel(event.id)}
                    isAdminOrOrganizer={isAdminOrOrganizer}
                    onEdit={() => setModalEvent(event)}
                    onDelete={() => void handleDelete(event.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
            <div className="h-[11px] w-[36px] bg-[#f0f0f0] rounded animate-pulse" />
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

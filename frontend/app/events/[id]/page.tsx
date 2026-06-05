'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import SessionCard, { type SessionItem } from '../../components/SessionCard';
import SessionFormModal, {
  type SessionFormValues,
} from '../../components/SessionFormModal';
import { type EventItem } from '../../components/EventCard';
import { useStoredUser } from '../../lib/auth';
import { type Tag } from '../../components/TagPicker';
import CareerSlotCard, { type CareerSlotItem } from '../../components/CareerSlotCard';
import CareerSlotFormModal, { type CareerSlotFormValues } from '../../components/CareerSlotFormModal';
import { useLocale, useT } from '../../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type GridItem =
  | { itemType: 'session'; data: SessionItem }
  | { itemType: 'career'; data: CareerSlotItem };

function toGridItems(sessions: SessionItem[], careerSlots: CareerSlotItem[]): GridItem[] {
  return [
    ...sessions.map((s): GridItem => ({ itemType: 'session', data: s })),
    ...careerSlots.map((s): GridItem => ({ itemType: 'career', data: s })),
  ];
}

function buildGrid(items: GridItem[]): { timeSlots: string[]; tracks: string[] } {
  const timeSet = new Set(items.map((i) => i.data.startAt));
  const trackSet = new Set(items.map((i) => i.data.location));
  return {
    timeSlots: [...timeSet].sort((a, b) => a.localeCompare(b)),
    tracks: [...trackSet].sort((a, b) => a.localeCompare(b)),
  };
}

function getRowSpan(item: GridItem, timeSlots: string[]): number {
  const endMs = new Date(item.data.endAt).getTime();
  const span = timeSlots.filter((t) => {
    const tMs = new Date(t).getTime();
    return tMs >= new Date(item.data.startAt).getTime() && tMs < endMs;
  }).length;
  return Math.max(1, span);
}

function formatDate(iso: string, locale: 'sl' | 'en'): string {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-GB' : 'sl-SI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimeRange(startAt: string, endAt: string, locale: 'sl' | 'en'): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  const localeCode = locale === 'en' ? 'en-GB' : 'sl-SI';
  return `${new Date(startAt).toLocaleTimeString(localeCode, opts)} – ${new Date(endAt).toLocaleTimeString(localeCode, opts)}`;
}

function groupByDay(items: GridItem[]): { date: string; daySessions: GridItem[] }[] {
  const map = new Map<string, GridItem[]>();
  for (const item of items) {
    const d = new Date(item.data.startAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySessions]) => ({ date, daySessions }));
}

function formatDayHeading(dateStr: string, locale: 'sl' | 'en'): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(locale === 'en' ? 'en-GB' : 'sl-SI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ConferenceProgramPage() {
  const t = useT();
  const locale = useLocale();
  const params = useParams();
  const eventId = params['id'] as string;
  const router = useRouter();
  const user = useStoredUser();

  const isAdminOrOrganizer =
    user?.role === 'admin' || user?.role === 'organizer';
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [guestEmail, setGuestEmail] = useState('');
  const [guestDisplayName, setGuestDisplayName] = useState('');
  const [invitingGuest, setInvitingGuest] = useState(false);
  const [guestInviteError, setGuestInviteError] = useState('');
  const [guestInviteSuccess, setGuestInviteSuccess] = useState('');

  const [conference, setConference] = useState<EventItem | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [careerSlots, setCareerSlots] = useState<CareerSlotItem[]>([]);
  // undefined = closed, null = create, CareerSlotItem = edit
  const [modalCareerSlot, setModalCareerSlot] = useState<CareerSlotItem | null | undefined>(undefined);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');

  const [registeringEvent, setRegisteringEvent] = useState(false);
  const [registerEventError, setRegisterEventError] = useState('');
  const [registeringIds, setRegisteringIds] = useState<
    Record<string, boolean>
  >({});
  const [registerErrors, setRegisterErrors] = useState<
    Record<string, string>
  >({});

  // undefined = closed, null = create new, SessionItem = edit existing
  const [modalSession, setModalSession] = useState<
    SessionItem | null | undefined
  >(undefined);

  const loadData = useCallback(async () => {
    if (!user?.idToken) return;
    setLoading(true);
    setError('');
    try {
      const [confRes, sessRes, careerRes] = await Promise.all([
        fetch(`${API}/events/${eventId}`, {
          headers: { Authorization: `Bearer ${user.idToken}` },
        }),
        fetch(`${API}/events/${eventId}/sessions`, {
          headers: { Authorization: `Bearer ${user.idToken}` },
        }),
        fetch(`${API}/events/${eventId}/career-slots`, {
          headers: { Authorization: `Bearer ${user.idToken}` },
        }),
      ]);
      if (!confRes.ok) throw new Error(t('eventDetail.error.notFound', 'Event not found.'));
      if (!sessRes.ok) throw new Error(t('eventDetail.error.loadProgram', 'Failed to load program.'));
      const confData = (await confRes.json()) as EventItem;
      const sessData = (await sessRes.json()) as SessionItem[];
      const careerData = careerRes.ok ? ((await careerRes.json()) as CareerSlotItem[]) : [];
      setConference(confData);
      setSessions(sessData);
      setCareerSlots(careerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.error.generic'));
    } finally {
      setLoading(false);
    }
  }, [user?.idToken, eventId, t]);

  useEffect(() => {
    void loadData();
    if (user?.idToken) void loadTags(user.idToken);
  }, [loadData, user?.idToken]);

  async function loadTags(token: string) {
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
  }

  async function handleEventRegister() {
    if (!user?.idToken || !conference) return;
    const isRegistered = conference.isRegistered;
    setRegisteringEvent(true);
    setRegisterEventError('');
    try {
      const res = await fetch(`${API}/events/${eventId}/register`, {
        method: isRegistered ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? t('events.error.register'));
      }
      setConference((prev) =>
        prev
          ? {
              ...prev,
              isRegistered: !isRegistered,
              registeredCount: isRegistered
                ? Math.max(0, prev.registeredCount - 1)
                : prev.registeredCount + 1,
            }
          : prev,
      );
    } catch (err) {
      setRegisterEventError(err instanceof Error ? err.message : t('events.error.register'));
    } finally {
      setRegisteringEvent(false);
    }
  }

  async function handleSessionRegister(sessionId: string) {
    if (!user?.idToken) return;
    setRegisteringIds((prev) => ({ ...prev, [sessionId]: true }));
    setRegisterErrors((prev) => ({ ...prev, [sessionId]: '' }));
    try {
      const res = await fetch(
        `${API}/events/${eventId}/sessions/${sessionId}/register`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${user.idToken}` },
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const msg = Array.isArray(body.message)
          ? body.message[0]
          : body.message;
        throw new Error(msg ?? t('events.error.register'));
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                isRegistered: true,
                registeredCount: s.registeredCount + 1,
              }
            : s,
        ),
      );
    } catch (err) {
      setRegisterErrors((prev) => ({
        ...prev,
        [sessionId]:
          err instanceof Error ? err.message : t('events.error.register'),
      }));
    } finally {
      setRegisteringIds((prev) => ({ ...prev, [sessionId]: false }));
    }
  }

  async function handleSessionCancel(sessionId: string) {
    if (!user?.idToken) return;
    setRegisteringIds((prev) => ({ ...prev, [sessionId]: true }));
    setRegisterErrors((prev) => ({ ...prev, [sessionId]: '' }));
    try {
      const res = await fetch(
        `${API}/events/${eventId}/sessions/${sessionId}/register`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.idToken}` },
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const msg = Array.isArray(body.message)
          ? body.message[0]
          : body.message;
        throw new Error(msg ?? t('events.error.cancel'));
      }
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                isRegistered: false,
                registeredCount: Math.max(0, s.registeredCount - 1),
              }
            : s,
        ),
      );
    } catch (err) {
      setRegisterErrors((prev) => ({
        ...prev,
        [sessionId]:
          err instanceof Error ? err.message : t('events.error.cancel'),
      }));
    } finally {
      setRegisteringIds((prev) => ({ ...prev, [sessionId]: false }));
    }
  }

  async function handleSessionSave(values: SessionFormValues) {
    if (!user?.idToken) return;
    const isEdit = modalSession != null;
    const url = isEdit
      ? `${API}/events/${eventId}/sessions/${modalSession.id}`
      : `${API}/events/${eventId}/sessions`;
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
      const body = (await res.json().catch(() => ({}))) as {
        message?: string | string[];
      };
      const msg = Array.isArray(body.message)
        ? body.message[0]
        : body.message;
      throw new Error(msg ?? t('events.error.save'));
    }
    await loadData();
  }

  async function handlePresenterResponse(
    sessionId: string,
    status: 'confirmed' | 'declined',
  ) {
    if (!user?.idToken) return;
    try {
      const res = await fetch(
        `${API}/events/${eventId}/sessions/${sessionId}/presenter-response`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${user.idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const msg = Array.isArray(body.message)
          ? body.message[0]
          : body.message;
        throw new Error(msg ?? t('events.error.generic'));
      }
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('events.error.generic'),
      );
    }
  }

  async function handleSessionDelete(sessionId: string) {
    if (
      !user?.idToken ||
      !confirm(t('eventDetail.confirmDeleteSession', 'Are you sure you want to delete this session?'))
    )
      return;
    try {
      const res = await fetch(
        `${API}/events/${eventId}/sessions/${sessionId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.idToken}` },
        },
      );
      if (!res.ok) throw new Error(t('events.error.delete'));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('events.error.delete'),
      );
    }
  }

  async function handleCareerSlotSave(values: CareerSlotFormValues) {
    if (!user?.idToken) return;
    const isEdit = modalCareerSlot != null;
    const url = isEdit
      ? `${API}/events/${eventId}/career-slots/${modalCareerSlot.id}`
      : `${API}/events/${eventId}/career-slots`;
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { Authorization: `Bearer ${user.idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      const msg = Array.isArray(body.message) ? body.message[0] : body.message;
      throw new Error(msg ?? t('events.error.save'));
    }
    await loadData();
  }

  async function handleCareerSlotDelete(slotId: string) {
    if (!user?.idToken || !confirm(t('eventDetail.confirmDeleteCareer', 'Are you sure you want to delete this career interview?'))) return;
    try {
      const res = await fetch(`${API}/events/${eventId}/career-slots/${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) throw new Error(t('events.error.delete'));
      setCareerSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.error.delete'));
    }
  }

  async function handleInviteGuest() {
    if (!user?.idToken || !guestEmail.trim()) return;

    setInvitingGuest(true);
    setGuestInviteError('');
    setGuestInviteSuccess('');

    try {
      const res = await fetch(`${API}/events/${eventId}/guests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          'Content-Type': 'application/json',
        },
       body: JSON.stringify({
          email: guestEmail.trim(),
          displayName: guestDisplayName.trim(),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };

        const msg = Array.isArray(body.message)
          ? body.message[0]
          : body.message;

        throw new Error(msg ?? 'Failed to invite guest');
      }

      setGuestInviteSuccess('Invitation sent');
      setGuestEmail('');
    } catch (err) {
      setGuestInviteError(
        err instanceof Error ? err.message : 'Failed to invite guest',
      );
    } finally {
      setInvitingGuest(false);
    }
  }

  async function handleExport(format: 'csv' | 'xlsx') {
    if (!user?.idToken) return;

    try {
      const res = await fetch(
        `${API}/events/${eventId}/registrations/export?format=${format}`,
        {
          headers: {
            Authorization: `Bearer ${user.idToken}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      a.href = url;
      a.download = `registrations-${eventId}.${format}`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  }

  async function handleImport(file: File) {
    if (!user?.idToken) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `${API}/events/${eventId}/registrations/import`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user.idToken}`,
          },
          body: formData,
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Import failed');
      }

      // refresh data after import
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  const tagMap = Object.fromEntries(tags.map((t) => [t.slug, t.label]));
  const allItems = toGridItems(sessions, careerSlots);
  const itemsByDay = groupByDay(allItems);

  return (
    <AppShell>
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push(isAdminOrOrganizer ? '/events' : '/home')}
        className="text-[12px] text-[#8e8e93] hover:text-[#0d0d0d] mb-4 flex items-center gap-1 bg-transparent border-0 cursor-pointer font-sans p-0"
      >
        ← {isAdminOrOrganizer ? t('events.title') : t('home.title', 'Novosti')}
      </button>
      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonProgram />
      ) : conference ? (
        <>
          {/* Conference header */}
          <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-5 mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-bold">{conference.title}</h2>
              <p className="text-[13px] text-[#6e6e73] mt-1">
                {conference.description}
              </p>
              <div className="flex gap-4 flex-wrap mt-3 text-[12px] text-[#8e8e93]">
                <span>
                  📅{' '}
                  {formatDate(conference.startAt, locale)} ·{' '}
                  {formatTimeRange(conference.startAt, conference.endAt, locale)}
                </span>
                <span>📍 {conference.location}</span>
                <span>
                  👥 {conference.registeredCount} / {conference.capacity}{' '}
                  {t('eventDetail.seats', 'seats')}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => void handleEventRegister()}
                disabled={registeringEvent}
                className={`text-[13px] font-semibold px-4 py-[8px] rounded-full border-0 cursor-pointer font-sans transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  conference.isRegistered
                    ? 'bg-[#ecfdf3] text-[#166534] hover:bg-[#d1fae5]'
                    : 'bg-[#0071e3] text-white hover:bg-[#0064cc]'
                }`}
              >
                {registeringEvent
                  ? '...'
                  : conference.isRegistered
                    ? `✓ ${t('eventDetail.registered', 'Registered')}`
                    : t('events.register', 'Register')}
              </button>
              {registerEventError && (
                <p className="text-[11px] text-[#dc2626] max-w-[180px] text-right">{registerEventError}</p>
              )}
            </div>
          </div>

          {/* Program grid */}
          <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-[0.06em] mb-3">
            {t('eventDetail.program', 'Program')}
          </p>

          {allItems.length === 0 ? (
            <div className="rounded-[14px] border border-[#f0f0f0] px-5 py-6 text-sm text-[#8e8e93]">
              {t('eventDetail.noSessions', 'No sessions yet.')}{' '}
              {isAdminOrOrganizer && t('eventDetail.addFirstSession', 'Add the first session below.')}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {itemsByDay.map(({ date, daySessions }) => {
                const { timeSlots, tracks } = buildGrid(daySessions);
                const claimedCells = new Set<string>();
                for (const slot of timeSlots) {
                  for (const track of tracks) {
                    if (claimedCells.has(`${slot}-${track}`)) continue;
                    const item = daySessions.find(
                      (i) => i.data.startAt === slot && i.data.location === track,
                    );
                    if (item) {
                      const span = getRowSpan(item, timeSlots);
                      const slotIdx = timeSlots.indexOf(slot);
                      for (let i = slotIdx + 1; i < slotIdx + span; i++) {
                        if (timeSlots[i]) claimedCells.add(`${timeSlots[i]}-${track}`);
                      }
                    }
                  }
                }

                return (
                  <div key={date}>
                    {itemsByDay.length > 1 && (
                      <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-[0.06em] mb-2">
                        {formatDayHeading(date, locale)}
                      </p>
                    )}
                    <div className="bg-white border border-[#e5e7eb] rounded-[16px] overflow-hidden">
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `56px repeat(${tracks.length}, 1fr)`,
                        }}
                      >
                        <div className="border-b border-[#e5e7eb] bg-[#fafafa]" />
                        {tracks.map((track) => (
                          <div
                            key={track}
                            className="border-b border-l border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-[11px] font-bold text-center"
                          >
                            {track}
                          </div>
                        ))}
                        {timeSlots.map((slot) => (
                          <React.Fragment key={slot}>
                            <div className="border-b border-[#f0f0f0] px-2 py-3 text-[10px] font-bold text-[#8e8e93] text-center flex items-start justify-center pt-3">
                              {new Date(slot).toLocaleTimeString(locale === 'en' ? 'en-GB' : 'sl-SI', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {tracks.map((track) => {
                              if (claimedCells.has(`${slot}-${track}`)) return null;
                              const item = daySessions.find(
                                (i) => i.data.startAt === slot && i.data.location === track,
                              );
                              if (item) {
                                const span = getRowSpan(item, timeSlots);
                                return (
                                  <div
                                    key={`cell-${slot}-${track}`}
                                    className="border-b border-l border-[#f0f0f0] p-[6px]"
                                    style={{ gridRow: `span ${span}` }}
                                  >
                                    {item.itemType === 'career' ? (
                                      <CareerSlotCard
                                        slot={item.data}
                                        currentUserUid={user?.uid ?? ''}
                                        isAdminOrOrganizer={isAdminOrOrganizer}
                                        eventId={eventId}
                                        token={user?.idToken ?? ''}
                                        onEdit={() => setModalCareerSlot(item.data)}
                                        onDelete={() => void handleCareerSlotDelete(item.data.id)}
                                        onRefresh={() => void loadData()}
                                      />
                                    ) : (
                                      <SessionCard
                                        session={item.data}
                                        tagMap={tagMap}
                                        isRegistering={Boolean(registeringIds[item.data.id])}
                                        registerError={registerErrors[item.data.id] ?? ''}
                                        onRegister={() => void handleSessionRegister(item.data.id)}
                                        onCancel={() => void handleSessionCancel(item.data.id)}
                                        isAdminOrOrganizer={isAdminOrOrganizer}
                                        onEdit={() => setModalSession(item.data)}
                                        onDelete={() => void handleSessionDelete(item.data.id)}
                                        currentUserUid={user?.uid}
                                        onPresenterConfirm={() => void handlePresenterResponse(item.data.id, 'confirmed')}
                                        onPresenterDecline={() => void handlePresenterResponse(item.data.id, 'declined')}
                                      />
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={`empty-${slot}-${track}`}
                                  className="border-b border-l border-[#f0f0f0] bg-[#fafafa]"
                                />
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add buttons */}
          {(isAdminOrOrganizer || user?.role === 'industry') && (
            <div className="flex flex-col gap-3 mt-4">

              {/* Primary actions */}
              <div className="flex gap-2">
                {isAdminOrOrganizer && (
                  <button
                    type="button"
                    onClick={() => setModalSession(null)}
                    className="flex-1 py-[10px] border-[1.5px] border-dashed border-[#d1d5db] rounded-[12px] text-[12px] font-semibold text-[#8e8e93] hover:border-[#0d0d0d] hover:text-[#0d0d0d] hover:bg-[#fafafa] transition-colors bg-transparent cursor-pointer font-sans"
                  >
                    + {t('eventDetail.addSession', 'Add session')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setModalCareerSlot(null)}
                  className="flex-1 py-[10px] border-[1.5px] border-dashed border-[#fcd34d] rounded-[12px] text-[12px] font-semibold text-[#92400e] hover:border-[#f59e0b] hover:bg-[#fffbeb] transition-colors bg-transparent cursor-pointer font-sans"
                >
                  + {t('eventDetail.addCareer', 'Add career interview')}
                </button>
              </div>

              {/* Divider spacing */}
              {isAdminOrOrganizer && (
                <div className="h-px bg-[#f0f0f0] my-1" />
              )}

              {/* Utility actions (Import / Export) */}
              {isAdminOrOrganizer && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-[9px] rounded-[12px] text-[12px] font-semibold text-[#1d4ed8] bg-[#eff6ff] border border-[#bfdbfe] hover:bg-[#dbeafe] transition flex items-center justify-center gap-1"
                  >
                    📥 {t('eventDetail.import', 'Import')}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleExport('csv')}
                    className="flex-1 py-[9px] rounded-[12px] text-[12px] font-semibold text-[#047857] bg-[#ecfdf5] border border-[#a7f3d0] hover:bg-[#d1fae5] transition flex items-center justify-center gap-1"
                  >
                    📤 {t('eventDetail.export', 'Csv')}
                  </button>
                  <button type="button" onClick={() => void handleExport('xlsx')} className="flex-1 py-[9px] rounded-[12px] text-[12px] font-semibold text-[#047857] bg-[#ecfdf5] border border-[#a7f3d0] hover:bg-[#d1fae5] transition flex items-center justify-center gap-1">
                    📊  Excel
                  </button>
                </div>
              )}
              <div className="h-px bg-[#f0f0f0] my-1" />
            
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Guest name"
                  value={guestDisplayName}
                  onChange={(e) => setGuestDisplayName(e.target.value)}
                  className="flex-1 px-3 py-[9px] rounded-[12px] border border-[#d1d5db]"
                />

                <input
                  type="email"
                  placeholder="Guest email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="flex-1 px-3 py-[9px] rounded-[12px] border border-[#d1d5db]"
                />

                <button
                  type="button"
                  onClick={() => void handleInviteGuest()}
                  disabled={!guestDisplayName.trim() || !guestEmail.trim()}
                  className="
                    px-4 py-[9px]
                    rounded-[12px]
                    text-[12px]
                    font-semibold
                    text-white
                    bg-[#0071e3]
                    hover:bg-[#0064cc]
                    disabled:bg-[#93c5fd]
                    disabled:cursor-not-allowed
                    transition
                    flex items-center
                    justify-center
                    gap-1
                  "
                >
                  ✉️ Invite
                </button>
            </div>

            {guestInviteError && (
              <p className="text-[11px] text-[#dc2626]">
                {guestInviteError}
              </p>
            )}

            {guestInviteSuccess && (
              <p className="text-[11px] text-[#16a34a]">
                {guestInviteSuccess}
              </p>
            )}
            </div>
          )}
        </>
      ) : null}

      {/* Session modal */}
      {modalSession !== undefined && conference && (
        <SessionFormModal
          key={modalSession?.id ?? 'create'}
          session={modalSession}
          token={user?.idToken ?? ''}
          eventStartAt={conference.startAt}
          eventEndAt={conference.endAt}
          onClose={() => setModalSession(undefined)}
          onSave={handleSessionSave}
        />
      )}

      {/* Career slot modal */}
      {modalCareerSlot !== undefined && conference && (
        <CareerSlotFormModal
          key={modalCareerSlot?.id ?? 'create-career'}
          slot={modalCareerSlot}
          token={user?.idToken ?? ''}
          eventStartAt={conference.startAt}
          eventEndAt={conference.endAt}
          onClose={() => setModalCareerSlot(undefined)}
          onSave={handleCareerSlotSave}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImport(file);
          e.target.value = '';
        }}
      />
    </AppShell>
  );
}


function SkeletonProgram() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-5 animate-pulse">
        <div className="h-[22px] w-[200px] bg-[#f0f0f0] rounded mb-3" />
        <div className="h-[13px] w-[300px] bg-[#f0f0f0] rounded mb-3" />
        <div className="h-[12px] w-[250px] bg-[#f0f0f0] rounded" />
      </div>
      <div className="bg-white border border-[#e5e7eb] rounded-[16px] p-4 animate-pulse h-[200px]" />
    </div>
  );
}

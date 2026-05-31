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
  return { timeSlots: [...timeSet].sort(), tracks: [...trackSet].sort() };
}

function getRowSpan(item: GridItem, timeSlots: string[]): number {
  const endMs = new Date(item.data.endAt).getTime();
  const span = timeSlots.filter((t) => {
    const tMs = new Date(t).getTime();
    return tMs >= new Date(item.data.startAt).getTime() && tMs < endMs;
  }).length;
  return Math.max(1, span);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sl-SI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimeRange(startAt: string, endAt: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  return `${new Date(startAt).toLocaleTimeString('sl-SI', opts)} – ${new Date(endAt).toLocaleTimeString('sl-SI', opts)}`;
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

function formatDayHeading(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('sl-SI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ConferenceProgramPage() {
  const params = useParams();
  const eventId = params['id'] as string;
  const router = useRouter();
  const user = useStoredUser();
  const isAdminOrOrganizer =
    user?.role === 'admin' || user?.role === 'organizer';

  const [conference, setConference] = useState<EventItem | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [careerSlots, setCareerSlots] = useState<CareerSlotItem[]>([]);
  // undefined = closed, null = create, CareerSlotItem = edit
  const [modalCareerSlot, setModalCareerSlot] = useState<CareerSlotItem | null | undefined>(undefined);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      if (!confRes.ok) throw new Error('Konferenca ni bila najdena.');
      if (!sessRes.ok) throw new Error('Napaka pri nalaganju programa.');
      const confData = (await confRes.json()) as EventItem;
      const sessData = (await sessRes.json()) as SessionItem[];
      const careerData = careerRes.ok ? ((await careerRes.json()) as CareerSlotItem[]) : [];
      setConference(confData);
      setSessions(sessData);
      setCareerSlots(careerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prišlo je do napake.');
    } finally {
      setLoading(false);
    }
  }, [user?.idToken, eventId]);

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
        throw new Error(msg ?? 'Napaka pri prijavi.');
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
          err instanceof Error ? err.message : 'Napaka pri prijavi.',
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
        throw new Error(msg ?? 'Napaka pri odjavi.');
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
          err instanceof Error ? err.message : 'Napaka pri odjavi.',
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
      throw new Error(msg ?? 'Napaka pri shranjevanju.');
    }
    await loadData();
  }

  async function handleSessionDelete(sessionId: string) {
    if (
      !user?.idToken ||
      !confirm('Ste prepričani, da želite izbrisati to sejo?')
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
      if (!res.ok) throw new Error('Napaka pri brisanju.');
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Napaka pri brisanju.',
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
      throw new Error(msg ?? 'Napaka pri shranjevanju.');
    }
    await loadData();
  }

  async function handleCareerSlotDelete(slotId: string) {
    if (!user?.idToken || !confirm('Ste prepričani, da želite izbrisati ta razgovor?')) return;
    try {
      const res = await fetch(`${API}/events/${eventId}/career-slots/${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) throw new Error('Napaka pri brisanju.');
      setCareerSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Napaka pri brisanju.');
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
        onClick={() => router.push('/events')}
        className="text-[12px] text-[#8e8e93] hover:text-[#0d0d0d] mb-4 flex items-center gap-1 bg-transparent border-0 cursor-pointer font-sans p-0"
      >
        ← Dogodki
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
                  {formatDate(conference.startAt)} ·{' '}
                  {formatTimeRange(conference.startAt, conference.endAt)}
                </span>
                <span>📍 {conference.location}</span>
                <span>
                  👥 {conference.registeredCount} / {conference.capacity}{' '}
                  mest
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              {conference.isRegistered ? (
                <span className="bg-[#ecfdf3] text-[#166534] text-[11px] font-semibold px-3 py-[6px] rounded-full">
                  ✓ Prijavljen/a
                </span>
              ) : (
                <span className="bg-[#f3f4f6] text-[#6b7280] text-[11px] font-semibold px-3 py-[6px] rounded-full">
                  Ni prijavljen/a
                </span>
              )}
            </div>
          </div>

          {/* Program grid */}
          <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-[0.06em] mb-3">
            Program
          </p>

          {allItems.length === 0 ? (
            <div className="rounded-[14px] border border-[#f0f0f0] px-5 py-6 text-sm text-[#8e8e93]">
              Ni dodanih sej.{' '}
              {isAdminOrOrganizer && 'Dodajte prvo sejo spodaj.'}
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
                        {formatDayHeading(date)}
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
                              {new Date(slot).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
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
            <div className="flex gap-2 mt-4">
              {isAdminOrOrganizer && (
                <button
                  type="button"
                  onClick={() => setModalSession(null)}
                  className="flex-1 py-[10px] border-[1.5px] border-dashed border-[#d1d5db] rounded-[12px] text-[12px] font-semibold text-[#8e8e93] hover:border-[#0d0d0d] hover:text-[#0d0d0d] hover:bg-[#fafafa] transition-colors bg-transparent cursor-pointer font-sans"
                >
                  + Dodaj sejo
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalCareerSlot(null)}
                className="flex-1 py-[10px] border-[1.5px] border-dashed border-[#fcd34d] rounded-[12px] text-[12px] font-semibold text-[#92400e] hover:border-[#f59e0b] hover:bg-[#fffbeb] transition-colors bg-transparent cursor-pointer font-sans"
              >
                + Dodaj karierni razgovor
              </button>
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

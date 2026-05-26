'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import SessionCard, { type SessionItem } from '../../components/SessionCard';
// Temporary stub until SessionFormModal is created in Task 7
type SessionFormValues = { title: string; description: string; speakers: unknown[]; startAt: string; endAt: string; location: string; capacity: number | null };
const SessionFormModal = ({ session: _s, onClose: _c, onSave: _v }: { session: SessionItem | null; onClose: () => void; onSave: (v: SessionFormValues) => Promise<void> }) => null;
import { type EventItem } from '../../components/EventCard';
import { useStoredUser } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// Derive sorted unique time-slot labels and track columns from sessions
function buildGrid(sessions: SessionItem[]): {
  timeSlots: string[];
  tracks: string[];
} {
  const timeSet = new Set(sessions.map((s) => s.startAt));
  const trackSet = new Set(sessions.map((s) => s.location));
  return {
    timeSlots: [...timeSet].sort(),
    tracks: [...trackSet].sort(),
  };
}

// How many time-slot rows does this session span?
function getRowSpan(session: SessionItem, timeSlots: string[]): number {
  const endMs = new Date(session.endAt).getTime();
  const span = timeSlots.filter((t) => {
    const tMs = new Date(t).getTime();
    return tMs >= new Date(session.startAt).getTime() && tMs < endMs;
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

export default function ConferenceProgramPage() {
  const params = useParams();
  const eventId = params['id'] as string;
  const router = useRouter();
  const user = useStoredUser();
  const isAdminOrOrganizer =
    user?.role === 'admin' || user?.role === 'organizer';

  const [conference, setConference] = useState<EventItem | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
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
      const [confRes, sessRes] = await Promise.all([
        fetch(`${API}/events/${eventId}`, {
          headers: { Authorization: `Bearer ${user.idToken}` },
        }),
        fetch(`${API}/events/${eventId}/sessions`, {
          headers: { Authorization: `Bearer ${user.idToken}` },
        }),
      ]);
      if (!confRes.ok) throw new Error('Konferenca ni bila najdena.');
      if (!sessRes.ok) throw new Error('Napaka pri nalaganju programa.');
      const confData = (await confRes.json()) as EventItem;
      const sessData = (await sessRes.json()) as SessionItem[];
      setConference(confData);
      setSessions(sessData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prišlo je do napake.');
    } finally {
      setLoading(false);
    }
  }, [user?.idToken, eventId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  const { timeSlots, tracks } = buildGrid(sessions);

  // Track which sessions have been rendered (to avoid repeating spanned ones)
  const renderedSessionIds = new Set<string>();

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

          {sessions.length === 0 ? (
            <div className="rounded-[14px] border border-[#f0f0f0] px-5 py-6 text-sm text-[#8e8e93]">
              Ni dodanih sej.{' '}
              {isAdminOrOrganizer && 'Dodajte prvo sejo spodaj.'}
            </div>
          ) : (
            <div className="bg-white border border-[#e5e7eb] rounded-[16px] overflow-hidden">
              {/* Grid: time col + one col per track */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `56px repeat(${tracks.length}, 1fr)`,
                }}
              >
                {/* Header row */}
                <div className="border-b border-[#e5e7eb] bg-[#fafafa]" />
                {tracks.map((track) => (
                  <div
                    key={track}
                    className="border-b border-l border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-[11px] font-bold text-center"
                  >
                    {track}
                  </div>
                ))}

                {/* Time rows */}
                {timeSlots.map((slot) => (
                  <>
                    {/* Time label */}
                    <div
                      key={`time-${slot}`}
                      className="border-b border-[#f0f0f0] px-2 py-3 text-[10px] font-bold text-[#8e8e93] text-center flex items-start justify-center pt-3"
                    >
                      {new Date(slot).toLocaleTimeString('sl-SI', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>

                    {/* Track cells */}
                    {tracks.map((track) => {
                      const session = sessions.find(
                        (s) =>
                          s.startAt === slot &&
                          s.location === track &&
                          !renderedSessionIds.has(s.id),
                      );

                      if (session) {
                        renderedSessionIds.add(session.id);
                        const span = getRowSpan(session, timeSlots);
                        return (
                          <div
                            key={`cell-${slot}-${track}`}
                            className="border-b border-l border-[#f0f0f0] p-[6px]"
                            style={{ gridRow: `span ${span}` }}
                          >
                            <SessionCard
                              session={session}
                              isRegistering={
                                Boolean(registeringIds[session.id])
                              }
                              registerError={
                                registerErrors[session.id] ?? ''
                              }
                              onRegister={() =>
                                void handleSessionRegister(session.id)
                              }
                              onCancel={() =>
                                void handleSessionCancel(session.id)
                              }
                              isAdminOrOrganizer={isAdminOrOrganizer}
                              onEdit={() => setModalSession(session)}
                              onDelete={() =>
                                void handleSessionDelete(session.id)
                              }
                            />
                          </div>
                        );
                      }

                      // Empty cell (skip if session above spans into this row)
                      return (
                        <div
                          key={`empty-${slot}-${track}`}
                          className="border-b border-l border-[#f0f0f0] bg-[#fafafa]"
                        />
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          )}

          {/* Admin add button */}
          {isAdminOrOrganizer && (
            <button
              type="button"
              onClick={() => setModalSession(null)}
              className="mt-4 w-full py-[10px] border-[1.5px] border-dashed border-[#d1d5db] rounded-[12px] text-[12px] font-semibold text-[#8e8e93] hover:border-[#0d0d0d] hover:text-[#0d0d0d] hover:bg-[#fafafa] transition-colors bg-transparent cursor-pointer font-sans"
            >
              + Dodaj sejo
            </button>
          )}
        </>
      ) : null}

      {/* Session modal */}
      {modalSession !== undefined && (
        <SessionFormModal
          key={modalSession?.id ?? 'create'}
          session={modalSession}
          onClose={() => setModalSession(undefined)}
          onSave={handleSessionSave}
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

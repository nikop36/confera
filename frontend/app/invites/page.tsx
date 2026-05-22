'use client';

import { useEffect, useState, type ReactNode } from 'react';
import AppShell from '../components/AppShell';
import { useStoredUser } from '../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type InviteStatus = 'pending' | 'accepted' | 'rejected';
type InterviewStatus =
  | 'draft'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

type InviteItem = {
  id: string;
  status: InterviewStatus;
  invitationStatus: InviteStatus;
  notes?: string;
  candidate: {
    uid: string;
    displayName?: string;
    email?: string;
  };
  interviewer: {
    uid: string;
    displayName?: string;
    email?: string;
  };
  slot: {
    id: string;
    startAt: string | { _seconds?: number; seconds?: number };
    endAt: string | { _seconds?: number; seconds?: number };
  } | null;
  room: {
    id: string;
    name: string;
  } | null;
  createdAt?: string | { _seconds?: number; seconds?: number };
};

type InvitesPayload = {
  pendingCount: number;
  pending: InviteItem[];
};

export default function InvitesPage() {
  const user = useStoredUser();
  const [payload, setPayload] = useState<InvitesPayload>({
    pendingCount: 0,
    pending: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.idToken) return;

    async function load(token: string) {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API}/invites/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const message = Array.isArray(body.message) ? body.message[0] : body.message;
          throw new Error(message ?? 'Failed to load invites');
        }
        const data = (await response.json()) as InvitesPayload;
        setPayload(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invites');
      } finally {
        setLoading(false);
      }
    }

    void load(user.idToken);
  }, [user?.idToken]);

  async function handleRespond(inviteId: string, action: 'accepted' | 'rejected') {
    if (!user?.idToken) return;
    setActingId(inviteId);
    setError('');
    try {
      const response = await fetch(`${API}/invites/${inviteId}/respond`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(message ?? 'Failed to update invite');
      }

      setPayload((prev) => {
        const item = prev.pending.find((invite) => invite.id === inviteId);
        if (!item) return prev;
        return {
          ...prev,
          pendingCount: Math.max(0, prev.pendingCount - 1),
          pending: prev.pending.filter((invite) => invite.id !== inviteId),
        };
      });
      window.dispatchEvent(new Event('invites:refresh'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActingId(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">Povabila</h2>
        <p className="text-[13px] text-[#8e8e93] mt-1">
          Tukaj so prikazana samo nova povabila, ki čakajo na vaš odgovor.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      <section className="mb-6">
        <h3 className="text-[16px] font-semibold mb-3">
          Čakajoča povabila ({payload.pending.length})
        </h3>
        {loading ? (
          <div className="rounded-[12px] bg-[#f7f7f7] px-4 py-3 text-sm text-[#8e8e93]">
            Nalaganje povabil...
          </div>
        ) : payload.pending.length === 0 ? (
          <div className="rounded-[12px] border border-[#f0f0f0] px-4 py-4 text-sm text-[#8e8e93]">
            Trenutno ni novih povabil.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {payload.pending.map((invite) => (
              <InviteCard
                key={invite.id}
                invite={invite}
                actions={
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actingId === invite.id}
                      onClick={() => void handleRespond(invite.id, 'accepted')}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#d1fae5] bg-[#ecfdf3] text-[#166534] disabled:opacity-40"
                    >
                      Sprejmi
                    </button>
                    <button
                      type="button"
                      disabled={actingId === invite.id}
                      onClick={() => void handleRespond(invite.id, 'rejected')}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#fecaca] bg-[#fff1f2] text-[#b91c1c] disabled:opacity-40"
                    >
                      Zavrni
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function InviteCard({
  invite,
  actions,
  counterpartRole = 'interviewer',
}: {
  invite: InviteItem;
  actions: ReactNode;
  counterpartRole?: 'candidate' | 'interviewer';
}) {
  const person =
    counterpartRole === 'candidate' ? invite.candidate : invite.interviewer;
  const personName =
    person.displayName ??
    (counterpartRole === 'candidate' ? 'Neznan kandidat' : 'Neznan sogovornik');
  const personEmail = person.email ?? '';
  const timeRange = formatSlotRange(invite.slot);
  const roomName = invite.room?.name ?? 'N/A';

  return (
    <div className="rounded-[12px] border border-[#f0f0f0] px-4 py-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-[#f0f7ff] text-[#2563eb] text-xs font-bold flex items-center justify-center shrink-0">
        {personName
          .split(' ')
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#0d0d0d] truncate">
          {personName}
        </p>
        <p className="text-[12px] text-[#8e8e93] truncate">{personEmail}</p>
        <p className="mt-1 text-[12px] text-[#3d3d3d]">
          Termin: <span className="font-medium">{timeRange}</span>
        </p>
        <p className="text-[12px] text-[#3d3d3d]">
          Prostor: <span className="font-medium">{roomName}</span>
        </p>
        {invite.notes && (
          <p className="mt-1 text-[12px] text-[#6e6e73] line-clamp-2">{invite.notes}</p>
        )}
      </div>
      <div className="shrink-0">{actions}</div>
    </div>
  );
}

function formatSlotRange(
  slot: InviteItem['slot'],
): string {
  if (!slot) return 'Ni termina';
  const start = toDate(slot.startAt);
  const end = toDate(slot.endAt);
  if (!start || !end) return 'Neveljaven termin';
  return `${start.toLocaleString('sl-SI')} - ${end.toLocaleString('sl-SI')}`;
}

function toDate(value: string | { _seconds?: number; seconds?: number }): Date | null {
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const seconds = value._seconds ?? value.seconds;
  if (typeof seconds !== 'number') return null;
  return new Date(seconds * 1000);
}

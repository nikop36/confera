'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '../components/AppShell';
import { useStoredUser } from '../lib/auth';
import { useLocale, useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type InviteStatus = 'pending' | 'accepted' | 'rejected';

type InviteItem = {
  id: string;
  invitationStatus: InviteStatus;
  notes?: string;
  candidate: { uid: string; displayName?: string; email?: string };
  interviewer: { uid: string; displayName?: string; email?: string };
  slot: {
    startAt: string | { _seconds?: number; seconds?: number };
    endAt: string | { _seconds?: number; seconds?: number };
  } | null;
  room: { name: string } | null;
};

type InvitesPayload = {
  processed: InviteItem[];
  interviewerPending: InviteItem[];
  interviewerProcessed: InviteItem[];
};

export default function MeetingsPage() {
  const user = useStoredUser();
  const t = useT();
  const locale = useLocale();
  const [data, setData] = useState<InvitesPayload>({
    processed: [],
    interviewerPending: [],
    interviewerProcessed: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          const message = Array.isArray(body.message)
            ? body.message[0]
            : body.message;
          throw new Error(
            message ?? t('meetings.error.load', 'Failed to load meetings'),
          );
        }
        const payload = (await response.json()) as InvitesPayload;
        setData(payload);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('meetings.error.load', 'Failed to load meetings'),
        );
      } finally {
        setLoading(false);
      }
    }

    void load(user.idToken);
  }, [user?.idToken, t]);

  const candidateInterviews = useMemo(
    () => data.processed.filter((item) => item.invitationStatus === 'accepted'),
    [data.processed],
  );
  const interviewerInterviews = useMemo(
    () => [...data.interviewerPending, ...data.interviewerProcessed],
    [data.interviewerPending, data.interviewerProcessed],
  );

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">{t('meetings.title')}</h2>
        <p className="text-[13px] text-[#8e8e93] mt-1">
          {t('meetings.subtitle')}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      <section className="mb-6">
        <h3 className="text-[16px] font-semibold mb-3">
          {t('meetings.mine')} ({candidateInterviews.length})
        </h3>
        {loading ? (
          <EmptyCard text={t('meetings.loading')} />
        ) : candidateInterviews.length === 0 ? (
          <EmptyCard text={t('meetings.noneConfirmed')} />
        ) : (
          <div className="flex flex-col gap-2">
            {candidateInterviews.map((item) => (
              <MeetingCard
                key={`candidate-${item.id}`}
                personLabel={t('meetings.interviewer')}
                personName={item.interviewer.displayName ?? 'Neznan'}
                personEmail={item.interviewer.email ?? ''}
                personUid={item.interviewer.uid}
                slot={item.slot}
                roomName={item.room?.name ?? 'N/A'}
                notes={item.notes}
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-[16px] font-semibold mb-3">
          {t('meetings.asInterviewer')} ({interviewerInterviews.length})
        </h3>
        {loading ? (
          <EmptyCard text={t('meetings.loading')} />
        ) : interviewerInterviews.length === 0 ? (
          <EmptyCard text={t('meetings.noneInterviewer')} />
        ) : (
          <div className="flex flex-col gap-2">
            {interviewerInterviews.map((item) => (
              <MeetingCard
                key={`interviewer-${item.id}`}
                personLabel={t('meetings.candidate')}
                personName={item.candidate.displayName ?? 'Neznan'}
                personEmail={item.candidate.email ?? ''}
                personUid={item.candidate.uid}
                slot={item.slot}
                roomName={item.room?.name ?? 'N/A'}
                notes={item.notes}
                status={item.invitationStatus}
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[12px] border border-[#f0f0f0] px-4 py-4 text-sm text-[#8e8e93]">
      {text}
    </div>
  );
}

function MeetingCard({
  personLabel,
  personName,
  personEmail,
  personUid,
  slot,
  roomName,
  notes,
  status,
  locale,
}: {
  personLabel: string;
  personName: string;
  personEmail: string;
  personUid?: string;
  slot: InviteItem['slot'];
  roomName: string;
  notes?: string;
  status?: InviteStatus;
  locale: 'sl' | 'en';
}) {
  const t = useT();
  return (
    <div className="rounded-[12px] border border-[#f0f0f0] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] text-[#8e8e93]">{personLabel}</p>
          {personUid ? (
            <Link href={`/profile/${personUid}`} className="text-[14px] font-semibold text-[#0d0d0d] truncate block no-underline hover:underline">
              {personName}
            </Link>
          ) : (
            <p className="text-[14px] font-semibold text-[#0d0d0d] truncate">{personName}</p>
          )}
          <p className="text-[12px] text-[#8e8e93] truncate">{personEmail}</p>
        </div>
        {status && <StatusPill status={status} />}
      </div>
      <p className="mt-2 text-[12px] text-[#3d3d3d]">
        {t('invites.slot')}: <span className="font-medium">{formatSlotRange(slot, locale)}</span>
      </p>
      <p className="text-[12px] text-[#3d3d3d]">
        {t('invites.room')}: <span className="font-medium">{roomName}</span>
      </p>
      {notes && <p className="mt-1 text-[12px] text-[#6e6e73]">{notes}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: InviteStatus }) {
  const t = useT();
  const className =
    status === 'accepted'
      ? 'bg-[#ecfdf3] text-[#166534]'
      : status === 'rejected'
        ? 'bg-[#fff1f2] text-[#b91c1c]'
        : 'bg-[#eff6ff] text-[#1d4ed8]';
  const label =
    status === 'accepted'
      ? t('meetings.accepted')
      : status === 'rejected'
        ? t('meetings.rejected')
        : t('meetings.pending');
  return (
    <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

function formatSlotRange(slot: InviteItem['slot'], locale: 'sl' | 'en'): string {
  if (!slot) return locale === 'en' ? 'No slot' : 'Ni termina';
  const start = toDate(slot.startAt);
  const end = toDate(slot.endAt);
  if (!start || !end) return locale === 'en' ? 'Invalid slot' : 'Neveljaven termin';
  const localeCode = locale === 'en' ? 'en-GB' : 'sl-SI';
  return `${start.toLocaleString(localeCode)} - ${end.toLocaleString(localeCode)}`;
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

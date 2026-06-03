'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '../components/AppShell';
import { useStoredUser } from '../lib/auth';
import { useLocale, useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type CareerBooking = {
  id: string;
  eventId: string;
  eventTitle: string;
  slotId: string;
  slotTitle: string;
  location: string;
  slotStartAt: string;
  slotEndAt: string;
  capacity: number;
  subSlotIndex: number;
  industryMemberUid: string;
  industryMemberName: string;
};

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

function deriveSubSlotTimes(booking: CareerBooking): { start: Date; end: Date } | null {
  const slotStart = new Date(booking.slotStartAt).getTime();
  const slotEnd = new Date(booking.slotEndAt).getTime();
  if (Number.isNaN(slotStart) || Number.isNaN(slotEnd)) return null;
  const durationMin = Math.floor((slotEnd - slotStart) / 60000 / booking.capacity);
  return {
    start: new Date(slotStart + booking.subSlotIndex * durationMin * 60000),
    end: new Date(slotStart + (booking.subSlotIndex + 1) * durationMin * 60000),
  };
}

function toDate(value: string | { _seconds?: number; seconds?: number }): Date | null {
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const seconds = value._seconds ?? value.seconds;
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

function formatDate(slot: InviteItem['slot'], locale: 'sl' | 'en'): string {
  if (!slot) return '—';
  const d = toDate(slot.startAt);
  if (!d) return '—';
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'sl-SI', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(slot: InviteItem['slot'], locale: 'sl' | 'en'): string {
  if (!slot) return '—';
  const start = toDate(slot.startAt);
  const end = toDate(slot.endAt);
  if (!start || !end) return '—';
  const lc = locale === 'en' ? 'en-GB' : 'sl-SI';
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${start.toLocaleTimeString(lc, opts)} – ${end.toLocaleTimeString(lc, opts)}`;
}

export default function MeetingsPage() {
  const user = useStoredUser();
  const t = useT();
  const locale = useLocale();
  const isParticipant = user?.role === 'participant';

  const [data, setData] = useState<InvitesPayload>({
    processed: [],
    interviewerPending: [],
    interviewerProcessed: [],
  });
  const [careerBookings, setCareerBookings] = useState<CareerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.idToken) return;
    async function load(token: string) {
      setLoading(true);
      setError('');
      try {
        const [invitesRes, bookingsRes] = await Promise.allSettled([
          fetch(`${API}/invites/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/career-bookings/me`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (invitesRes.status === 'rejected' || !invitesRes.value.ok) {
          const body = invitesRes.status === 'fulfilled'
            ? await invitesRes.value.json().catch(() => ({}))
            : {};
          const msg = Array.isArray(body.message) ? body.message[0] : body.message;
          throw new Error(msg ?? t('meetings.error.load', 'Failed to load meetings'));
        }

        setData((await invitesRes.value.json()) as InvitesPayload);

        if (bookingsRes.status === 'fulfilled' && bookingsRes.value.ok) {
          setCareerBookings((await bookingsRes.value.json()) as CareerBooking[]);
        } else if (bookingsRes.status === 'rejected') {
          console.error('Career bookings fetch failed:', bookingsRes.reason);
        } else if (!bookingsRes.value.ok) {
          const body = await bookingsRes.value.json().catch(() => ({}));
          console.error('Career bookings error:', body);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('meetings.error.load', 'Failed to load meetings'));
      } finally {
        setLoading(false);
      }
    }
    void load(user.idToken);
  }, [user?.idToken, t]);

  const confirmedAsCandidate = useMemo(
    () => data.processed.filter((i) => i.invitationStatus === 'accepted'),
    [data.processed],
  );
  const asInterviewer = useMemo(
    () => [...data.interviewerPending, ...data.interviewerProcessed],
    [data.interviewerPending, data.interviewerProcessed],
  );

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">{t('meetings.title')}</h2>
        <p className="text-[13px] text-[#8e8e93] mt-1">{t('meetings.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">{error}</div>
      )}

      {/* Confirmed interviews — shown to everyone */}
      <section className="mb-6">
        <h3 className="text-[15px] font-semibold text-[#0d0d0d] mb-3">
          {isParticipant ? 'Moja potrjena srečanja' : t('meetings.mine')}
          <span className="ml-2 text-[13px] font-normal text-[#8e8e93]">({confirmedAsCandidate.length})</span>
        </h3>
        {loading ? (
          <SkeletonCards />
        ) : confirmedAsCandidate.length === 0 ? (
          <div className="rounded-[12px] border border-[#f0f0f0] px-4 py-5 text-sm text-[#8e8e93]">
            {t('meetings.noneConfirmed')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {confirmedAsCandidate.map((item) => (
              <InterviewCard
                key={item.id}
                item={item}
                role="candidate"
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>

      {/* Career slot bookings */}
      {(isParticipant || careerBookings.length > 0) && (
        <section className="mb-6">
          <h3 className="text-[15px] font-semibold text-[#0d0d0d] mb-3">
            Karierni razgovori
            <span className="ml-2 text-[13px] font-normal text-[#8e8e93]">({careerBookings.length})</span>
          </h3>
          {loading ? (
            <SkeletonCards />
          ) : careerBookings.length === 0 ? (
            <div className="rounded-[12px] border border-[#f0f0f0] px-4 py-5 text-sm text-[#8e8e93]">
              Nimate še potrjenih kariernih razgovorov.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {careerBookings.map((booking) => {
                const times = deriveSubSlotTimes(booking);
                const lc = locale === 'en' ? 'en-GB' : 'sl-SI';
                const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
                return (
                  <div key={booking.id} className="rounded-[14px] border border-[#e5e7eb] bg-white overflow-hidden">
                    <div className="bg-gradient-to-r from-[#fffbeb] to-[#fef9c3] px-4 py-3 flex items-center justify-between gap-3 border-b border-[#e5e7eb]">
                      <div className="flex flex-col gap-[2px]">
                        <div className="flex items-center gap-[6px] text-[13px] font-semibold text-[#0d0d0d]">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#d97706]">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                          </svg>
                          {times
                            ? times.start.toLocaleDateString(lc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                            : new Date(booking.slotStartAt).toLocaleDateString(lc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-[6px] text-[12px] text-[#d97706] font-semibold">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                          </svg>
                          {times
                            ? `${times.start.toLocaleTimeString(lc, timeOpts)} – ${times.end.toLocaleTimeString(lc, timeOpts)}`
                            : '—'}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-[#92400e] bg-[#fef3c7] px-2 py-[3px] rounded-full shrink-0">💼 Karierni</span>
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-[6px]">
                      <div className="flex items-center gap-[6px] text-[12px] text-[#374151]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#9ca3af]">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="font-medium">{booking.location}</span>
                      </div>
                      <div className="flex items-center gap-[6px] text-[12px] text-[#374151]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#9ca3af]">
                          <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                        </svg>
                        <span className="text-[#8e8e93]">Razgovor z:</span>
                        <Link href={`/profile/${booking.industryMemberUid}`} className="font-semibold text-[#0d0d0d] hover:underline no-underline">
                          {booking.industryMemberName}
                        </Link>
                      </div>
                      <div className="flex items-center gap-[6px] text-[12px] text-[#8e8e93]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01" />
                        </svg>
                        {booking.slotTitle} · {booking.eventTitle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Interviewer section — hidden for participants */}
      {!isParticipant && (
        <section>
          <h3 className="text-[15px] font-semibold text-[#0d0d0d] mb-3">
            {t('meetings.asInterviewer')}
            <span className="ml-2 text-[13px] font-normal text-[#8e8e93]">({asInterviewer.length})</span>
          </h3>
          {loading ? (
            <SkeletonCards />
          ) : asInterviewer.length === 0 ? (
            <div className="rounded-[12px] border border-[#f0f0f0] px-4 py-5 text-sm text-[#8e8e93]">
              {t('meetings.noneInterviewer')}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {asInterviewer.map((item) => (
                <InterviewCard
                  key={item.id}
                  item={item}
                  role="interviewer"
                  locale={locale}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}

function InterviewCard({
  item,
  role,
  locale,
}: {
  item: InviteItem;
  role: 'candidate' | 'interviewer';
  locale: 'sl' | 'en';
}) {
  const t = useT();
  const person = role === 'candidate' ? item.interviewer : item.candidate;
  const personLabel = role === 'candidate' ? t('meetings.interviewer') : t('meetings.candidate');

  return (
    <div className="rounded-[14px] border border-[#e5e7eb] bg-white overflow-hidden">
      {/* Colour accent bar + date/time row */}
      <div className="bg-gradient-to-r from-[#f0f7ff] to-[#faf5ff] px-4 py-3 flex items-center justify-between gap-3 border-b border-[#e5e7eb]">
        <div className="flex flex-col gap-[2px]">
          <div className="flex items-center gap-[6px] text-[13px] font-semibold text-[#0d0d0d]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#6366f1]">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {formatDate(item.slot, locale)}
          </div>
          <div className="flex items-center gap-[6px] text-[12px] text-[#6366f1] font-semibold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            {formatTime(item.slot, locale)}
          </div>
        </div>
        {item.invitationStatus !== 'accepted' && (
          <StatusPill status={item.invitationStatus} />
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-[6px]">
        {/* Location */}
        <div className="flex items-center gap-[6px] text-[12px] text-[#374151]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#9ca3af]">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <span className="font-medium">{item.room?.name ?? '—'}</span>
        </div>

        {/* Person */}
        <div className="flex items-center gap-[6px] text-[12px] text-[#374151]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#9ca3af]">
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <span className="text-[#8e8e93]">{personLabel}:</span>
          {person.uid ? (
            <Link href={`/profile/${person.uid}`} className="font-semibold text-[#0d0d0d] hover:underline no-underline">
              {person.displayName ?? '—'}
            </Link>
          ) : (
            <span className="font-semibold">{person.displayName ?? '—'}</span>
          )}
        </div>

        {/* Notes */}
        {item.notes && (
          <p className="text-[12px] text-[#6e6e73] mt-1 leading-relaxed border-t border-[#f0f0f0] pt-2">
            {item.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: InviteStatus }) {
  const t = useT();
  const styles =
    status === 'accepted' ? 'bg-[#ecfdf3] text-[#166534]' :
    status === 'rejected' ? 'bg-[#fff1f2] text-[#b91c1c]' :
    'bg-[#eff6ff] text-[#1d4ed8]';
  const label =
    status === 'accepted' ? t('meetings.accepted') :
    status === 'rejected' ? t('meetings.rejected') :
    t('meetings.pending');
  return (
    <span className={`px-2.5 py-[5px] rounded-full text-[11px] font-semibold shrink-0 ${styles}`}>
      {label}
    </span>
  );
}

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-[14px] border border-[#e5e7eb] overflow-hidden animate-pulse">
          <div className="h-[58px] bg-[#f3f4f6]" />
          <div className="px-4 py-3 flex flex-col gap-2">
            <div className="h-[12px] bg-[#f0f0f0] rounded w-1/3" />
            <div className="h-[12px] bg-[#f0f0f0] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

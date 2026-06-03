'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '../lib/i18n';

export type CareerSlotItem = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  capacity: number;
  requirements?: string[];
  createdByUid: string;
  creatorDisplayName: string;
  approvedCount: number;
  myRequestStatus: 'pending' | 'approved' | 'declined' | null;
  mySubSlotIndex: number | null;
};

type SubSlotRequest = {
  id: string;
  requesterUid: string;
  requesterDisplayName: string;
  subSlotIndex: number;
  status: 'pending' | 'approved' | 'declined';
};

type Props = {
  slot: CareerSlotItem;
  currentUserUid: string;
  isAdminOrOrganizer: boolean;
  eventId: string;
  token: string;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function pad(n: number) { return String(n).padStart(2, '0'); }

function deriveSubSlots(slot: CareerSlotItem) {
  const startMs = new Date(slot.startAt).getTime();
  const durationMin = Math.floor(
    (new Date(slot.endAt).getTime() - startMs) / 60000 / slot.capacity,
  );
  return Array.from({ length: slot.capacity }, (_, i) => {
    const s = new Date(startMs + i * durationMin * 60000);
    const e = new Date(startMs + (i + 1) * durationMin * 60000);
    return {
      index: i,
      startLabel: `${pad(s.getHours())}:${pad(s.getMinutes())}`,
      endLabel: `${pad(e.getHours())}:${pad(e.getMinutes())}`,
    };
  });
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'declined' }) {
  const t = useT();
  if (status === 'pending')
    return <span className="text-[10px] font-semibold text-[#92400e] bg-[#fef3c7] px-2 py-[2px] rounded-full">⏳ {t('meetings.pending', 'Pending')}</span>;
  if (status === 'approved')
    return <span className="text-[10px] font-semibold text-[#166534] bg-[#ecfdf3] px-2 py-[2px] rounded-full">✓ {t('careerCard.approved', 'Approved')}</span>;
  return <span className="text-[10px] font-semibold text-[#dc2626] bg-[#fff1f2] px-2 py-[2px] rounded-full">{t('meetings.rejected', 'Rejected')}</span>;
}

export default function CareerSlotCard({
  slot, currentUserUid, isAdminOrOrganizer, eventId, token, onEdit, onDelete, onRefresh,
}: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [requests, setRequests] = useState<SubSlotRequest[]>([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [acting, setActing] = useState(false);
  const [actError, setActError] = useState('');

  const isMine = slot.createdByUid === currentUserUid;
  const canManage = isAdminOrOrganizer || isMine;
  const subSlots = deriveSubSlots(slot);

  async function loadRequests() {
    if (requestsLoaded) return;
    try {
      const res = await fetch(
        `${API}/events/${eventId}/career-slots/${slot.id}/requests`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        setRequests((await res.json()) as SubSlotRequest[]);
        setRequestsLoaded(true);
      }
    } catch { /* non-fatal */ }
  }

  function handleToggle() {
    setExpanded((v) => !v);
    if (!expanded && canManage) void loadRequests();
  }

  async function handleSignUp(subSlotIndex: number) {
    setActing(true); setActError('');
    try {
      const res = await fetch(
        `${API}/events/${eventId}/career-slots/${slot.id}/request`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ subSlotIndex }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? t('careerCard.error.action', 'Action failed.'));
      }
      onRefresh();
    } catch (err) {
      setActError(err instanceof Error ? err.message : t('careerCard.error.action', 'Action failed.'));
    } finally {
      setActing(false);
    }
  }

  function approvedForSubSlot(index: number): SubSlotRequest | undefined {
    return requests.find((r) => r.subSlotIndex === index && r.status === 'approved');
  }

  function pendingForSubSlot(index: number): SubSlotRequest[] {
    return requests.filter((r) => r.subSlotIndex === index && r.status === 'pending');
  }

  async function handleRespond(requestId: string, status: 'approved' | 'declined') {
    setActing(true);
    setActError('');
    try {
      const res = await fetch(
        `${API}/events/${eventId}/career-slots/${slot.id}/requests/${requestId}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? t('careerCard.error.action', 'Action failed.'));
      }
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status } : r));
      setRequestsLoaded(false);
      onRefresh();
    } catch (err) {
      setActError(err instanceof Error ? err.message : t('careerCard.error.action', 'Action failed.'));
    } finally {
      setActing(false);
    }
  }

  const pendingTotal = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="h-full flex flex-col rounded-[8px] border-l-[3px] border-[#f59e0b] bg-[#fffbeb] p-2 overflow-hidden">
      {/* Header */}
      <div
        className="cursor-pointer flex flex-col gap-[2px]"
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); }
        }}
      >
        <div className="flex items-start justify-between gap-1">
          <p className="text-[11px] font-bold text-[#0d0d0d] leading-tight line-clamp-2">💼 {slot.title}</p>
          <span className="text-[9px] font-semibold text-[#92400e] bg-[#fef3c7] px-[5px] py-[1px] rounded-full whitespace-nowrap flex-shrink-0">
            {t('careerCard.type', 'Career')}
          </span>
        </div>
        <Link
          href={`/profile/${slot.createdByUid}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] text-[#6b7280] hover:underline hover:text-[#0d0d0d] no-underline w-fit"
        >
          {slot.creatorDisplayName}
        </Link>
        <div className="flex items-center gap-1 flex-wrap">
          <p className="text-[10px] text-[#8e8e93]">
            {slot.approvedCount} / {slot.capacity} {t('eventDetail.seats', 'seats')}
          </p>
          {canManage && pendingTotal > 0 && (
            <span className="text-[9px] font-semibold text-[#92400e] bg-[#fef3c7] px-[5px] py-[1px] rounded-full">
              {pendingTotal} pending
            </span>
          )}
          {slot.myRequestStatus && (
            <StatusBadge status={slot.myRequestStatus} />
          )}
        </div>
      </div>

      {/* Expanded sub-slots */}
      {expanded && (
        <div className="mt-2 border-t border-[#fde68a] pt-2 flex flex-col gap-1">
          {canManage && (
            <div className="flex gap-2 mb-1">
              <button type="button" onClick={onEdit}
                className="text-[10px] font-semibold text-[#6b7280] hover:text-[#0d0d0d] bg-transparent border-0 cursor-pointer font-sans p-0">
                {t('common.edit', 'Edit')}
              </button>
              <span className="text-[#e5e7eb]">·</span>
              <button type="button" onClick={onDelete}
                className="text-[10px] font-semibold text-[#dc2626] hover:text-[#b91c1c] bg-transparent border-0 cursor-pointer font-sans p-0">
                {t('common.delete', 'Delete')}
              </button>
            </div>
          )}

          {actError && <p className="text-[10px] text-[#dc2626]">{actError}</p>}

          {subSlots.map(({ index, startLabel, endLabel }) => {
            const approved = approvedForSubSlot(index);
            const pending = pendingForSubSlot(index);
            const isMySlot = slot.mySubSlotIndex === index && slot.myRequestStatus === 'approved';
            const isPending = slot.mySubSlotIndex === index && slot.myRequestStatus === 'pending';

            return (
              <div key={index} className="flex flex-col gap-[3px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-[#374151] font-semibold whitespace-nowrap">
                    {startLabel}–{endLabel}
                  </span>
                  {approved ? (
                    <span className="text-[10px] font-semibold text-[#166534]">
                      ✓{' '}
                      {canManage ? (
                        <Link
                          href={`/profile/${approved.requesterUid}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline no-underline text-[#166534]"
                        >
                          {approved.requesterDisplayName}
                        </Link>
                      ) : t('careerCard.taken', 'Taken')}
                    </span>
                  ) : isMySlot ? (
                    <span className="text-[10px] font-semibold text-[#166534]">✓ {t('careerCard.mySlot', 'My slot')}</span>
                  ) : isPending ? (
                    <span className="text-[10px] text-[#92400e]">{t('meetings.pending', 'Pending')}</span>
                  ) : !canManage && !slot.myRequestStatus ? (
                    <button
                      type="button"
                      disabled={acting}
                      onClick={(e) => { e.stopPropagation(); void handleSignUp(index); }}
                      className="text-[10px] font-semibold text-white bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 px-2 py-[2px] rounded-full border-0 cursor-pointer font-sans transition-colors"
                    >
                      {t('careerCard.apply', 'Apply')}
                    </button>
                  ) : !canManage ? null : (
                    <span className="text-[10px] text-[#9ca3af]">Prosto</span>
                  )}
                </div>

                {/* Pending requests — only visible to manager */}
                {canManage && pending.map((req) => (
                  <div key={req.id} className="flex items-center justify-between gap-1 pl-2 bg-[#fef9e7] rounded-[4px] px-2 py-[3px]">
                    <Link
                      href={`/profile/${req.requesterUid}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-[#374151] truncate hover:underline no-underline"
                    >
                      {req.requesterDisplayName}
                    </Link>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={acting}
                        onClick={(e) => { e.stopPropagation(); void handleRespond(req.id, 'approved'); }}
                        className="text-[10px] font-bold text-white bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 px-2 py-[2px] rounded-full border-0 cursor-pointer font-sans"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        disabled={acting}
                        onClick={(e) => { e.stopPropagation(); void handleRespond(req.id, 'declined'); }}
                        className="text-[10px] font-bold text-white bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 px-2 py-[2px] rounded-full border-0 cursor-pointer font-sans"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

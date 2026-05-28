'use client';

import { useEffect, useState, useCallback } from 'react';
import CareerSlotFormModal, {
  type CareerSlotFormValues,
} from './CareerSlotFormModal';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type CareerSlot = {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  capacity: number;
  createdByUid: string;
  creatorDisplayName: string;
  approvedCount: number;
  myRequestStatus: 'pending' | 'approved' | 'declined' | null;
};

type SlotRequest = {
  id: string;
  requesterUid: string;
  requesterDisplayName: string;
  status: 'pending' | 'approved' | 'declined';
  requestedAt: string;
};

type Props = {
  eventId: string;
  token: string;
  userUid: string;
  userRole: string;
};

function formatScheduledAt(iso: string): string {
  return new Date(iso).toLocaleString('sl-SI', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CareerSlotsSection({
  eventId,
  token,
  userUid,
  userRole,
}: Props) {
  const isIndustryOrAdmin =
    userRole === 'industry' || userRole === 'admin' || userRole === 'organizer';

  const [slots, setSlots] = useState<CareerSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Record<string, SlotRequest[]>>({});
  const [requestingIds, setRequestingIds] = useState<Record<string, boolean>>({});
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const [respondingIds, setRespondingIds] = useState<Record<string, boolean>>({});
  // undefined = closed, null = create, CareerSlot = edit
  const [modalSlot, setModalSlot] = useState<CareerSlot | null | undefined>(
    undefined,
  );

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/events/${eventId}/career-slots`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Napaka pri nalaganju kariernih razgovorov.');
      const data = (await res.json()) as CareerSlot[];
      setSlots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prišlo je do napake.');
    } finally {
      setLoading(false);
    }
  }, [eventId, token]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  async function loadRequests(slotId: string) {
    try {
      const res = await fetch(
        `${API}/events/${eventId}/career-slots/${slotId}/requests`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const data = (await res.json()) as SlotRequest[];
      setRequests((prev) => ({ ...prev, [slotId]: data }));
    } catch {
      // non-fatal
    }
  }

  function toggleExpand(slotId: string) {
    if (expandedSlotId === slotId) {
      setExpandedSlotId(null);
      return;
    }
    setExpandedSlotId(slotId);
    if (isIndustryOrAdmin) void loadRequests(slotId);
  }

  async function handleRequest(slotId: string) {
    setRequestingIds((prev) => ({ ...prev, [slotId]: true }));
    setRequestErrors((prev) => ({ ...prev, [slotId]: '' }));
    try {
      const res = await fetch(
        `${API}/events/${eventId}/career-slots/${slotId}/request`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? 'Napaka pri prošnji.');
      }
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId ? { ...s, myRequestStatus: 'pending' } : s,
        ),
      );
    } catch (err) {
      setRequestErrors((prev) => ({
        ...prev,
        [slotId]: err instanceof Error ? err.message : 'Napaka.',
      }));
    } finally {
      setRequestingIds((prev) => ({ ...prev, [slotId]: false }));
    }
  }

  async function handleRespond(
    slotId: string,
    requestId: string,
    status: 'approved' | 'declined',
  ) {
    setRespondingIds((prev) => ({ ...prev, [requestId]: true }));
    try {
      const res = await fetch(
        `${API}/events/${eventId}/career-slots/${slotId}/requests/${requestId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) throw new Error();
      setRequests((prev) => ({
        ...prev,
        [slotId]: (prev[slotId] ?? []).map((r) =>
          r.id === requestId ? { ...r, status } : r,
        ),
      }));
      if (status === 'approved') {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, approvedCount: s.approvedCount + 1 } : s,
          ),
        );
      }
    } catch {
      // non-fatal
    } finally {
      setRespondingIds((prev) => ({ ...prev, [requestId]: false }));
    }
  }

  async function handleSave(values: CareerSlotFormValues) {
    const isEdit = modalSlot != null;
    const url = isEdit
      ? `${API}/events/${eventId}/career-slots/${modalSlot.id}`
      : `${API}/events/${eventId}/career-slots`;
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        message?: string | string[];
      };
      const msg = Array.isArray(body.message) ? body.message[0] : body.message;
      throw new Error(msg ?? 'Napaka pri shranjevanju.');
    }
    await loadSlots();
  }

  async function handleDelete(slotId: string) {
    if (!confirm('Ste prepričani, da želite izbrisati ta razgovor?')) return;
    const res = await fetch(
      `${API}/events/${eventId}/career-slots/${slotId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return;
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    if (expandedSlotId === slotId) setExpandedSlotId(null);
  }

  function statusBadge(status: CareerSlot['myRequestStatus']) {
    if (status === 'pending')
      return (
        <span className="bg-[#fef3c7] text-[#92400e] text-[10px] font-semibold px-[8px] py-[3px] rounded-full whitespace-nowrap">
          ⏳ V obravnavi
        </span>
      );
    if (status === 'approved')
      return (
        <span className="bg-[#ecfdf3] text-[#166534] text-[10px] font-semibold px-[8px] py-[3px] rounded-full whitespace-nowrap">
          ✓ Odobreno
        </span>
      );
    if (status === 'declined')
      return (
        <span className="bg-[#fff1f2] text-[#dc2626] text-[10px] font-semibold px-[8px] py-[3px] rounded-full whitespace-nowrap">
          Zavrnjeno
        </span>
      );
    return null;
  }

  return (
    <div className="mt-6">
      <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-[0.06em] mb-3">
        Karierni razgovori
      </p>

      {error && (
        <div className="mb-3 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#e5e7eb] rounded-[12px] p-3 animate-pulse h-[72px]"
            />
          ))}
        </div>
      ) : slots.length === 0 && !isIndustryOrAdmin ? null : (
        <div className="flex flex-col gap-2">
          {slots.map((slot) => {
            const isMine = slot.createdByUid === userUid;
            const isFull = slot.approvedCount >= slot.capacity;
            const expanded = expandedSlotId === slot.id;

            return (
              <div
                key={slot.id}
                className={`bg-white border rounded-[12px] p-3 transition-colors ${
                  expanded ? 'border-2 border-[#0d0d0d]' : 'border-[#e5e7eb]'
                }`}
              >
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => toggleExpand(slot.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpand(slot.id);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0d0d0d] truncate">
                      {slot.title}
                    </p>
                    <p className="text-[11px] text-[#8e8e93] mt-[2px]">
                      📅 {formatScheduledAt(slot.scheduledAt)} · {slot.creatorDisplayName}
                    </p>
                    <p className="text-[11px] text-[#6e6e73] mt-1 line-clamp-2">
                      {slot.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[10px] text-[#8e8e93]">
                      {slot.approvedCount} / {slot.capacity} mest
                    </span>
                    {slot.myRequestStatus ? (
                      statusBadge(slot.myRequestStatus)
                    ) : !isMine && !isFull ? (
                      <button
                        type="button"
                        disabled={Boolean(requestingIds[slot.id])}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRequest(slot.id);
                        }}
                        className="bg-[#0d0d0d] text-white text-[11px] font-semibold px-3 py-[5px] rounded-full hover:bg-[#1f1f1f] disabled:opacity-50 transition-colors border-0 cursor-pointer font-sans"
                      >
                        {requestingIds[slot.id] ? '…' : 'Zaprosi'}
                      </button>
                    ) : isFull && !slot.myRequestStatus ? (
                      <span className="text-[10px] text-[#8e8e93]">Zasedeno</span>
                    ) : null}
                  </div>
                </div>

                {requestErrors[slot.id] && (
                  <p className="text-[11px] text-[#dc2626] mt-1">
                    {requestErrors[slot.id]}
                  </p>
                )}

                {expanded && (
                  <div className="mt-3 border-t border-[#f0f0f0] pt-3">
                    {isIndustryOrAdmin && isMine && (
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setModalSlot(slot)}
                          className="text-[11px] font-semibold text-[#6b7280] hover:text-[#0d0d0d] bg-transparent border-0 cursor-pointer font-sans p-0"
                        >
                          Uredi
                        </button>
                        <span className="text-[#e5e7eb]">·</span>
                        <button
                          type="button"
                          onClick={() => void handleDelete(slot.id)}
                          className="text-[11px] font-semibold text-[#dc2626] hover:text-[#b91c1c] bg-transparent border-0 cursor-pointer font-sans p-0"
                        >
                          Izbriši
                        </button>
                      </div>
                    )}

                    {isIndustryOrAdmin && (
                      <>
                        <p className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-[0.06em] mb-2">
                          Prošnje
                        </p>
                        {(requests[slot.id] ?? []).length === 0 ? (
                          <p className="text-[12px] text-[#8e8e93]">Ni prošenj.</p>
                        ) : (
                          <div className="flex flex-col divide-y divide-[#f0f0f0]">
                            {(requests[slot.id] ?? []).map((req) => (
                              <div
                                key={req.id}
                                className="flex items-center justify-between py-2 gap-3"
                              >
                                <span className="text-[12px] text-[#0d0d0d]">
                                  {req.requesterDisplayName}
                                </span>
                                {req.status === 'pending' ? (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={Boolean(respondingIds[req.id])}
                                      onClick={() =>
                                        void handleRespond(slot.id, req.id, 'approved')
                                      }
                                      className="bg-[#ecfdf3] text-[#166534] text-[11px] font-semibold px-[10px] py-[4px] rounded-[6px] border-0 cursor-pointer font-sans hover:bg-[#d1fae5] disabled:opacity-50"
                                    >
                                      ✓ Odobri
                                    </button>
                                    <button
                                      type="button"
                                      disabled={Boolean(respondingIds[req.id])}
                                      onClick={() =>
                                        void handleRespond(slot.id, req.id, 'declined')
                                      }
                                      className="bg-[#fff1f2] text-[#dc2626] text-[11px] font-semibold px-[10px] py-[4px] rounded-[6px] border-0 cursor-pointer font-sans hover:bg-[#fee2e2] disabled:opacity-50"
                                    >
                                      ✗ Zavrni
                                    </button>
                                  </div>
                                ) : (
                                  statusBadge(req.status)
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isIndustryOrAdmin && (
            <button
              type="button"
              onClick={() => setModalSlot(null)}
              className="w-full py-[10px] border-[1.5px] border-dashed border-[#d1d5db] rounded-[12px] text-[12px] font-semibold text-[#8e8e93] hover:border-[#0d0d0d] hover:text-[#0d0d0d] hover:bg-[#fafafa] transition-colors bg-transparent cursor-pointer font-sans"
            >
              + Dodaj karierni razgovor
            </button>
          )}
        </div>
      )}

      {modalSlot !== undefined && (
        <CareerSlotFormModal
          key={modalSlot?.id ?? 'create'}
          slot={modalSlot}
          onClose={() => setModalSlot(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

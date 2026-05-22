'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type CareerInterviewStatus = 'draft' | 'scheduled' | 'completed' | 'cancelled';

type CareerInterview = {
  id: string;
  candidateUid: string;
  interviewerUid?: string;
  slotId?: string;
  roomId?: string;
  notes?: string;
  status: CareerInterviewStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type UserLite = {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
};

type Room = {
  id: string;
  name: string;
  location?: string;
  capacity: number;
  active: boolean;
};

type TimeSlot = {
  id: string;
  startAt: unknown;
  endAt: unknown;
};

type AcceptedPair = {
  id: string;
  requesterUid: string;
  recipientUid: string;
};

export default function CareerInterviewsPage() {
  const user = useStoredUser();
  const [items, setItems] = useState<CareerInterview[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [acceptedPairs, setAcceptedPairs] = useState<AcceptedPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | CareerInterviewStatus>(
    'all',
  );
  const [candidateFilter, setCandidateFilter] = useState('all');
  const [interviewerFilter, setInterviewerFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  const [createForm, setCreateForm] = useState({
    candidateUid: '',
    interviewerUid: '',
    roomId: '',
    slotId: '',
    notes: '',
  });
  const [assignFormById, setAssignFormById] = useState<
    Record<string, { interviewerUid: string; roomId: string; slotId: string }>
  >({});

  const token = user?.idToken;

  useEffect(() => {
    if (!token) return;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const from = dateFilter
          ? new Date(`${dateFilter}T00:00:00`).toISOString()
          : '';
        const to = dateFilter
          ? new Date(`${dateFilter}T23:59:59.999`).toISOString()
          : '';
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (candidateFilter !== 'all') params.set('candidateUid', candidateFilter);
        if (interviewerFilter !== 'all') {
          params.set('interviewerUid', interviewerFilter);
        }
        if (from && to) {
          params.set('from', from);
          params.set('to', to);
        }

        const [interviewsRes, usersRes, roomsRes, slotsRes, pairsRes] = await Promise.all([
          fetch(
            `${API}/career-interviews${params.toString() ? `?${params.toString()}` : ''}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
          fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/scheduling/rooms`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/scheduling/time-slots`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/connections/accepted-pairs`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const responses = [interviewsRes, usersRes, roomsRes, slotsRes, pairsRes];
        const firstError = responses.find((response) => !response.ok);
        if (firstError) {
          const body = await firstError.json().catch(() => ({}));
          const message = Array.isArray(body.message)
            ? body.message[0]
            : body.message;
          throw new Error(message ?? 'Failed to load career interviews data');
        }

        const interviews = (await interviewsRes.json()) as CareerInterview[];
        const loadedUsers = (await usersRes.json()) as UserLite[];
        const loadedRooms = (await roomsRes.json()) as Room[];
        const loadedSlots = (await slotsRes.json()) as TimeSlot[];
        const loadedPairs = (await pairsRes.json()) as AcceptedPair[];

        setItems(interviews);
        setUsers(loadedUsers);
        setRooms(loadedRooms);
        setSlots(loadedSlots);
        setAcceptedPairs(loadedPairs);

        const interviewers = loadedUsers.filter((entry) =>
          ['admin', 'organizer', 'industry'].includes(entry.role ?? ''),
        );
        const candidates = loadedUsers.filter((entry) => entry.uid);
        setCreateForm((prev) => ({
          ...prev,
          candidateUid: prev.candidateUid || candidates[0]?.uid || '',
          interviewerUid: prev.interviewerUid || interviewers[0]?.uid || '',
          roomId: prev.roomId || loadedRooms[0]?.id || '',
          slotId: prev.slotId || loadedSlots[0]?.id || '',
        }));

        const defaults: Record<
          string,
          { interviewerUid: string; roomId: string; slotId: string }
        > = {};
        for (const item of interviews) {
          defaults[item.id] = {
            interviewerUid: item.interviewerUid ?? loadedUsers[0]?.uid ?? '',
            roomId: item.roomId ?? loadedRooms[0]?.id ?? '',
            slotId: item.slotId ?? loadedSlots[0]?.id ?? '',
          };
        }
        setAssignFormById(defaults);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load career interviews',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [candidateFilter, dateFilter, interviewerFilter, statusFilter, token]);

  const usersByUid = useMemo(
    () => new Map(users.map((entry) => [entry.uid, entry])),
    [users],
  );
  const interviewerOptions = useMemo(
    () =>
      users.filter((entry) =>
        ['admin', 'organizer', 'industry'].includes(entry.role ?? ''),
      ),
    [users],
  );
  const connectedUidSet = useMemo(() => {
    const set = new Set<string>();
    for (const pair of acceptedPairs) {
      if (pair.requesterUid === createForm.interviewerUid) {
        set.add(pair.recipientUid);
      } else if (pair.recipientUid === createForm.interviewerUid) {
        set.add(pair.requesterUid);
      }
    }
    return set;
  }, [acceptedPairs, createForm.interviewerUid]);
  const candidateOptions = useMemo(
    () =>
      users.filter(
        (entry) =>
          entry.uid !== createForm.interviewerUid && connectedUidSet.has(entry.uid),
      ),
    [connectedUidSet, createForm.interviewerUid, users],
  );
  const selectedCandidateUid = candidateOptions.some(
    (entry) => entry.uid === createForm.candidateUid,
  )
    ? createForm.candidateUid
    : (candidateOptions[0]?.uid ?? '');
  const roomsById = useMemo(
    () => new Map(rooms.map((entry) => [entry.id, entry])),
    [rooms],
  );
  const slotsById = useMemo(
    () => new Map(slots.map((entry) => [entry.id, entry])),
    [slots],
  );

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!normalized) return true;

      const candidate = usersByUid.get(item.candidateUid);
      const interviewer = item.interviewerUid
        ? usersByUid.get(item.interviewerUid)
        : null;
      const searchable = [
        item.id,
        candidate?.displayName,
        candidate?.email,
        interviewer?.displayName,
        interviewer?.email,
        item.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalized);
    });
  }, [items, search, usersByUid]);

  const statusOptionsByCurrent: Record<CareerInterviewStatus, CareerInterviewStatus[]> = {
    draft: ['draft', 'scheduled', 'cancelled'],
    scheduled: ['scheduled', 'completed', 'cancelled'],
    completed: ['completed'],
    cancelled: ['cancelled', 'scheduled'],
  };

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/career-interviews`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateUid: selectedCandidateUid,
          notes: createForm.notes || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message ?? 'Failed to create career interview');
      }

      const created = data as CareerInterview;
      const assignRes = await fetch(
        `${API}/career-interviews/${created.id}/assign`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            interviewerUid: createForm.interviewerUid,
            roomId: createForm.roomId,
            slotId: createForm.slotId,
          }),
        },
      );
      const assignData = await assignRes.json().catch(() => ({}));
      if (!assignRes.ok) {
        const message = Array.isArray(assignData.message)
          ? assignData.message[0]
          : assignData.message;
        throw new Error(message ?? 'Failed to assign career interview');
      }

      const scheduledInterview: CareerInterview = {
        ...created,
        interviewerUid: createForm.interviewerUid,
        roomId: createForm.roomId,
        slotId: createForm.slotId,
        status: 'scheduled',
      };

      setItems((prev) => [scheduledInterview, ...prev]);
      setAssignFormById((prev) => ({
        ...prev,
        [created.id]: {
          interviewerUid: createForm.interviewerUid,
          roomId: createForm.roomId,
          slotId: createForm.slotId,
        },
      }));
      setCreateForm((prev) => ({ ...prev, notes: '' }));
      setSuccess('Career interview created and scheduled');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create career interview',
      );
    }
  }

  async function handleAssign(id: string) {
    if (!token) return;
    const assignForm = assignFormById[id];
    if (!assignForm) return;

    setActingId(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/career-interviews/${id}/assign`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message ?? 'Failed to assign career interview');
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...assignForm, status: 'scheduled' } : item,
        ),
      );
      setSuccess('Career interview assigned');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to assign career interview',
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleStatusUpdate(id: string, status: CareerInterviewStatus) {
    if (!token) return;

    setActingId(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/career-interviews/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message ?? 'Failed to update status');
      }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      setSuccess('Status updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActingId(null);
    }
  }

  async function handleDeleteInterview(id: string) {
    if (!token) return;
    if (!window.confirm('Delete this career interview?')) return;

    setActingId(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/career-interviews/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message ?? 'Failed to delete career interview');
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSuccess('Career interview deleted');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete career interview',
      );
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#0d0d0d] mb-1">
          Career Interviews
        </h1>
        <p className="text-[13px] text-[#8e8e93]">
          Register candidates, assign interviewers and slots, and track interview
          statuses.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-5 rounded-[12px] bg-[#ecfdf3] px-4 py-3 text-sm text-[#15803d]">
          {success}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-5 border border-[#f0f0f0] rounded-[14px] p-5"
      >
        <h2 className="text-[15px] font-semibold text-[#0d0d0d] mb-3">
          Create & Schedule Career Interview
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-[#6b7280] font-semibold mb-2">
              Interviewer
            </p>
            <select
              required
              value={createForm.interviewerUid}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  interviewerUid: event.target.value,
                  candidateUid: '',
                }))
              }
              className="profile-input"
            >
              <option value="">Select interviewer</option>
              {interviewerOptions.map((entry) => (
                <option key={entry.uid} value={entry.uid}>
                  {entry.displayName} ({entry.email})
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-[#6b7280] font-semibold mb-2">
              Candidate
            </p>
            <select
              required
              value={selectedCandidateUid}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  candidateUid: event.target.value,
                }))
              }
              className="profile-input"
            >
              <option value="">Select candidate</option>
              {candidateOptions.map((entry) => (
                <option key={entry.uid} value={entry.uid}>
                  {entry.displayName} ({entry.email})
                </option>
              ))}
            </select>
            {createForm.interviewerUid && candidateOptions.length === 0 && (
              <p className="mt-2 text-[11px] text-[#9ca3af]">
                No connected candidates for selected interviewer.
              </p>
            )}
          </div>
          <select
            required
            value={createForm.roomId}
            onChange={(event) =>
              setCreateForm((prev) => ({
                ...prev,
                roomId: event.target.value,
              }))
            }
            className="profile-input"
          >
            <option value="">Select room</option>
            {rooms.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
          <select
            required
            value={createForm.slotId}
            onChange={(event) =>
              setCreateForm((prev) => ({
                ...prev,
                slotId: event.target.value,
              }))
            }
            className="profile-input"
          >
            <option value="">Select slot</option>
            {slots.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {formatDateTime(entry.startAt)} - {formatDateTime(entry.endAt)}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={createForm.notes}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Notes (optional)"
            className="profile-input"
          />
        </div>
        <button
          type="submit"
          disabled={
            !selectedCandidateUid ||
            !createForm.interviewerUid ||
            !createForm.roomId ||
            !createForm.slotId
          }
          className="mt-3 px-4 py-[8px] rounded-[8px] bg-[#0d0d0d] text-white text-[12px] font-semibold border-0 cursor-pointer"
        >
          Create interview
        </button>
      </form>

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as 'all' | CareerInterviewStatus,
              )
            }
            className="profile-input"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="profile-input"
          />
          <select
            value={candidateFilter}
            onChange={(event) => setCandidateFilter(event.target.value)}
            className="profile-input"
          >
            <option value="all">All candidates</option>
            {users.map((entry) => (
              <option key={entry.uid} value={entry.uid}>
                {entry.displayName}
              </option>
            ))}
          </select>
          <select
            value={interviewerFilter}
            onChange={(event) => setInterviewerFilter(event.target.value)}
            className="profile-input"
          >
            <option value="all">All interviewers</option>
            {users.map((entry) => (
              <option key={entry.uid} value={entry.uid}>
                {entry.displayName}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search candidate/interviewer/notes..."
          className="profile-input"
        />
      </div>

      {loading ? (
        <div className="rounded-[14px] bg-[#f7f7f7] px-5 py-4 text-sm text-[#8e8e93]">
          Loading career interviews...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-[14px] border border-[#f0f0f0] px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-[#0d0d0d] mb-1">
            No career interviews yet
          </p>
          <p className="text-[13px] text-[#8e8e93]">
            Create one to start scheduling interviews.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredItems.map((item) => {
            const candidate = usersByUid.get(item.candidateUid);
            const interviewer = item.interviewerUid
              ? usersByUid.get(item.interviewerUid)
              : null;
            const room = item.roomId ? roomsById.get(item.roomId) : null;
            const slot = item.slotId ? slotsById.get(item.slotId) : null;
            const assignForm = assignFormById[item.id] ?? {
              interviewerUid: '',
              roomId: '',
              slotId: '',
            };

            return (
              <article
                key={item.id}
                className="border border-[#f0f0f0] rounded-[14px] px-5 py-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[14px] font-semibold text-[#0d0d0d]">
                    #{item.id}
                  </span>
                  <select
                    value={item.status}
                    onChange={(event) =>
                      void handleStatusUpdate(
                        item.id,
                        event.target.value as CareerInterviewStatus,
                      )
                    }
                    disabled={actingId === item.id}
                    className={`text-[12px] px-2 py-1 rounded-[999px] border font-semibold ${
                      item.status === 'scheduled'
                        ? 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]'
                        : item.status === 'completed'
                          ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]'
                          : item.status === 'cancelled'
                            ? 'border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]'
                            : 'border-[#e5e7eb] bg-[#f9fafb] text-[#4b5563]'
                    }`}
                  >
                    {statusOptionsByCurrent[item.status].map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleDeleteInterview(item.id)}
                    disabled={actingId === item.id}
                    className="ml-auto px-3 py-1.5 rounded-[8px] border border-[#fecaca] bg-[#fff1f2] text-[12px] text-[#b91c1c] font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {actingId === item.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 text-[13px] mb-3">
                  <div>
                    <p className="text-[#8e8e93] mb-1">Candidate</p>
                    <p className="font-medium text-[#111827]">
                      {candidate
                        ? `${candidate.displayName} (${candidate.email})`
                        : item.candidateUid}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#8e8e93] mb-1">Interviewer</p>
                    <p className="font-medium text-[#111827]">
                      {interviewer
                        ? `${interviewer.displayName} (${interviewer.email})`
                        : item.interviewerUid ?? 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#8e8e93] mb-1">Room</p>
                    <p className="font-medium text-[#111827]">
                      {room ? room.name : item.roomId ?? 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#8e8e93] mb-1">Slot</p>
                    <p className="font-medium text-[#111827]">
                      {slot
                        ? `${formatDateTime(slot.startAt)} - ${formatDateTime(slot.endAt)}`
                        : item.slotId ?? 'Not assigned'}
                    </p>
                  </div>
                </div>

                {slot && room && (
                  <p className="text-[12px] text-[#4b5563] mb-3">
                    Scheduled at{' '}
                    <span className="font-semibold text-[#111827]">
                      {formatDateTime(slot.startAt)} - {formatDateTime(slot.endAt)}
                    </span>{' '}
                    in room <span className="font-semibold text-[#111827]">{room.name}</span>
                  </p>
                )}

                {item.status === 'draft' && (
                  <>
                    <div className="grid gap-3 md:grid-cols-3 mb-3">
                      <select
                        value={assignForm.interviewerUid}
                        onChange={(event) =>
                          setAssignFormById((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...assignForm,
                              interviewerUid: event.target.value,
                            },
                          }))
                        }
                        className="profile-input"
                      >
                        <option value="">Select interviewer</option>
                        {users.map((entry) => (
                          <option key={entry.uid} value={entry.uid}>
                            {entry.displayName}
                          </option>
                        ))}
                      </select>
                      <select
                        value={assignForm.roomId}
                        onChange={(event) =>
                          setAssignFormById((prev) => ({
                            ...prev,
                            [item.id]: { ...assignForm, roomId: event.target.value },
                          }))
                        }
                        className="profile-input"
                      >
                        <option value="">Select room</option>
                        {rooms.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={assignForm.slotId}
                        onChange={(event) =>
                          setAssignFormById((prev) => ({
                            ...prev,
                            [item.id]: { ...assignForm, slotId: event.target.value },
                          }))
                        }
                        className="profile-input"
                      >
                        <option value="">Select slot</option>
                        {slots.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {formatDateTime(entry.startAt)} - {formatDateTime(entry.endAt)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleAssign(item.id)}
                        disabled={
                          actingId === item.id ||
                          !assignForm.interviewerUid ||
                          !assignForm.roomId ||
                          !assignForm.slotId
                        }
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#d1fae5] bg-[#ecfdf3] text-[#166534] disabled:opacity-40"
                      >
                        {actingId === item.id ? 'Saving...' : 'Assign'}
                      </button>
                    </div>
                  </>
                )}

                {item.notes && (
                  <p className="text-[12px] text-[#6b7280] mt-3">
                    Notes: {item.notes}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDateTime(value: unknown) {
  const date = toDate(value);
  if (!date) return 'N/A';
  return date.toLocaleString();
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object') {
    const candidate = value as { _seconds?: number; seconds?: number };
    const seconds = candidate._seconds ?? candidate.seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  return null;
}

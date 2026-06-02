'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../lib/auth';
import { useT } from '../../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Meeting = {
  id: string;
  slotId: string;
  roomId: string;
  requestedByUids?: string[];
  requestedToUids?: string[];
  participantUids?: string[];
  status: string;
  createdAt?: string;
};

type Room = {
  id: string;
  name: string;
  location?: string;
};

type Slot = {
  id: string;
  startAt: unknown;
  endAt: unknown;
};

type UserLite = {
  uid: string;
  displayName: string;
  email: string;
};

export default function MeetingsPage() {
  const t = useT();
  const user = useStoredUser();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortDirection, setSortDirection] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    const token = user?.idToken;
    if (!token) return;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [meetingsRes, roomsRes, slotsRes, usersRes] = await Promise.all([
          fetch(`${API}/scheduling/meetings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/scheduling/rooms`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/scheduling/time-slots`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const responses = [meetingsRes, roomsRes, slotsRes, usersRes];
        const firstError = responses.find((response) => !response.ok);
        if (firstError) {
          const data = await firstError.json().catch(() => ({}));
          const message = Array.isArray(data.message) ? data.message[0] : data.message;
          throw new Error(message ?? t('admin.meetings.errorLoad', 'Failed to load meetings data'));
        }

        setMeetings((await meetingsRes.json()) as Meeting[]);
        setRooms((await roomsRes.json()) as Room[]);
        setSlots((await slotsRes.json()) as Slot[]);
        setUsers((await usersRes.json()) as UserLite[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('admin.meetings.errorLoad', 'Failed to load meetings data'));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [t, user?.idToken]);

  const roomsById = useMemo(
    () => new Map(rooms.map((room) => [room.id, room])),
    [rooms],
  );
  const slotsById = useMemo(
    () => new Map(slots.map((slot) => [slot.id, slot])),
    [slots],
  );
  const usersByUid = useMemo(
    () => new Map(users.map((person) => [person.uid, person])),
    [users],
  );
  const filteredMeetings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = meetings.filter((meeting) => {
      if (statusFilter !== 'all' && meeting.status !== statusFilter) return false;
      if (roomFilter !== 'all' && meeting.roomId !== roomFilter) return false;
      if (!normalizedSearch) return true;

      const room = roomsById.get(meeting.roomId);
      const requestedBy = meeting.requestedByUids ?? [];
      const requestedTo = meeting.requestedToUids ?? [];
      const people = [...requestedBy, ...requestedTo]
        .map((uid) => displayUser(usersByUid, uid).toLowerCase())
        .join(' ');

      return (
        meeting.id.toLowerCase().includes(normalizedSearch) ||
        (room?.name.toLowerCase().includes(normalizedSearch) ?? false) ||
        people.includes(normalizedSearch)
      );
    });

    filtered.sort((left, right) => {
      const leftDate = toDate(left.createdAt)?.getTime() ?? 0;
      const rightDate = toDate(right.createdAt)?.getTime() ?? 0;
      return sortDirection === 'newest' ? rightDate - leftDate : leftDate - rightDate;
    });

    return filtered;
  }, [meetings, roomFilter, roomsById, search, sortDirection, statusFilter, usersByUid]);

  const totalPages = Math.max(1, Math.ceil(filteredMeetings.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedMeetings = filteredMeetings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  async function handleDeleteMeeting(id: string) {
    const token = user?.idToken;
    if (!token) return;
    const confirmed = window.confirm(t('admin.meetings.confirmDelete', 'Delete this meeting? This action cannot be undone.'));
    if (!confirmed) return;

    setActingId(id);
    setError('');
    try {
      const res = await fetch(`${API}/scheduling/meetings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message ?? t('admin.meetings.errorDelete', 'Failed to delete meeting'));
      }
      setMeetings((prev) => prev.filter((meeting) => meeting.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.meetings.errorDelete', 'Failed to delete meeting'));
    } finally {
      setActingId(null);
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    const token = user?.idToken;
    if (!token) return;

    setActingId(id);
    setError('');
    try {
      const res = await fetch(`${API}/scheduling/meetings/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message ?? t('admin.meetings.errorStatus', 'Failed to update meeting status'));
      }
      setMeetings((prev) =>
        prev.map((meeting) => (meeting.id === id ? { ...meeting, status } : meeting)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.meetings.errorStatus', 'Failed to update meeting status'));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#0d0d0d] mb-1">{t('admin.nav.meetings', 'Meetings')}</h1>
        <p className="text-[13px] text-[#8e8e93]">{t('admin.meetings.subtitle', 'All scheduled meetings and participant assignments.')}</p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as typeof statusFilter);
            setPage(1);
          }}
          className="profile-input"
        >
          <option value="all">{t('admin.filter.allStatuses', 'All statuses')}</option>
          <option value="scheduled">{t('admin.status.scheduled', 'Scheduled')}</option>
          <option value="completed">{t('admin.status.completed', 'Completed')}</option>
          <option value="cancelled">{t('admin.status.cancelled', 'Cancelled')}</option>
        </select>

        <select
          value={roomFilter}
          onChange={(event) => {
            setRoomFilter(event.target.value);
            setPage(1);
          }}
          className="profile-input"
        >
          <option value="all">{t('admin.filter.allRooms', 'All rooms')}</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={t('admin.meetings.searchPlaceholder', 'Search meeting, room, participant...')}
          className="profile-input"
        />

        <select
          value={sortDirection}
          onChange={(event) => setSortDirection(event.target.value as typeof sortDirection)}
          className="profile-input"
        >
          <option value="newest">{t('admin.sort.newest', 'Newest first')}</option>
          <option value="oldest">{t('admin.sort.oldest', 'Oldest first')}</option>
        </select>
      </div>

      {error && (
        <div className="mb-5 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-[14px] bg-[#f7f7f7] px-5 py-4 text-sm text-[#8e8e93]">
          {t('admin.meetings.loading', 'Loading meetings...')}
        </div>
      )}

      {!loading && filteredMeetings.length === 0 && (
        <div className="rounded-[14px] border border-[#f0f0f0] px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-[#0d0d0d] mb-1">{t('admin.meetings.emptyTitle', 'No meetings yet')}</p>
          <p className="text-[13px] text-[#8e8e93]">{t('admin.meetings.emptyDesc', 'Create meetings from the Scheduling section.')}</p>
        </div>
      )}

      {!loading && filteredMeetings.length > 0 && (
        <div className="flex flex-col gap-3">
          {paginatedMeetings.map((meeting) => {
            const room = roomsById.get(meeting.roomId);
            const slot = slotsById.get(meeting.slotId);
            const requestedByUids = meeting.requestedByUids ?? [];
            const requestedToUids = meeting.requestedToUids ?? [];
            const participants = meeting.participantUids ?? [
              ...requestedByUids,
              ...requestedToUids,
            ];

            return (
              <article
                key={meeting.id}
                className="border border-[#f0f0f0] rounded-[14px] px-5 py-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[14px] font-semibold text-[#0d0d0d]">#{meeting.id}</span>
                  <select
                    value={meeting.status}
                    onChange={(event) =>
                      void handleUpdateStatus(meeting.id, event.target.value)
                    }
                    disabled={actingId === meeting.id}
                    className="text-[12px] px-2 py-1 rounded-[8px] border border-[#dbeafe] bg-[#eef2ff] text-[#3730a3]"
                  >
                    <option value="scheduled">{t('admin.status.scheduled', 'Scheduled')}</option>
                    <option value="completed">{t('admin.status.completed', 'Completed')}</option>
                    <option value="cancelled">{t('admin.status.cancelled', 'Cancelled')}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleDeleteMeeting(meeting.id)}
                    disabled={actingId === meeting.id}
                    className="ml-auto px-3 py-1.5 rounded-[8px] border border-[#fecaca] bg-[#fff1f2] text-[12px] text-[#b91c1c] font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {actingId === meeting.id ? t('admin.action.deleting', 'Deleting...') : t('common.delete', 'Delete')}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 text-[13px]">
                  <div>
                    <p className="text-[#8e8e93] mb-1">{t('admin.common.room', 'Room')}</p>
                    <p className="font-medium text-[#111827]">
                      {room ? `${room.name}${room.location ? ` • ${room.location}` : ''}` : meeting.roomId}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#8e8e93] mb-1">{t('admin.common.timeSlot', 'Time Slot')}</p>
                    <p className="font-medium text-[#111827]">
                      {slot
                        ? `${formatDateTime(slot.startAt)} - ${formatDateTime(slot.endAt)}`
                        : meeting.slotId}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 mt-4 text-[13px]">
                  <div>
                    <p className="text-[#8e8e93] mb-1">{t('admin.common.requestedBy', 'Requested by')}</p>
                    <ul className="space-y-1">
                      {requestedByUids.map((uid) => (
                        <li key={uid} className="text-[#111827]">
                          {displayUser(usersByUid, uid)}
                        </li>
                      ))}
                      {requestedByUids.length === 0 && <li className="text-[#9ca3af]">—</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[#8e8e93] mb-1">{t('admin.common.requestedTo', 'Requested to')}</p>
                    <ul className="space-y-1">
                      {requestedToUids.map((uid) => (
                        <li key={uid} className="text-[#111827]">
                          {displayUser(usersByUid, uid)}
                        </li>
                      ))}
                      {requestedToUids.length === 0 && <li className="text-[#9ca3af]">—</li>}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 text-[12px] text-[#6b7280]">
                  {t('admin.meetings.totalParticipants', 'Total participants')}: <span className="font-semibold text-[#111827]">{participants.length}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && filteredMeetings.length > 0 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-[12px] text-[#6b7280]">
            {t('admin.pagination.showing', 'Showing')} {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredMeetings.length)} {t('admin.pagination.of', 'of')} {filteredMeetings.length}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-[8px] border border-[#e5e7eb] bg-white text-[12px] disabled:opacity-40"
            >
              {t('admin.pagination.previous', 'Previous')}
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-[8px] border border-[#e5e7eb] bg-white text-[12px] disabled:opacity-40"
            >
              {t('admin.pagination.next', 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function displayUser(usersByUid: Map<string, UserLite>, uid: string) {
  const person = usersByUid.get(uid);
  if (!person) return uid;
  return `${person.displayName} (${person.email})`;
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

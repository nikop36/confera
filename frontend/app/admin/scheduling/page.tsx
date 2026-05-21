'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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

type Meeting = {
  id: string;
  slotId: string;
  roomId: string;
  requestedByUids?: string[];
  requestedToUids?: string[];
  participantUids?: string[];
  status: string;
};

type SlotAvailability = {
  id: string;
  startAt: unknown;
  endAt: unknown;
  scheduledMeetingCount: number;
  isBooked: boolean;
};

type Participant = {
  uid: string;
  displayName: string;
  email: string;
  role?: string;
};

export default function AdminSchedulingPage() {
  const user = useStoredUser();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [availability, setAvailability] = useState<SlotAvailability[]>([]);
  const [meetingSummary, setMeetingSummary] = useState({
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const [availabilityRoomId, setAvailabilityRoomId] = useState('all');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'all' | 'free' | 'booked'
  >('all');

  const [roomForm, setRoomForm] = useState({
    name: '',
    location: '',
    capacity: '8',
  });
  const [slotForm, setSlotForm] = useState({
    startDate: '',
    endDate: '',
    dayStartTime: '09:00',
    dayEndTime: '17:00',
    slotDurationMinutes: '30',
  });
  const [assignForm, setAssignForm] = useState({
    slotId: '',
    roomId: '',
    requestedByUids: [] as string[],
    requestedToUids: [] as string[],
  });
  const [participantQueryBy, setParticipantQueryBy] = useState('');
  const [participantQueryTo, setParticipantQueryTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [generatingSlots, setGeneratingSlots] = useState(false);
  const [assigningMeeting, setAssigningMeeting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastMeeting, setLastMeeting] = useState<Meeting | null>(null);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomEditForm, setRoomEditForm] = useState({
    name: '',
    location: '',
    capacity: '',
  });
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotEditForm, setSlotEditForm] = useState({
    startAt: '',
    endAt: '',
  });

  const token = user?.idToken;

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  );

  const loadRoomsAndSlots = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const [roomsRes, allRoomsRes, slotsRes, usersRes] = await Promise.all([
        fetch(`${API}/scheduling/rooms`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/scheduling/rooms/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/scheduling/time-slots`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!roomsRes.ok || !allRoomsRes.ok || !slotsRes.ok || !usersRes.ok) {
        const roomErr = !roomsRes.ok ? await roomsRes.json().catch(() => ({})) : null;
        const allRoomErr = !allRoomsRes.ok ? await allRoomsRes.json().catch(() => ({})) : null;
        const slotErr = !slotsRes.ok ? await slotsRes.json().catch(() => ({})) : null;
        const userErr = !usersRes.ok ? await usersRes.json().catch(() => ({})) : null;
        const message = Array.isArray(roomErr?.message)
          ? roomErr.message[0]
          : roomErr?.message
            || (Array.isArray(allRoomErr?.message) ? allRoomErr.message[0] : allRoomErr?.message)
            || (Array.isArray(slotErr?.message) ? slotErr.message[0] : slotErr?.message)
            || (Array.isArray(userErr?.message) ? userErr.message[0] : userErr?.message);
        throw new Error(message ?? 'Failed to load scheduling data');
      }

      const roomData = (await roomsRes.json()) as Room[];
      const allRoomData = (await allRoomsRes.json()) as Room[];
      const slotData = (await slotsRes.json()) as TimeSlot[];
      const userData = (await usersRes.json()) as Participant[];
      setRooms(roomData);
      setAllRooms(allRoomData);
      setSlots(slotData);
      setParticipants(userData);

      setAssignForm((prev) => ({
        ...prev,
        roomId: prev.roomId || roomData[0]?.id || '',
        slotId: prev.slotId || slotData[0]?.id || '',
      }));
      setAvailabilityRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheduling data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    async function loadAvailabilityAndSummary() {
      try {
        const from = availabilityDate
          ? new Date(`${availabilityDate}T00:00:00`).toISOString()
          : '';
        const to = availabilityDate
          ? new Date(`${availabilityDate}T23:59:59.999`).toISOString()
          : '';
        const roomIdParam =
          availabilityRoomId && availabilityRoomId !== 'all'
            ? `&roomId=${encodeURIComponent(availabilityRoomId)}`
            : '';
        const dateParams =
          from && to
            ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${roomIdParam}`
            : roomIdParam
              ? `?roomId=${encodeURIComponent(availabilityRoomId)}`
              : '';

        const [availabilityRes, scheduledRes, completedRes, cancelledRes] =
          await Promise.all([
            fetch(`${API}/scheduling/time-slots/availability${dateParams}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API}/scheduling/meetings?status=scheduled`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API}/scheduling/meetings?status=completed`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API}/scheduling/meetings?status=cancelled`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

        if (
          !availabilityRes.ok ||
          !scheduledRes.ok ||
          !completedRes.ok ||
          !cancelledRes.ok
        ) {
          return;
        }

        const availabilityData = (await availabilityRes.json()) as SlotAvailability[];
        const scheduled = (await scheduledRes.json()) as Meeting[];
        const completed = (await completedRes.json()) as Meeting[];
        const cancelled = (await cancelledRes.json()) as Meeting[];

        setAvailability(availabilityData);
        setMeetingSummary({
          scheduled: scheduled.length,
          completed: completed.length,
          cancelled: cancelled.length,
        });
      } catch {
        // keep existing values on transient fetch failure
      }
    }

    void loadAvailabilityAndSummary();
  }, [availabilityDate, availabilityRefreshKey, availabilityRoomId, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRoomsAndSlots();
  }, [loadRoomsAndSlots]);

  async function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setCreatingRoom(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/scheduling/rooms`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: roomForm.name,
          location: roomForm.location || undefined,
          capacity: Number(roomForm.capacity),
          active: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Failed to create room');
      }

      setRoomForm({ name: '', location: '', capacity: '8' });
      setSuccess('Room created');
      await loadRoomsAndSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleGenerateSlots(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setGeneratingSlots(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/scheduling/time-slots/generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          startDate: slotForm.startDate,
          endDate: slotForm.endDate,
          dayStartTime: slotForm.dayStartTime,
          dayEndTime: slotForm.dayEndTime,
          slotDurationMinutes: Number(slotForm.slotDurationMinutes),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Failed to generate time slots');
      }

      setSuccess(`Generated ${data.generatedCount ?? 0} new slots`);
      await loadRoomsAndSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate time slots');
    } finally {
      setGeneratingSlots(false);
    }
  }

  async function handleAssignMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setAssigningMeeting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/scheduling/meetings/assign`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(assignForm),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Failed to assign meeting');
      }

      setLastMeeting(data as Meeting);
      setSuccess('Meeting assigned');
      setAssignForm((prev) => ({
        ...prev,
        requestedByUids: [],
        requestedToUids: [],
      }));
      setParticipantQueryBy('');
      setParticipantQueryTo('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign meeting');
    } finally {
      setAssigningMeeting(false);
    }
  }

  async function handleToggleRoom(room: Room) {
    if (!token) return;
    setActingKey(`room-toggle-${room.id}`);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/scheduling/rooms/${room.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !room.active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Failed to update room');
      }
      setSuccess(`Room ${room.active ? 'deactivated' : 'activated'}`);
      await loadRoomsAndSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update room');
    } finally {
      setActingKey(null);
    }
  }

  async function handleDeleteRoom(room: Room) {
    if (!token) return;
    if (!window.confirm(`Delete room "${room.name}"?`)) return;
    setActingKey(`room-delete-${room.id}`);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/scheduling/rooms/${room.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Failed to delete room');
      }
      setSuccess('Room deleted');
      await loadRoomsAndSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room');
    } finally {
      setActingKey(null);
    }
  }

  function beginEditRoom(room: Room) {
    setEditingRoomId(room.id);
    setRoomEditForm({
      name: room.name,
      location: room.location ?? '',
      capacity: String(room.capacity),
    });
  }

  async function handleSaveRoomEdit(roomId: string) {
    if (!token) return;
    setActingKey(`room-edit-${roomId}`);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/scheduling/rooms/${roomId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          name: roomEditForm.name,
          location: roomEditForm.location || undefined,
          capacity: Number(roomEditForm.capacity),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Failed to update room');
      }
      setSuccess('Room updated');
      setEditingRoomId(null);
      await loadRoomsAndSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update room');
    } finally {
      setActingKey(null);
    }
  }

  async function handleDeleteSlot(slot: TimeSlot) {
    if (!token) return;
    if (!window.confirm('Delete this time slot?')) return;
    setActingKey(`slot-delete-${slot.id}`);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/scheduling/time-slots/${slot.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Failed to delete time slot');
      }
      setSuccess('Time slot deleted');
      await loadRoomsAndSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete time slot');
    } finally {
      setActingKey(null);
    }
  }

  function beginEditSlot(slot: TimeSlot) {
    const startAt = toDate(slot.startAt);
    const endAt = toDate(slot.endAt);
    setEditingSlotId(slot.id);
    setSlotEditForm({
      startAt: startAt ? toDatetimeLocalValue(startAt) : '',
      endAt: endAt ? toDatetimeLocalValue(endAt) : '',
    });
  }

  async function handleSaveSlotEdit(slotId: string) {
    if (!token) return;
    setActingKey(`slot-edit-${slotId}`);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API}/scheduling/time-slots/${slotId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          startAt: new Date(slotEditForm.startAt).toISOString(),
          endAt: new Date(slotEditForm.endAt).toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Failed to update time slot');
      }
      setSuccess('Time slot updated');
      setEditingSlotId(null);
      await loadRoomsAndSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time slot');
    } finally {
      setActingKey(null);
    }
  }

  const selectedBy = useMemo(
    () =>
      participants.filter((participant) =>
        assignForm.requestedByUids.includes(participant.uid),
      ),
    [participants, assignForm.requestedByUids],
  );
  const selectedTo = useMemo(
    () =>
      participants.filter((participant) =>
        assignForm.requestedToUids.includes(participant.uid),
      ),
    [participants, assignForm.requestedToUids],
  );
  const visibleAvailability = useMemo(() => {
    if (availabilityStatus === 'all') return availability;
    if (availabilityStatus === 'booked') {
      return availability.filter((item) => item.isBooked);
    }
    return availability.filter((item) => !item.isBooked);
  }, [availability, availabilityStatus]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#0d0d0d] mb-1">Scheduling</h1>
        <p className="text-[13px] text-[#8e8e93]">
          Create rooms, generate time slots, and assign meetings with conflict checks.
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="rounded-[12px] bg-[#f7f7f7] px-5 py-4 min-w-[120px]">
          <div className="text-[22px] font-bold text-[#0d0d0d]">{loading ? '—' : rooms.length}</div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">Rooms</div>
        </div>
        <div className="rounded-[12px] bg-[#f7f7f7] px-5 py-4 min-w-[120px]">
          <div className="text-[22px] font-bold text-[#0d0d0d]">{loading ? '—' : slots.length}</div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">Time slots</div>
        </div>
        <div className="rounded-[12px] bg-[#f7f7f7] px-5 py-4 min-w-[120px]">
          <div className="text-[22px] font-bold text-[#0d0d0d]">{meetingSummary.scheduled}</div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">Scheduled meetings</div>
        </div>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleCreateRoom} className="border border-[#f0f0f0] rounded-[14px] p-5 space-y-3">
          <h2 className="text-[15px] font-semibold text-[#0d0d0d]">Create Room</h2>
          <input
            type="text"
            required
            placeholder="Room name"
            value={roomForm.name}
            onChange={(e) => setRoomForm((prev) => ({ ...prev, name: e.target.value }))}
            className="profile-input"
          />
          <input
            type="text"
            placeholder="Location (optional)"
            value={roomForm.location}
            onChange={(e) => setRoomForm((prev) => ({ ...prev, location: e.target.value }))}
            className="profile-input"
          />
          <input
            type="number"
            min={1}
            max={1000}
            required
            value={roomForm.capacity}
            onChange={(e) => setRoomForm((prev) => ({ ...prev, capacity: e.target.value }))}
            className="profile-input"
          />
          <button
            type="submit"
            disabled={creatingRoom}
            className="px-4 py-[8px] rounded-[8px] bg-[#0d0d0d] text-white text-[12px] font-semibold border-0 cursor-pointer disabled:opacity-40"
          >
            {creatingRoom ? 'Creating...' : 'Create room'}
          </button>
        </form>

        <form onSubmit={handleGenerateSlots} className="border border-[#f0f0f0] rounded-[14px] p-5 space-y-3">
          <h2 className="text-[15px] font-semibold text-[#0d0d0d]">Generate Time Slots</h2>
          <p className="text-[12px] text-[#8e8e93]">
            Generates recurring slots for each day in a date range.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              required
              value={slotForm.startDate}
              onChange={(e) => setSlotForm((prev) => ({ ...prev, startDate: e.target.value }))}
              className="profile-input"
              aria-label="Start date"
            />
            <input
              type="date"
              required
              value={slotForm.endDate}
              onChange={(e) => setSlotForm((prev) => ({ ...prev, endDate: e.target.value }))}
              className="profile-input"
              aria-label="End date"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="time"
              required
              value={slotForm.dayStartTime}
              onChange={(e) => setSlotForm((prev) => ({ ...prev, dayStartTime: e.target.value }))}
              className="profile-input"
            />
            <input
              type="time"
              required
              value={slotForm.dayEndTime}
              onChange={(e) => setSlotForm((prev) => ({ ...prev, dayEndTime: e.target.value }))}
              className="profile-input"
            />
            <input
              type="number"
              min={5}
              max={240}
              required
              value={slotForm.slotDurationMinutes}
              onChange={(e) =>
                setSlotForm((prev) => ({ ...prev, slotDurationMinutes: e.target.value }))
              }
              className="profile-input"
              aria-label="Slot duration in minutes"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-[11px] text-[#8e8e93]">
            <span>Daily start time</span>
            <span>Daily end time</span>
            <span>Slot length (minutes)</span>
          </div>
          <button
            type="submit"
            disabled={generatingSlots}
            className="px-4 py-[8px] rounded-[8px] bg-[#0d0d0d] text-white text-[12px] font-semibold border-0 cursor-pointer disabled:opacity-40"
          >
            {generatingSlots ? 'Generating...' : 'Generate slots'}
          </button>
        </form>

        <form onSubmit={handleAssignMeeting} className="border border-[#f0f0f0] rounded-[14px] p-5 space-y-3 lg:col-span-2">
          <h2 className="text-[15px] font-semibold text-[#0d0d0d]">Assign Meeting</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              required
              value={assignForm.roomId}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, roomId: e.target.value }))}
              className="profile-input"
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.capacity})
                </option>
              ))}
            </select>

            <select
              required
              value={assignForm.slotId}
              onChange={(e) => setAssignForm((prev) => ({ ...prev, slotId: e.target.value }))}
              className="profile-input"
            >
              <option value="">Select time slot</option>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {formatDateTime(slot.startAt)} - {formatDateTime(slot.endAt)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ParticipantPicker
              label="Requested by"
              participants={participants}
              selectedUids={assignForm.requestedByUids}
              query={participantQueryBy}
              onQueryChange={setParticipantQueryBy}
              onToggle={(uid) => {
                setAssignForm((prev) => ({
                  ...prev,
                  requestedByUids: toggleUid(prev.requestedByUids, uid),
                }));
              }}
              excludeUids={assignForm.requestedToUids}
            />
            <ParticipantPicker
              label="Requested to"
              participants={participants}
              selectedUids={assignForm.requestedToUids}
              query={participantQueryTo}
              onQueryChange={setParticipantQueryTo}
              onToggle={(uid) => {
                setAssignForm((prev) => ({
                  ...prev,
                  requestedToUids: toggleUid(prev.requestedToUids, uid),
                }));
              }}
              excludeUids={assignForm.requestedByUids}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 text-[11px] text-[#6b7280]">
            <div className="rounded-[8px] bg-[#f7f7f7] px-3 py-2">
              requestedBy UIDs:{' '}
              <span className="font-mono text-[#111827]">
                {selectedBy.length
                  ? selectedBy.map((participant) => participant.uid).join(', ')
                  : 'not selected'}
              </span>
            </div>
            <div className="rounded-[8px] bg-[#f7f7f7] px-3 py-2">
              requestedTo UIDs:{' '}
              <span className="font-mono text-[#111827]">
                {selectedTo.length
                  ? selectedTo.map((participant) => participant.uid).join(', ')
                  : 'not selected'}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={assigningMeeting}
            className="px-4 py-[8px] rounded-[8px] bg-[#0d0d0d] text-white text-[12px] font-semibold border-0 cursor-pointer disabled:opacity-40"
          >
            {assigningMeeting ? 'Assigning...' : 'Assign meeting'}
          </button>
        </form>
      </div>

      {lastMeeting && (
        <div className="mt-5 rounded-[12px] bg-[#f7f7f7] px-4 py-3 text-[13px] text-[#374151]">
          Last meeting: <span className="font-semibold text-[#0d0d0d]">{lastMeeting.id}</span> | room{' '}
          {lastMeeting.roomId} | slot {lastMeeting.slotId}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 mt-5">
        <section className="border border-[#f0f0f0] rounded-[14px] p-5">
          <h2 className="text-[15px] font-semibold text-[#0d0d0d] mb-3">Manage Rooms</h2>
          <div className="space-y-2 max-h-[260px] overflow-auto">
            {allRooms.map((room) => (
              <div key={room.id} className="border border-[#f3f4f6] rounded-[10px] px-3 py-2">
                {editingRoomId === room.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={roomEditForm.name}
                      onChange={(e) => setRoomEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="profile-input"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={roomEditForm.location}
                        onChange={(e) =>
                          setRoomEditForm((prev) => ({ ...prev, location: e.target.value }))
                        }
                        placeholder="Location"
                        className="profile-input"
                      />
                      <input
                        type="number"
                        min={1}
                        value={roomEditForm.capacity}
                        onChange={(e) =>
                          setRoomEditForm((prev) => ({ ...prev, capacity: e.target.value }))
                        }
                        className="profile-input"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveRoomEdit(room.id)}
                        disabled={actingKey === `room-edit-${room.id}`}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#d1fae5] bg-[#ecfdf3] text-[#166534]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRoomId(null)}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#e5e7eb] bg-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-medium text-[#111827]">
                        {room.name} ({room.capacity})
                      </div>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          room.active ? 'bg-[#ecfdf3] text-[#166534]' : 'bg-[#f3f4f6] text-[#4b5563]'
                        }`}
                      >
                        {room.active ? 'active' : 'inactive'}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => beginEditRoom(room)}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#d1d5db] bg-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleRoom(room)}
                        disabled={actingKey === `room-toggle-${room.id}`}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#d1d5db] bg-white"
                      >
                        {room.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteRoom(room)}
                        disabled={actingKey === `room-delete-${room.id}`}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {allRooms.length === 0 && <p className="text-[12px] text-[#8e8e93]">No rooms</p>}
          </div>
        </section>

        <section className="border border-[#f0f0f0] rounded-[14px] p-5">
          <h2 className="text-[15px] font-semibold text-[#0d0d0d] mb-3">Manage Time Slots</h2>
          <div className="space-y-2 max-h-[260px] overflow-auto">
            {slots.map((slot) => (
              <div key={slot.id} className="border border-[#f3f4f6] rounded-[10px] px-3 py-2">
                {editingSlotId === slot.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="datetime-local"
                        value={slotEditForm.startAt}
                        onChange={(e) =>
                          setSlotEditForm((prev) => ({ ...prev, startAt: e.target.value }))
                        }
                        className="profile-input"
                      />
                      <input
                        type="datetime-local"
                        value={slotEditForm.endAt}
                        onChange={(e) =>
                          setSlotEditForm((prev) => ({ ...prev, endAt: e.target.value }))
                        }
                        className="profile-input"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveSlotEdit(slot.id)}
                        disabled={actingKey === `slot-edit-${slot.id}`}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#d1fae5] bg-[#ecfdf3] text-[#166534]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSlotId(null)}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#e5e7eb] bg-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-[13px] text-[#111827]">
                      {formatDateTime(slot.startAt)} - {formatDateTime(slot.endAt)}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => beginEditSlot(slot)}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#d1d5db] bg-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSlot(slot)}
                        disabled={actingKey === `slot-delete-${slot.id}`}
                        className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#fecaca] bg-[#fff1f2] text-[#b91c1c]"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {slots.length === 0 && <p className="text-[12px] text-[#8e8e93]">No time slots</p>}
          </div>
        </section>
      </div>

      <section className="border border-[#f0f0f0] rounded-[14px] p-5 mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-[15px] font-semibold text-[#0d0d0d]">
            Slot Availability
          </h2>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="rounded-full bg-[#ecfdf3] text-[#166534] px-2 py-0.5">
              completed: {meetingSummary.completed}
            </span>
            <span className="rounded-full bg-[#fff1f2] text-[#b91c1c] px-2 py-0.5">
              cancelled: {meetingSummary.cancelled}
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3 mb-3">
          <select
            value={availabilityRoomId}
            onChange={(event) => setAvailabilityRoomId(event.target.value)}
            className="profile-input"
          >
            <option value="all">All rooms</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={availabilityDate}
            onChange={(event) => setAvailabilityDate(event.target.value)}
            className="profile-input"
          />
          <select
            value={availabilityStatus}
            onChange={(event) =>
              setAvailabilityStatus(
                event.target.value as 'all' | 'free' | 'booked',
              )
            }
            className="profile-input"
          >
            <option value="all">All slots</option>
            <option value="free">Free only</option>
            <option value="booked">Booked only</option>
          </select>
        </div>
        <div className="space-y-2 max-h-[260px] overflow-auto">
          {visibleAvailability.map((item) => (
            <div
              key={item.id}
              className="border border-[#f3f4f6] rounded-[10px] px-3 py-2 flex items-center justify-between gap-3"
            >
              <div className="text-[13px] text-[#111827]">
                {formatDateTime(item.startAt)} - {formatDateTime(item.endAt)}
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full ${
                  item.isBooked
                    ? 'bg-[#fff1f2] text-[#b91c1c]'
                    : 'bg-[#ecfdf3] text-[#166534]'
                }`}
              >
                {item.isBooked
                  ? `booked (${item.scheduledMeetingCount})`
                  : 'free'}
              </span>
            </div>
          ))}
          {visibleAvailability.length === 0 && (
            <p className="text-[12px] text-[#8e8e93]">No matching slots</p>
          )}
        </div>
      </section>
    </div>
  );
}

function ParticipantPicker({
  label,
  participants,
  selectedUids,
  query,
  onQueryChange,
  onToggle,
  excludeUids,
}: {
  label: string;
  participants: Participant[];
  selectedUids: string[];
  query: string;
  onQueryChange: (query: string) => void;
  onToggle: (uid: string) => void;
  excludeUids?: string[];
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const options = participants
    .filter((participant) => !(excludeUids ?? []).includes(participant.uid))
    .filter((participant) => {
      if (!normalizedQuery) return true;
      return (
        participant.displayName.toLowerCase().includes(normalizedQuery) ||
        participant.email.toLowerCase().includes(normalizedQuery)
      );
    })
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <label className="text-[12px] font-medium text-[#4b5563]">{label}</label>
      <input
        type="text"
        placeholder="Search by name or email..."
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="profile-input"
      />
      <div className="max-h-[176px] overflow-auto rounded-[10px] border border-[#e5e7eb] bg-white">
        {options.length === 0 && (
          <div className="px-3 py-2 text-[12px] text-[#9ca3af]">No matching participants</div>
        )}
        {options.map((participant) => {
          const active = selectedUids.includes(participant.uid);

          return (
            <button
              key={participant.uid}
              type="button"
              onClick={() => onToggle(participant.uid)}
              className={`w-full px-3 py-2 text-left border-0 border-b border-[#f3f4f6] cursor-pointer text-[12px] ${
                active ? 'bg-[#eef2ff] text-[#1f2937] font-medium' : 'bg-white text-[#374151]'
              }`}
            >
              <div className="truncate">
                {active ? '✓ ' : ''}{participant.displayName}
              </div>
              <div className="truncate text-[11px] text-[#6b7280]">{participant.email}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toggleUid(values: string[], uid: string) {
  return values.includes(uid)
    ? values.filter((value) => value !== uid)
    : [...values, uid];
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

function toDatetimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

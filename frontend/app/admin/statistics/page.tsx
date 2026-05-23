'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type RoomOccupancyPayload = {
  summary: {
    roomsCount: number;
    activeRoomsCount: number;
    totalSlots: number;
    averageOccupancyPercent: number;
    averageCapacityUtilizationPercent: number;
  };
  rooms: Array<{
    roomId: string;
    roomName: string;
    bookedSlots: number;
    totalSlots: number;
    occupancyRatePercent: number;
    usedSeats: number;
    totalSeats: number;
    capacityUtilizationPercent: number;
    capacity: number;
    active: boolean;
  }>;
};

type ConfirmedMeetingsPayload = {
  summary: {
    confirmedMeetingsCount: number;
    confirmedCareerInterviewsCount: number;
    confirmedTotalCount: number;
    pendingInterviewInvitesCount: number;
    acceptedInterviewInvitesCount: number;
    rejectedInterviewInvitesCount: number;
    inviteAcceptanceRatePercent: number;
    conflictMetrics?: {
      roomSlotConflicts: number;
      participantConflicts: number;
      interviewerConflicts: number;
      candidateConflicts: number;
    };
    previousPeriod?: {
      confirmedTotalCount: number;
      confirmedMeetingsCount: number;
      confirmedCareerInterviewsCount: number;
      deltaTotalPercent: number;
    };
  };
  series: Array<{
    date: string;
    meetings: number;
    interviews: number;
    total: number;
  }>;
  heatmap: Array<{
    hour: number;
    meetings: number;
    interviews: number;
    total: number;
  }>;
  funnel: Array<{
    stage: string;
    value: number;
  }>;
};

type RangePreset = 'all' | '7d' | '30d' | 'custom';

export default function AdminStatisticsPage() {
  const user = useStoredUser();
  const [occupancy, setOccupancy] = useState<RoomOccupancyPayload | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedMeetingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState<RangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const range = useMemo(() => {
    if (preset === 'all') return { from: '', to: '' };

    const now = new Date();
    if (preset === '7d') {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (preset === '30d') {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: now.toISOString() };
    }

    const fromIso = customFrom
      ? new Date(`${customFrom}T00:00:00`).toISOString()
      : '';
    const toIso = customTo ? new Date(`${customTo}T23:59:59.999`).toISOString() : '';
    return { from: fromIso, to: toIso };
  }, [preset, customFrom, customTo]);
  const refreshKey = `${range.from}_${range.to}_${preset}_${refreshTick}`;

  useEffect(() => {
    if (!user?.idToken) return;
    const idToken = user.idToken;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const occupancyUrl = new URL(`${API}/statistics/room-occupancy`);
        const confirmedUrl = new URL(`${API}/statistics/confirmed-meetings`);
        if (range.from) {
          occupancyUrl.searchParams.set('from', range.from);
          confirmedUrl.searchParams.set('from', range.from);
        }
        if (range.to) {
          occupancyUrl.searchParams.set('to', range.to);
          confirmedUrl.searchParams.set('to', range.to);
        }

        const [occupancyRes, confirmedRes] = await Promise.all([
          fetch(occupancyUrl.toString(), {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
          fetch(confirmedUrl.toString(), {
            headers: { Authorization: `Bearer ${idToken}` },
          }),
        ]);

        if (!occupancyRes.ok || !confirmedRes.ok) {
          throw new Error('Failed to load statistics');
        }

        const occupancyPayload =
          (await occupancyRes.json()) as RoomOccupancyPayload;
        const confirmedPayload =
          (await confirmedRes.json()) as ConfirmedMeetingsPayload;

        setOccupancy(occupancyPayload);
        setConfirmed(confirmedPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user?.idToken, range.from, range.to, refreshKey]);

  useEffect(() => {
    if (!autoRefresh || !user?.idToken) return;
    const interval = setInterval(() => {
      setRefreshTick((value) => value + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, [autoRefresh, user?.idToken]);

  const sortedRooms = useMemo(
    () =>
      [...(occupancy?.rooms ?? [])].sort(
        (a, b) => b.occupancyRatePercent - a.occupancyRatePercent,
      ),
    [occupancy?.rooms],
  );
  const series = useMemo(() => confirmed?.series ?? [], [confirmed?.series]);
  const heatmap = useMemo(() => confirmed?.heatmap ?? [], [confirmed?.heatmap]);
  const funnel = useMemo(() => confirmed?.funnel ?? [], [confirmed?.funnel]);
  const selectedDaySeries = useMemo(
    () => (selectedDate ? series.find((entry) => entry.date === selectedDate) : null),
    [selectedDate, series],
  );
  const selectedHourSeries = useMemo(
    () => (selectedHour === null ? null : heatmap.find((entry) => entry.hour === selectedHour) ?? null),
    [selectedHour, heatmap],
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[32px] font-bold tracking-tight">Statistics</h1>
        <p className="text-sm text-[#8e8e93] mt-1">
          Room occupancy and confirmed meeting trends for organizers.
        </p>
      </div>

      <section className="rounded-[12px] border border-[#ececec] bg-white p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <PresetButton
            active={preset === 'all'}
            label="All"
            onClick={() => setPreset('all')}
          />
          <PresetButton
            active={preset === '7d'}
            label="Last 7d"
            onClick={() => setPreset('7d')}
          />
          <PresetButton
            active={preset === '30d'}
            label="Last 30d"
            onClick={() => setPreset('30d')}
          />
          <PresetButton
            active={preset === 'custom'}
            label="Custom"
            onClick={() => setPreset('custom')}
          />

          <div className="ml-auto flex gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-[#6b7280] mr-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
                className="h-4 w-4 rounded border-[#d1d5db]"
              />
              Auto refresh (60s)
            </label>
            <label className="text-xs text-[#6b7280]">
              From
              <input
                type="date"
                value={customFrom}
                onChange={(event) => {
                  setPreset('custom');
                  setCustomFrom(event.target.value);
                }}
                className="ml-1 rounded-[8px] border border-[#d1d5db] px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-[#6b7280]">
              To
              <input
                type="date"
                value={customTo}
                onChange={(event) => {
                  setPreset('custom');
                  setCustomTo(event.target.value);
                }}
                className="ml-1 rounded-[8px] border border-[#d1d5db] px-2 py-1.5 text-sm"
              />
            </label>
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <StatCard
          label="Confirmed total"
          value={confirmed?.summary.confirmedTotalCount ?? 0}
        />
        <StatCard
          label="Meetings"
          value={confirmed?.summary.confirmedMeetingsCount ?? 0}
        />
        <StatCard
          label="Interviews"
          value={confirmed?.summary.confirmedCareerInterviewsCount ?? 0}
        />
        <StatCard
          label="Avg occupancy"
          value={`${occupancy?.summary.averageOccupancyPercent ?? 0}%`}
        />
        <StatCard
          label="Seat utilization"
          value={`${occupancy?.summary.averageCapacityUtilizationPercent ?? 0}%`}
        />
        <StatCard
          label="Invite acceptance"
          value={`${confirmed?.summary.inviteAcceptanceRatePercent ?? 0}%`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Prev period total"
          value={confirmed?.summary.previousPeriod?.confirmedTotalCount ?? 0}
        />
        <StatCard
          label="Total Δ vs prev"
          value={`${confirmed?.summary.previousPeriod?.deltaTotalPercent ?? 0}%`}
        />
        <StatCard
          label="Room conflicts"
          value={confirmed?.summary.conflictMetrics?.roomSlotConflicts ?? 0}
        />
        <StatCard
          label="Participant conflicts"
          value={confirmed?.summary.conflictMetrics?.participantConflicts ?? 0}
        />
        <StatCard
          label="Interviewer conflicts"
          value={confirmed?.summary.conflictMetrics?.interviewerConflicts ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <section className="rounded-[12px] border border-[#ececec] p-4 bg-white">
          <h2 className="text-[16px] font-semibold mb-1">Confirmed Over Time</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            X-axis: date, Y-axis: count (meetings/interviews/total).
          </p>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() =>
                exportCsv(
                  'confirmed_over_time.csv',
                  ['date', 'meetings', 'interviews', 'total'],
                  series.map((entry) => [
                    entry.date,
                    String(entry.meetings),
                    String(entry.interviews),
                    String(entry.total),
                  ]),
                )
              }
              className="rounded-[8px] border border-[#d1d5db] px-2.5 py-1.5 text-xs text-[#374151] hover:bg-[#f9fafb]"
            >
              Export CSV
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-[#8e8e93]">Loading chart...</p>
          ) : series.length === 0 ? (
            <EmptyChart message="No confirmed records in selected range." />
          ) : (
            <MultiLineChart
              series={series.map((entry) => ({
                date: entry.date,
                xLabel: entry.date.slice(5),
                meetings: entry.meetings,
                interviews: entry.interviews,
                total: entry.total,
              }))}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}
          {selectedDaySeries && (
            <div className="mt-3 rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs text-[#334155]">
              {selectedDaySeries.date}: total {selectedDaySeries.total} (meetings{' '}
              {selectedDaySeries.meetings}, interviews {selectedDaySeries.interviews})
            </div>
          )}
        </section>

        <section className="rounded-[12px] border border-[#ececec] p-4 bg-white">
          <h2 className="text-[16px] font-semibold mb-1">Room Occupancy (%)</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            X-axis: room, Y-axis: occupancy percentage.
          </p>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() =>
                exportCsv(
                  'room_occupancy.csv',
                  [
                    'room',
                    'active',
                    'capacity',
                    'booked_slots',
                    'total_slots',
                    'used_seats',
                    'total_seats',
                    'occupancy_percent',
                    'seat_utilization_percent',
                  ],
                  sortedRooms.map((room) => [
                    room.roomName,
                    room.active ? 'yes' : 'no',
                    String(room.capacity),
                    String(room.bookedSlots),
                    String(room.totalSlots),
                    String(room.usedSeats),
                    String(room.totalSeats),
                    String(room.occupancyRatePercent),
                    String(room.capacityUtilizationPercent),
                  ]),
                )
              }
              className="rounded-[8px] border border-[#d1d5db] px-2.5 py-1.5 text-xs text-[#374151] hover:bg-[#f9fafb]"
            >
              Export CSV
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-[#8e8e93]">Loading chart...</p>
          ) : sortedRooms.length === 0 ? (
            <EmptyChart message="No rooms available." />
          ) : (
            <BarChart
              bars={sortedRooms.map((room) => ({
                label: room.roomName,
                value: room.occupancyRatePercent,
              }))}
            />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <section className="rounded-[12px] border border-[#ececec] p-4 bg-white">
          <h2 className="text-[16px] font-semibold mb-1">Interview Funnel</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            Pending, accepted, rejected, and confirmed totals.
          </p>
          {loading ? (
            <p className="text-sm text-[#8e8e93]">Loading funnel...</p>
          ) : funnel.length === 0 ? (
            <EmptyChart message="No funnel data." />
          ) : (
            <FunnelBars
              items={funnel.map((entry) => ({
                label: stageLabel(entry.stage),
                value: entry.value,
              }))}
            />
          )}
        </section>

        <section className="rounded-[12px] border border-[#ececec] p-4 bg-white">
          <h2 className="text-[16px] font-semibold mb-1">Hourly Heatmap</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            X-axis: hour of day, intensity: confirmed volume.
          </p>
          {loading ? (
            <p className="text-sm text-[#8e8e93]">Loading heatmap...</p>
          ) : heatmap.length === 0 ? (
            <EmptyChart message="No hourly data in selected range." />
          ) : (
            <HourlyHeatmap
              data={heatmap}
              selectedHour={selectedHour}
              onSelectHour={setSelectedHour}
            />
          )}
          {selectedHourSeries && (
            <div className="mt-3 rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs text-[#334155]">
              {String(selectedHourSeries.hour).padStart(2, '0')}:00: total{' '}
              {selectedHourSeries.total} (meetings {selectedHourSeries.meetings},
              interviews {selectedHourSeries.interviews})
            </div>
          )}
        </section>
      </div>

      <section className="rounded-[12px] border border-[#ececec] bg-white p-4">
        <h2 className="text-[16px] font-semibold mb-3">Room Occupancy Details</h2>
        {loading ? (
          <p className="text-sm text-[#8e8e93]">Loading room details...</p>
        ) : sortedRooms.length === 0 ? (
          <p className="text-sm text-[#8e8e93]">No room statistics available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#8e8e93] border-b border-[#f1f5f9]">
                  <th className="py-2 pr-3">Room</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2 pr-3">Capacity</th>
                  <th className="py-2 pr-3">Booked Slots</th>
                  <th className="py-2 pr-3">Total Slots</th>
                  <th className="py-2 pr-3">Used Seats</th>
                  <th className="py-2 pr-3">Total Seats</th>
                  <th className="py-2">Occupancy %</th>
                  <th className="py-2">Seat Utilization %</th>
                </tr>
              </thead>
              <tbody>
                {sortedRooms.map((room) => (
                  <tr key={room.roomId} className="border-b border-[#f8fafc]">
                    <td className="py-2 pr-3 font-medium">{room.roomName}</td>
                    <td className="py-2 pr-3">
                      {room.active ? (
                        <span className="text-[#166534]">Yes</span>
                      ) : (
                        <span className="text-[#b91c1c]">No</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{room.capacity}</td>
                    <td className="py-2 pr-3">{room.bookedSlots}</td>
                    <td className="py-2 pr-3">{room.totalSlots}</td>
                    <td className="py-2 pr-3">{room.usedSeats}</td>
                    <td className="py-2 pr-3">{room.totalSeats}</td>
                    <td className="py-2 font-semibold">
                      {room.occupancyRatePercent}%
                    </td>
                    <td className="py-2 font-semibold">
                      {room.capacityUtilizationPercent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function stageLabel(stage: string) {
  switch (stage) {
    case 'pending_invites':
      return 'Pending';
    case 'accepted_invites':
      return 'Accepted';
    case 'rejected_invites':
      return 'Rejected';
    case 'confirmed_total':
      return 'Confirmed';
    default:
      return stage;
  }
}

function PresetButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[8px] px-3 py-1.5 text-sm border ${
        active
          ? 'bg-[#111827] text-white border-[#111827]'
          : 'bg-white text-[#374151] border-[#d1d5db] hover:bg-[#f9fafb]'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[260px] rounded-[10px] border border-dashed border-[#e2e8f0] flex items-center justify-center text-sm text-[#8e8e93]">
      {message}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[10px] border border-[#ececec] bg-white px-4 py-3">
      <p className="text-[12px] text-[#8e8e93]">{label}</p>
      <p className="text-[22px] font-bold leading-tight mt-1">{value}</p>
    </div>
  );
}

function MultiLineChart({
  series,
  selectedDate,
  onSelectDate,
}: {
  series: Array<{
    xLabel: string;
    date: string;
    meetings: number;
    interviews: number;
    total: number;
  }>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const width = 680;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 34, left: 40 };
  const maxValue = Math.max(
    1,
    ...series.flatMap((entry) => [entry.meetings, entry.interviews, entry.total]),
  );
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const points = series.map((entry, index) => {
    const x =
      padding.left +
      (series.length > 1 ? (index / (series.length - 1)) * plotWidth : plotWidth / 2);
    const toY = (value: number) =>
      padding.top + (1 - value / maxValue) * plotHeight;
    return {
      ...entry,
      x,
      yMeetings: toY(entry.meetings),
      yInterviews: toY(entry.interviews),
      yTotal: toY(entry.total),
    };
  });

  const toPath = (coord: 'yMeetings' | 'yInterviews' | 'yTotal') =>
    points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point[coord]}`)
      .join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[460px] h-[260px]">
        <line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          stroke="#d1d5db"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotHeight}
          stroke="#d1d5db"
        />
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const y = padding.top + (1 - step) * plotHeight;
          const value = Math.round(step * maxValue);
          return (
            <g key={step}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="#f1f5f9"
              />
              <text x={8} y={y + 4} fontSize={11} fill="#94a3b8">
                {value}
              </text>
            </g>
          );
        })}

        <path d={toPath('yMeetings')} fill="none" stroke="#0ea5e9" strokeWidth={2.2} />
        <path d={toPath('yInterviews')} fill="none" stroke="#f97316" strokeWidth={2.2} />
        <path d={toPath('yTotal')} fill="none" stroke="#111827" strokeWidth={2.6} />

        {points.map((point) => (
          <g key={point.xLabel}>
            <circle
              cx={point.x}
              cy={point.yMeetings}
              r={2.8}
              fill="#0ea5e9"
              className="cursor-pointer"
              onClick={() =>
                onSelectDate(selectedDate === point.date ? null : point.date)
              }
            />
            <circle
              cx={point.x}
              cy={point.yInterviews}
              r={2.8}
              fill="#f97316"
              className="cursor-pointer"
              onClick={() =>
                onSelectDate(selectedDate === point.date ? null : point.date)
              }
            />
            <circle
              cx={point.x}
              cy={point.yTotal}
              r={selectedDate === point.date ? 4.8 : 3.1}
              fill="#111827"
              className="cursor-pointer"
              onClick={() =>
                onSelectDate(selectedDate === point.date ? null : point.date)
              }
            />
          </g>
        ))}

        {points.map((point) => (
          <text
            key={`label-${point.xLabel}`}
            x={point.x}
            y={height - 8}
            textAnchor="middle"
            fontSize={11}
            fill="#64748b"
          >
            {point.xLabel}
          </text>
        ))}
      </svg>

      <div className="mt-2 flex gap-4 text-xs text-[#6b7280]">
        <LegendDot color="#111827" label="Total" />
        <LegendDot color="#0ea5e9" label="Meetings" />
        <LegendDot color="#f97316" label="Interviews" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function BarChart({ bars }: { bars: Array<{ label: string; value: number }> }) {
  const width = 680;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 58, left: 40 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const barWidth = bars.length > 0 ? (plotWidth / bars.length) * 0.62 : 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[460px] h-[260px]">
        <line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          stroke="#d1d5db"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotHeight}
          stroke="#d1d5db"
        />
        {[0, 25, 50, 75, 100].map((value) => {
          const y = padding.top + (1 - value / 100) * plotHeight;
          return (
            <g key={value}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="#f1f5f9"
              />
              <text x={8} y={y + 4} fontSize={11} fill="#94a3b8">
                {value}
              </text>
            </g>
          );
        })}

        {bars.map((bar, index) => {
          const xCenter =
            padding.left + ((index + 0.5) / Math.max(1, bars.length)) * plotWidth;
          const valueHeight = (Math.max(0, Math.min(100, bar.value)) / 100) * plotHeight;
          const y = padding.top + plotHeight - valueHeight;
          const x = xCenter - barWidth / 2;

          return (
            <g key={bar.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={valueHeight}
                rx={4}
                fill="#111827"
              />
              <text
                x={xCenter}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                fill="#334155"
              >
                {Math.round(bar.value)}
              </text>
              <text
                x={xCenter}
                y={height - 8}
                textAnchor="middle"
                fontSize={11}
                fill="#64748b"
              >
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function FunnelBars({ items }: { items: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs text-[#6b7280] mb-1">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-[#f1f5f9] overflow-hidden">
            <div
              className="h-full bg-[#111827]"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function HourlyHeatmap({
  data,
  selectedHour,
  onSelectHour,
}: {
  data: Array<{ hour: number; total: number; meetings: number; interviews: number }>;
  selectedHour: number | null;
  onSelectHour: (hour: number | null) => void;
}) {
  const maxTotal = Math.max(1, ...data.map((entry) => entry.total));
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
      {data.map((entry) => {
        const intensity = entry.total / maxTotal;
        const bg = `rgba(17, 24, 39, ${0.15 + intensity * 0.75})`;
        const active = selectedHour === entry.hour;
        return (
          <button
            type="button"
            key={entry.hour}
            className={`rounded-[8px] p-2 text-white min-h-[58px] flex flex-col justify-between text-left ${
              active ? 'ring-2 ring-[#2563eb]' : ''
            }`}
            style={{ background: bg }}
            title={`${String(entry.hour).padStart(2, '0')}:00 — total ${entry.total}, meetings ${entry.meetings}, interviews ${entry.interviews}`}
            onClick={() => onSelectHour(active ? null : entry.hour)}
          >
            <span className="text-[10px] opacity-90">
              {String(entry.hour).padStart(2, '0')}:00
            </span>
            <span className="text-sm font-semibold leading-none">{entry.total}</span>
          </button>
        );
      })}
    </div>
  );
}

function exportCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

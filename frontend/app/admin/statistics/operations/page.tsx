'use client';

import { useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../../lib/auth';
import { useT } from '../../../lib/i18n';
import { StatisticsRangeFilter } from '../range-filter';
import { datesForPreset, toIsoRange, type RangePreset } from '../range';

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
  anomalies?: Array<{
    date: string;
    type: 'spike' | 'drop';
    previousTotal: number;
    currentTotal: number;
    deltaPercent: number;
  }>;
  drilldown?: Array<{
    type: 'meeting' | 'interview';
    id: string;
    status: string;
    invitationStatus?: string;
    date: string;
    hour: number;
    slotId: string;
    roomId: string;
    roomName: string;
    startAt: string;
    endAt: string;
    participantCount: number;
    requestedByCount?: number;
    requestedToCount?: number;
    candidateUid?: string;
    interviewerUid?: string | null;
  }>;
};

type VisibleSeries = {
  total: boolean;
  meetings: boolean;
  interviews: boolean;
};

export default function AdminStatisticsPage() {
  const t = useT();
  const user = useStoredUser();
  const [occupancy, setOccupancy] = useState<RoomOccupancyPayload | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedMeetingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState<RangePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<VisibleSeries>({
    total: true,
    meetings: true,
    interviews: true,
  });

  const range = useMemo(() => toIsoRange(customFrom, customTo), [customFrom, customTo]);

  function applyPreset(nextPreset: RangePreset) {
    setPreset(nextPreset);
    const dates = datesForPreset(nextPreset);
    setCustomFrom(dates.from);
    setCustomTo(dates.to);
  }

  useEffect(() => {
    if (!user?.idToken) return;
    const idToken = user.idToken;
    const controller = new AbortController();

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
            cache: 'no-store',
            signal: controller.signal,
          }),
          fetch(confirmedUrl.toString(), {
            headers: { Authorization: `Bearer ${idToken}` },
            cache: 'no-store',
            signal: controller.signal,
          }),
        ]);

        if (!occupancyRes.ok || !confirmedRes.ok) {
          const [occupancyErr, confirmedErr] = await Promise.all([
            safeParseError(occupancyRes),
            safeParseError(confirmedRes),
          ]);
          const message =
            !occupancyRes.ok && occupancyErr
              ? occupancyErr
              : !confirmedRes.ok && confirmedErr
                ? confirmedErr
                : `Failed to load statistics (${occupancyRes.status}/${confirmedRes.status})`;
          throw new Error(message);
        }

        const occupancyPayload =
          (await occupancyRes.json()) as RoomOccupancyPayload;
        const confirmedPayload =
          (await confirmedRes.json()) as ConfirmedMeetingsPayload;

        setOccupancy(occupancyPayload);
        setConfirmed(confirmedPayload);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [user?.idToken, range.from, range.to]);

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
  const anomalies = useMemo(
    () => confirmed?.anomalies ?? [],
    [confirmed?.anomalies],
  );
  const drilldown = useMemo(
    () => confirmed?.drilldown ?? [],
    [confirmed?.drilldown],
  );
  const selectedDaySeries = useMemo(
    () => (selectedDate ? series.find((entry) => entry.date === selectedDate) : null),
    [selectedDate, series],
  );
  const selectedHourSeries = useMemo(
    () => (selectedHour === null ? null : heatmap.find((entry) => entry.hour === selectedHour) ?? null),
    [selectedHour, heatmap],
  );
  const drilldownRows = useMemo(() => {
    return drilldown.filter((row) => {
      const byDate = selectedDate ? row.date === selectedDate : true;
      const byHour = selectedHour === null ? true : row.hour === selectedHour;
      return byDate && byHour;
    });
  }, [drilldown, selectedDate, selectedHour]);
  const isNoData = !loading && series.length === 0 && sortedRooms.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[32px] font-bold tracking-tight">{t('admin.stats.title', 'Statistics')}</h1>
        <p className="text-sm text-[#8e8e93] mt-1">
          {t('admin.stats.operations.subtitle', 'Room occupancy and confirmed meeting trends for organizers.')}
        </p>
      </div>

      <StatisticsRangeFilter
        preset={preset}
        from={customFrom}
        to={customTo}
        onPresetChange={applyPreset}
        onFromChange={setCustomFrom}
        onToChange={setCustomTo}
      />

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {isNoData && (
        <section className="rounded-[12px] border border-[#e5e7eb] bg-white p-4 mb-6">
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.operations.noDataTitle', 'No data in selected range')}</h2>
          <p className="text-sm text-[#6b7280]">
            {t('admin.stats.operations.noDataDesc', 'Try All range, generate time slots, and confirm at least one meeting/interview. Statistics are based on confirmed records tied to existing slots.')}
          </p>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <StatCard
          label={t('admin.stats.operations.confirmedTotal', 'Confirmed total')}
          value={confirmed?.summary.confirmedTotalCount ?? 0}
        />
        <StatCard
          label={t('admin.stats.operations.meetings', 'Meetings')}
          value={confirmed?.summary.confirmedMeetingsCount ?? 0}
        />
        <StatCard
          label={t('admin.stats.operations.interviews', 'Interviews')}
          value={confirmed?.summary.confirmedCareerInterviewsCount ?? 0}
        />
        <StatCard
          label={t('admin.stats.operations.avgOccupancy', 'Avg occupancy')}
          value={`${occupancy?.summary.averageOccupancyPercent ?? 0}%`}
        />
        <StatCard
          label={t('admin.stats.operations.seatUtilization', 'Seat utilization')}
          value={`${occupancy?.summary.averageCapacityUtilizationPercent ?? 0}%`}
        />
        <StatCard
          label={t('admin.stats.operations.inviteAcceptance', 'Invite acceptance')}
          value={`${confirmed?.summary.inviteAcceptanceRatePercent ?? 0}%`}
        />
      </div>

      <section className="rounded-[12px] border border-[#ececec] bg-white p-4 mb-5">
        <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.operations.anomalyFlags', 'Anomaly Flags')}</h2>
        <p className="text-xs text-[#8e8e93] mb-3">
          {t('admin.stats.operations.anomalyDesc', 'Large day-to-day changes in total confirmed volume.')}
        </p>
        {loading ? (
          <p className="text-sm text-[#8e8e93]">{t('admin.stats.operations.checkingAnomalies', 'Checking anomalies...')}</p>
        ) : anomalies.length === 0 ? (
          <p className="text-sm text-[#8e8e93]">{t('admin.stats.operations.noAnomalies', 'No strong spikes or drops detected.')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {anomalies.slice(0, 8).map((item) => (
              <div
                key={`${item.date}_${item.type}`}
                className={`rounded-[10px] border px-3 py-2 text-sm ${
                  item.type === 'spike'
                    ? 'border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]'
                    : 'border-[#fecaca] bg-[#fef2f2] text-[#991b1b]'
                }`}
              >
                <div className="font-medium">
                  {item.type === 'spike'
                    ? t('admin.stats.operations.spike', 'Spike')
                    : t('admin.stats.operations.drop', 'Drop')}{' '}
                  {t('admin.stats.operations.onDate', 'on')} {item.date}
                </div>
                <div className="text-xs">
                  {item.previousTotal} → {item.currentTotal} ({item.deltaPercent}%)
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
        <section className="rounded-[12px] border border-[#ececec] p-4 bg-white">
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.operations.confirmedOverTime', 'Confirmed Over Time')}</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t(
              'admin.stats.operations.confirmedOverTimeDesc',
              'Shows confirmed meetings, interviews, and total confirmed items by day in the selected period.',
            )}
          </p>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() =>
                exportCsv(
                  'confirmed_over_time.csv',
                  [
                    'date',
                    ...(visibleSeries.meetings ? ['meetings'] : []),
                    ...(visibleSeries.interviews ? ['interviews'] : []),
                    ...(visibleSeries.total ? ['total'] : []),
                  ],
                  series.map((entry) => [
                    entry.date,
                    ...(visibleSeries.meetings ? [String(entry.meetings)] : []),
                    ...(visibleSeries.interviews ? [String(entry.interviews)] : []),
                    ...(visibleSeries.total ? [String(entry.total)] : []),
                  ]),
                )
              }
              className="rounded-[8px] border border-[#d1d5db] px-2.5 py-1.5 text-xs text-[#374151] hover:bg-[#f9fafb]"
            >
              {t('admin.stats.exportCsv', 'Export CSV')}
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-[#8e8e93]">{t('admin.stats.loadingChart', 'Loading chart...')}</p>
          ) : series.length === 0 ? (
            <EmptyChart message={t('admin.stats.operations.noConfirmedRecords', 'No confirmed records in selected range.')} />
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
              visibleSeries={visibleSeries}
              onVisibleSeriesChange={setVisibleSeries}
              anomalyDates={new Set(anomalies.map((item) => item.date))}
            />
          )}
          {selectedDaySeries && (
            <div className="mt-3 rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs text-[#334155]">
              {selectedDaySeries.date}: {t('admin.stats.operations.total', 'total')}{' '}
              {selectedDaySeries.total} ({t('admin.stats.operations.meetings', 'Meetings').toLowerCase()}{' '}
              {selectedDaySeries.meetings}, {t('admin.stats.operations.interviews', 'Interviews').toLowerCase()}{' '}
              {selectedDaySeries.interviews})
            </div>
          )}
        </section>

        <section className="rounded-[12px] border border-[#ececec] p-4 bg-white">
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.operations.roomOccupancy', 'Room Occupancy (%)')}</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t(
              'admin.stats.operations.roomOccupancyDesc',
              'Compares how much of each room schedule is booked in the selected period.',
            )}
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
              {t('admin.stats.exportCsv', 'Export CSV')}
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-[#8e8e93]">{t('admin.stats.loadingChart', 'Loading chart...')}</p>
          ) : sortedRooms.length === 0 ? (
            <EmptyChart message={t('admin.stats.operations.noRooms', 'No rooms available.')} />
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
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.operations.interviewFunnel', 'Interview Funnel')}</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t('admin.stats.operations.interviewFunnelDesc', 'Pending, accepted, rejected, and confirmed totals.')}
          </p>
          {loading ? (
            <p className="text-sm text-[#8e8e93]">{t('admin.stats.operations.loadingFunnel', 'Loading funnel...')}</p>
          ) : funnel.length === 0 ? (
            <EmptyChart message={t('admin.stats.operations.noFunnelData', 'No funnel data.')} />
          ) : (
            <FunnelBars
              items={funnel.map((entry) => ({
                label: stageLabel(entry.stage, t),
                value: entry.value,
              }))}
            />
          )}
        </section>

        <section className="rounded-[12px] border border-[#ececec] p-4 bg-white">
          <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.operations.hourlyHeatmap', 'Hourly Heatmap')}</h2>
          <p className="text-xs text-[#8e8e93] mb-3">
            {t(
              'admin.stats.operations.hourlyHeatmapDesc',
              'Highlights which hours contain the highest volume of confirmed meetings and interviews.',
            )}
          </p>
          {loading ? (
            <p className="text-sm text-[#8e8e93]">{t('admin.stats.operations.loadingHeatmap', 'Loading heatmap...')}</p>
          ) : heatmap.length === 0 ? (
            <EmptyChart message={t('admin.stats.operations.noHourlyData', 'No hourly data in selected range.')} />
          ) : (
            <HourlyHeatmap
              data={heatmap}
              selectedHour={selectedHour}
              onSelectHour={setSelectedHour}
            />
          )}
          {selectedHourSeries && (
            <div className="mt-3 rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs text-[#334155]">
              {String(selectedHourSeries.hour).padStart(2, '0')}:00:{' '}
              {t('admin.stats.operations.total', 'total')}{' '}
              {selectedHourSeries.total} ({t('admin.stats.operations.meetings', 'Meetings').toLowerCase()}{' '}
              {selectedHourSeries.meetings}, {t('admin.stats.operations.interviews', 'Interviews').toLowerCase()}{' '}
              {selectedHourSeries.interviews})
            </div>
          )}
        </section>
      </div>

      <section className="rounded-[12px] border border-[#ececec] bg-white p-4">
        <h2 className="text-[16px] font-semibold mb-3">{t('admin.stats.operations.roomDetails', 'Room Occupancy Details')}</h2>
        {loading ? (
          <p className="text-sm text-[#8e8e93]">{t('admin.stats.operations.loadingRoomDetails', 'Loading room details...')}</p>
        ) : sortedRooms.length === 0 ? (
          <p className="text-sm text-[#8e8e93]">{t('admin.stats.operations.noRoomStats', 'No room statistics available.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#8e8e93] border-b border-[#f1f5f9]">
                  <th className="py-2 pr-3">{t('admin.stats.operations.room', 'Room')}</th>
                  <th className="py-2 pr-3">{t('admin.stats.operations.active', 'Active')}</th>
                  <th className="py-2 pr-3">{t('admin.stats.operations.capacity', 'Capacity')}</th>
                  <th className="py-2 pr-3">{t('admin.stats.operations.bookedSlots', 'Booked Slots')}</th>
                  <th className="py-2 pr-3">{t('admin.stats.operations.totalSlots', 'Total Slots')}</th>
                  <th className="py-2 pr-3">{t('admin.stats.operations.usedSeats', 'Used Seats')}</th>
                  <th className="py-2 pr-3">{t('admin.stats.operations.totalSeats', 'Total Seats')}</th>
                  <th className="py-2">{t('admin.stats.operations.occupancyPercent', 'Occupancy %')}</th>
                  <th className="py-2">{t('admin.stats.operations.seatUtilizationPercent', 'Seat Utilization %')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRooms.map((room) => (
                  <tr key={room.roomId} className="border-b border-[#f8fafc]">
                    <td className="py-2 pr-3 font-medium">{room.roomName}</td>
                    <td className="py-2 pr-3">
                      {room.active ? (
                        <span className="text-[#166534]">{t('common.yes', 'Yes')}</span>
                      ) : (
                        <span className="text-[#b91c1c]">{t('common.no', 'No')}</span>
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

      <section className="rounded-[12px] border border-[#ececec] bg-white p-4 mt-5">
        <h2 className="text-[16px] font-semibold mb-1">{t('admin.stats.operations.drilldownRecords', 'Drill-down Records')}</h2>
        <p className="text-xs text-[#8e8e93] mb-3">
          {t('admin.stats.operations.drilldownDesc', 'Click a day in the line chart or an hour in the heatmap to filter.')}
        </p>
        {loading ? (
          <p className="text-sm text-[#8e8e93]">{t('admin.stats.operations.loadingRecords', 'Loading records...')}</p>
        ) : drilldownRows.length === 0 ? (
          <p className="text-sm text-[#8e8e93]">{t('admin.stats.operations.noRecords', 'No records for current selection.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  exportCsv(
                    'drilldown_filtered.csv',
                    ['type', 'date', 'time', 'room', 'participants', 'status', 'id'],
                    drilldownRows.map((row) => [
                      row.type,
                      row.date,
                      formatTimeRange(row.startAt, row.endAt),
                      row.roomName,
                      String(row.participantCount),
                      row.type === 'interview' && row.invitationStatus
                        ? `${row.status} (${row.invitationStatus})`
                        : row.status,
                      row.id,
                    ]),
                  )
                }
                className="rounded-[8px] border border-[#d1d5db] px-2.5 py-1.5 text-xs text-[#374151] hover:bg-[#f9fafb]"
              >
                {t('admin.stats.operations.exportFilteredCsv', 'Export filtered CSV')}
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#8e8e93] border-b border-[#f1f5f9]">
                  <th className="py-2 pr-3">{t('admin.stats.operations.type', 'Type')}</th>
                  <th className="py-2 pr-3">{t('admin.chart.axis.date', 'Date')}</th>
                  <th className="py-2 pr-3">{t('admin.stats.operations.time', 'Time')}</th>
                  <th className="py-2 pr-3">{t('admin.stats.operations.room', 'Room')}</th>
                  <th className="py-2 pr-3">{t('admin.stats.operations.participants', 'Participants')}</th>
                  <th className="py-2 pr-3">{t('admin.stats.operations.status', 'Status')}</th>
                  <th className="py-2">ID</th>
                </tr>
              </thead>
              <tbody>
                {drilldownRows.slice(0, 100).map((row) => (
                  <tr key={`${row.type}_${row.id}`} className="border-b border-[#f8fafc]">
                    <td className="py-2 pr-3 capitalize">{row.type}</td>
                    <td className="py-2 pr-3">{row.date}</td>
                    <td className="py-2 pr-3">
                      {formatTimeRange(row.startAt, row.endAt)}
                    </td>
                    <td className="py-2 pr-3">{row.roomName}</td>
                    <td className="py-2 pr-3">{row.participantCount}</td>
                    <td className="py-2 pr-3">
                      {row.status}
                      {row.type === 'interview' && row.invitationStatus
                        ? ` (${row.invitationStatus})`
                        : ''}
                    </td>
                    <td className="py-2 font-mono text-xs">{row.id}</td>
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

async function safeParseError(response: Response) {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      errorCode?: string;
    };
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : Array.isArray(payload.message)
          ? payload.message.join(', ')
          : `Request failed with ${response.status}`;
    return payload.errorCode ? `${payload.errorCode}: ${message}` : message;
  } catch {
    return null;
  }
}

function formatTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-';
  return `${String(start.getHours()).padStart(2, '0')}:${String(
    start.getMinutes(),
  ).padStart(2, '0')} - ${String(end.getHours()).padStart(2, '0')}:${String(
    end.getMinutes(),
  ).padStart(2, '0')}`;
}

function stageLabel(stage: string, t: ReturnType<typeof useT>) {
  switch (stage) {
    case 'pending_invites':
      return t('admin.stats.operations.pending', 'Pending');
    case 'accepted_invites':
      return t('admin.stats.operations.accepted', 'Accepted');
    case 'rejected_invites':
      return t('admin.stats.operations.rejected', 'Rejected');
    case 'confirmed_total':
      return t('admin.stats.operations.confirmed', 'Confirmed');
    default:
      return stage;
  }
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
  visibleSeries,
  onVisibleSeriesChange,
  anomalyDates,
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
  visibleSeries: VisibleSeries;
  onVisibleSeriesChange: (value: VisibleSeries) => void;
  anomalyDates: Set<string>;
}) {
  const t = useT();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    total: number;
    meetings: number;
    interviews: number;
  } | null>(null);

  const width = 680;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 46, left: 46 };
  const activeSeriesKeys = [
    visibleSeries.total ? 'total' : null,
    visibleSeries.meetings ? 'meetings' : null,
    visibleSeries.interviews ? 'interviews' : null,
  ].filter(Boolean) as Array<'total' | 'meetings' | 'interviews'>;

  const valuePool =
    activeSeriesKeys.length === 0
      ? [0]
      : series.flatMap((entry) =>
          activeSeriesKeys.map((key) => entry[key]),
        );

  const rawMaxValue = Math.max(
    1,
    ...valuePool,
  );
  const roundedMaxValue = rawMaxValue <= 5 ? 5 : Math.ceil(rawMaxValue / 5) * 5;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const points = series.map((entry, index) => {
    const x =
      padding.left +
      (series.length > 1 ? (index / (series.length - 1)) * plotWidth : plotWidth / 2);
    const toY = (value: number) =>
      padding.top + (1 - value / roundedMaxValue) * plotHeight;
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
  const yTicks = 5;
  const xLabelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div className="relative w-full overflow-x-auto">
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
        {Array.from({ length: yTicks + 1 }, (_, index) => index).map((tick) => {
          const step = tick / yTicks;
          const y = padding.top + (1 - step) * plotHeight;
          const value = Math.round(step * roundedMaxValue);
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + plotWidth}
                y2={y}
                stroke="#e8edf3"
              />
              <text x={12} y={y + 4} fontSize={11} fill="#94a3b8">
                {value}
              </text>
            </g>
          );
        })}

        {visibleSeries.meetings && (
          <path d={toPath('yMeetings')} fill="none" stroke="#0ea5e9" strokeWidth={2.2} />
        )}
        {visibleSeries.interviews && (
          <path d={toPath('yInterviews')} fill="none" stroke="#f97316" strokeWidth={2.2} />
        )}
        {visibleSeries.total && (
          <path d={toPath('yTotal')} fill="none" stroke="#111827" strokeWidth={2.6} />
        )}

        {points.map((point) => (
          <g
            key={point.xLabel}
            className="cursor-pointer"
            onMouseMove={(event) =>
              setTooltip({
                x: event.clientX,
                y: event.clientY,
                date: point.date,
                total: point.total,
                meetings: point.meetings,
                interviews: point.interviews,
              })
            }
            onMouseLeave={() => setTooltip(null)}
            onClick={() => onSelectDate(selectedDate === point.date ? null : point.date)}
          >
            {visibleSeries.meetings && <circle cx={point.x} cy={point.yMeetings} r={2.8} fill="#0ea5e9" />}
            {visibleSeries.interviews && <circle cx={point.x} cy={point.yInterviews} r={2.8} fill="#f97316" />}
            {visibleSeries.total && (
              <circle
                cx={point.x}
                cy={point.yTotal}
                r={selectedDate === point.date ? 4.8 : 3.1}
                fill="#111827"
              />
            )}
            {anomalyDates.has(point.date) && (
              <circle
                cx={point.x}
                cy={point.yTotal}
                r={7}
                fill="none"
                stroke="#ef4444"
                strokeWidth={1.8}
                strokeDasharray="2 2"
              />
            )}
          </g>
        ))}

        {points.map((point, index) => (
          index % xLabelStep === 0 || index === points.length - 1 ? (
            <text
              key={`label-${point.xLabel}`}
              x={point.x}
              y={height - 16}
              textAnchor="middle"
              fontSize={11}
              fill="#64748b"
            >
              {point.xLabel}
            </text>
          ) : null
        ))}
      </svg>

      {tooltip && (
        <div
          className="fixed z-30 rounded-[8px] border border-[#e2e8f0] bg-white/95 px-2.5 py-1.5 text-xs text-[#0f172a] shadow-md"
          style={{ left: tooltip.x + 12, top: tooltip.y - 60 }}
        >
          <div className="font-medium mb-0.5">{tooltip.date}</div>
          {visibleSeries.total && <div>{t('admin.stats.operations.total', 'Total')}: {tooltip.total}</div>}
          {visibleSeries.meetings && <div>{t('admin.stats.operations.meetings', 'Meetings')}: {tooltip.meetings}</div>}
          {visibleSeries.interviews && <div>{t('admin.stats.operations.interviews', 'Interviews')}: {tooltip.interviews}</div>}
          {anomalyDates.has(tooltip.date) && (
            <div className="text-[#b91c1c] font-medium mt-0.5">{t('admin.stats.operations.anomalyFlagged', 'Anomaly flagged')}</div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-5 text-xs text-[#6b7280]">
        <LegendPill
          color="#111827"
          label={t('admin.stats.operations.total', 'Total')}
          active={visibleSeries.total}
          onClick={() =>
            onVisibleSeriesChange({ ...visibleSeries, total: !visibleSeries.total })
          }
        />
        <LegendPill
          color="#0ea5e9"
          label={t('admin.stats.operations.meetings', 'Meetings')}
          active={visibleSeries.meetings}
          onClick={() =>
            onVisibleSeriesChange({
              ...visibleSeries,
              meetings: !visibleSeries.meetings,
            })
          }
        />
        <LegendPill
          color="#f97316"
          label={t('admin.stats.operations.interviews', 'Interviews')}
          active={visibleSeries.interviews}
          onClick={() =>
            onVisibleSeriesChange({
              ...visibleSeries,
              interviews: !visibleSeries.interviews,
            })
          }
        />
      </div>
    </div>
  );
}

function LegendPill({
  color,
  label,
  active,
  onClick,
}: {
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 transition-opacity ${active ? 'opacity-100' : 'opacity-35 hover:opacity-60'}`}
      aria-pressed={active}
      title={active ? `Hide ${label}` : `Show ${label}`}
    >
      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
      <span className="text-sm">{label}</span>
    </button>
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

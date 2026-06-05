'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SessionItem, Speaker } from './SessionCard';
import TagPicker from './TagPicker';
import ClockTimePicker from './ClockTimePicker';
import { useT } from '../lib/i18n';

export type SessionFormValues = {
  title: string;
  description: string;
  speakers: Speaker[];
  startAt: string;
  endAt: string;
  location: string;
  capacity: number | null;
  tags: string[];
  presenterUid?: string;
  presenterName?: string;
};

type SessionFormModalProps = {
  session: SessionItem | null;
  token: string;
  eventStartAt: string;
  eventEndAt: string;
  onClose: () => void;
  onSave: (values: SessionFormValues) => Promise<void>;
};

type CommunityUser = {
  uid: string;
  displayName: string;
  bio?: string;
  role?: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function toDatePart(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimePart(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '';
  const diffMs =
    new Date(`1970-01-01T${endTime}`).getTime() -
    new Date(`1970-01-01T${startTime}`).getTime();
  if (diffMs <= 0) return '';
  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return [hours && `${hours}h`, mins && `${mins}min`].filter(Boolean).join(' ');
}

function getEventDays(startAt: string, endAt: string): string[] {
  const days: string[] = [];
  const cur = new Date(startAt);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(endAt);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    days.push(toDatePart(cur.toISOString()));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function formatDayLabel(dateStr: string): string {
  // Append time to avoid UTC-midnight shifting the date in local timezone
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('sl-SI', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });
}

type SessionFormInternal = {
  title: string;
  description: string;
  speakers: Speaker[];
  selectedDay: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number | null;
  tags: string[];
  presenterName: string;
  presenterUid: string;
};

const EMPTY: SessionFormInternal = {
  title: '',
  description: '',
  speakers: [],
  selectedDay: '',
  startTime: '',
  endTime: '',
  location: '',
  capacity: null,
  tags: [],
  presenterName: '',
  presenterUid: '',
};

function sessionToForm(session: SessionItem): SessionFormInternal {
  return {
    title: session.title,
    description: session.description,
    speakers: session.speakers,
    selectedDay: toDatePart(session.startAt),
    startTime: toTimePart(session.startAt),
    endTime: toTimePart(session.endAt),
    location: session.location,
    capacity: session.capacity,
    tags: session.tags ?? [],
    presenterName: session.presenterName ?? '',
    presenterUid: '',
  };
}

export default function SessionFormModal({
  session,
  token,
  eventStartAt,
  eventEndAt,
  onClose,
  onSave,
}: SessionFormModalProps) {
  const t = useT();
  const [form, setForm] = useState<SessionFormInternal>(() =>
    session
      ? sessionToForm(session)
      : { ...EMPTY, selectedDay: toDatePart(eventStartAt) },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => onClose(), [onClose]);

  // Fetch community users for speaker autocomplete
  useEffect(() => {
    const token = JSON.parse(
      localStorage.getItem('confera_user') ?? 'null',
    ) as { idToken?: string } | null;
    if (!token?.idToken) return;
    void fetch(`${API}/users/community`, {
      headers: { Authorization: `Bearer ${token.idToken}` },
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setUsers(data as CommunityUser[]);
        }
      })
      .catch(() => {
        /* autocomplete unavailable — fail silently */
      });
  }, []);

  useEffect(() => {
    firstInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.startTime || !form.endTime) {
      setError(t('sessionForm.error.selectTime', 'Select session time.'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        title: form.title,
        description: form.description,
        speakers: form.speakers,
        startAt: `${form.selectedDay}T${form.startTime}`,
        endAt: `${form.selectedDay}T${form.endTime}`,
        location: form.location,
        capacity: form.capacity,
        tags: form.tags,
        ...(form.presenterUid !== '' && { presenterUid: form.presenterUid }),
        ...(form.presenterName.trim() !== '' && { presenterName: form.presenterName.trim() }),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('events.error.save', 'Save failed.'),
      );
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof SessionFormInternal>(
    field: K,
    value: SessionFormInternal[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }


  const days = getEventDays(eventStartAt, eventEndAt);
  const isMultiDay = days.length > 1;

  return (
    <>
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-[18px] w-full max-w-[calc(100vw-2rem)] sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-form-title"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 id="session-form-title" className="text-[17px] font-bold">
            {session
              ? t('sessionForm.title.edit', 'Edit session')
              : t('sessionForm.title.create', 'Add session')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#f3f4f6] flex items-center justify-center text-[#6b7280] hover:bg-[#e5e7eb] border-0 cursor-pointer font-sans text-[14px]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
              {t('eventForm.field.title')} *
            </span>
            <input
              ref={firstInputRef}
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
            />
          </label>

          {/* Description */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
              {t('eventForm.field.description')} *
            </span>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors resize-none"
            />
          </label>

          {/* Presenter picker */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
              Predavatelj
            </span>
            <PresenterPicker
              name={form.presenterName}
              uid={form.presenterUid}
              industryUsers={users.filter((u) => u.role !== 'participant')}
              onChange={(name, uid) => setForm((prev) => ({ ...prev, presenterName: name, presenterUid: uid }))}
            />
          </div>

          {/* Day + time */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
              {t('sessionForm.time', 'Session time')} *
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {isMultiDay && (
                <select
                  required
                  value={form.selectedDay}
                  onChange={(e) => set('selectedDay', e.target.value)}
                  className="text-[13px] outline-none border border-[#e5e7eb] rounded-[8px] px-3 py-2 bg-white text-[#374151] cursor-pointer"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>{formatDayLabel(d)}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setShowTimePicker(true)}
                className={`flex items-center gap-2 border rounded-[8px] px-3 py-2 text-[13px] cursor-pointer font-sans transition-colors hover:border-[#0d0d0d] bg-white ${form.startTime ? 'border-[#e5e7eb] text-[#374151]' : 'border-dashed border-[#d1d5db] text-[#9ca3af]'}`}
              >
                <span>🕐</span>
                <span className="font-semibold">
                  {form.startTime && form.endTime
                    ? `${form.startTime} → ${form.endTime}`
                    : t('eventForm.selectTime', 'Select time')}
                </span>
              </button>
              {formatDuration(form.startTime, form.endTime) && (
                <span className="text-[10px] font-semibold text-[#16a34a] bg-[#f0fdf4] rounded-[5px] px-2 py-[3px] whitespace-nowrap">
                  {formatDuration(form.startTime, form.endTime)}
                </span>
              )}
            </div>
          </div>

          {/* Location / Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                {t('sessionForm.locationTrack', 'Location / track')} *
              </span>
              <input
                required
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder={t('sessionForm.locationPlaceholder', 'e.g. Hall A')}
                className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                {t('eventForm.field.capacity')}
              </span>
              <input
                type="number"
                min={1}
                value={form.capacity ?? ''}
                onChange={(e) =>
                  set(
                    'capacity',
                    e.target.value === ''
                      ? null
                      : Number.parseInt(e.target.value, 10),
                  )
                }
                placeholder={t('sessionForm.capacityUnlimited', 'No limit')}
                className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
              />
            </label>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">
              {t('eventForm.field.tags')}
            </label>
            <TagPicker
              token={token}
              value={form.tags}
              onChange={(slugs) => setForm((prev) => ({ ...prev, tags: slugs }))}
            />
          </div>

          {error && (
            <p className="text-[12px] text-[#dc2626]">{error}</p>
          )}

          <div className="flex gap-2 justify-end mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] transition-colors border-0 cursor-pointer font-sans"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[#0d0d0d] text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-50 border-0 cursor-pointer font-sans"
            >
              {saving ? t('settings.saving') : t('common.save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>

    {showTimePicker && (
      <ClockTimePicker
        startTime={form.startTime}
        endTime={form.endTime}
        onChange={(start, end) => setForm(prev => ({ ...prev, startTime: start, endTime: end }))}
        onClose={() => setShowTimePicker(false)}
      />
    )}
    </>
  );
}

function PresenterPicker({
  name,
  uid,
  industryUsers,
  onChange,
}: {
  name: string;
  uid: string;
  industryUsers: CommunityUser[];
  onChange: (name: string, uid: string) => void;
}) {
  const t = useT();
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = name.trim()
    ? industryUsers.filter((u) =>
        u.displayName.toLowerCase().includes(name.toLowerCase()),
      )
    : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={name}
        onChange={(e) => { onChange(e.target.value, ''); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        placeholder={t('sessionForm.presenterPlaceholder')}
        className="w-full border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
      />
      {uid ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#059669] font-semibold">✓ {t('sessionForm.inSystem')}</span>
      ) : name.trim() ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#8e8e93] font-semibold">{t('sessionForm.guest')}</span>
      ) : null}
      {showDropdown && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e5e7eb] rounded-[8px] shadow-md z-10 max-h-[160px] overflow-y-auto">
          {filtered.slice(0, 6).map((u) => (
            <button
              key={u.uid}
              type="button"
              onClick={() => { onChange(u.displayName, u.uid); setShowDropdown(false); }}
              className="w-full text-left px-3 py-2 text-[12px] hover:bg-[#f3f4f6] border-0 bg-transparent cursor-pointer font-sans"
            >
              <span className="font-semibold">{u.displayName}</span>
              {u.bio && <span className="text-[#8e8e93] ml-2">{u.bio.slice(0, 40)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

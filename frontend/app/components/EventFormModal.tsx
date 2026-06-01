'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { EventItem } from './EventCard';
import TagPicker from './TagPicker';
import DateRangePicker from './DateRangePicker';
import ClockTimePicker from './ClockTimePicker';
import { useT } from '../lib/i18n';

export type EventFormValues = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  capacity: number;
  tags: string[];
};

type EventFormModalProps = {
  event: EventItem | null;
  token: string;
  onClose: () => void;
  onSave: (values: EventFormValues) => Promise<void>;
};

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

function formatDuration(startDate: string, startTime: string, endDate: string, endTime: string): string {
  if (!startDate || !startTime || !endDate || !endTime) return '';
  const diffMs = new Date(`${endDate}T${endTime}`).getTime() - new Date(`${startDate}T${startTime}`).getTime();
  if (diffMs <= 0) return '';
  const totalMin = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  return [days && `${days}d`, hours && `${hours}h`, mins && `${mins}min`].filter(Boolean).join(' ');
}

function fmtDateLabel(start: string, end: string): string {
  if (!start) return 'select-date';
  const fmt = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('sl-SI', { day: 'numeric', month: 'numeric', year: 'numeric' });
  if (!end || start === end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

function fmtTimeLabel(start: string, end: string): string {
  if (!start) return 'select-time';
  if (!end) return `${start} →`;
  return `${start} → ${end}`;
}

type EventFormInternal = {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  capacity: number;
  tags: string[];
};

const EMPTY: EventFormInternal = {
  title: '', description: '', startDate: '', startTime: '',
  endDate: '', endTime: '', location: '', capacity: 50, tags: [],
};

function eventToForm(event: EventItem): EventFormInternal {
  return {
    title: event.title,
    description: event.description,
    startDate: toDatePart(event.startAt),
    startTime: toTimePart(event.startAt),
    endDate: toDatePart(event.endAt),
    endTime: toTimePart(event.endAt),
    location: event.location,
    capacity: event.capacity,
    tags: event.tags ?? [],
  };
}

export default function EventFormModal({ event, token, onClose, onSave }: EventFormModalProps) {
  const t = useT();
  const [form, setForm] = useState<EventFormInternal>(() => event ? eventToForm(event) : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    firstInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      setError(t('eventForm.error.selectDateTime', 'Select date and time.'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        title: form.title,
        description: form.description,
        startAt: `${form.startDate}T${form.startTime}`,
        endAt: `${form.endDate}T${form.endTime}`,
        location: form.location,
        capacity: form.capacity,
        tags: form.tags,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('events.error.save', 'Save failed.'),
      );
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof EventFormInternal>(field: K, value: EventFormInternal[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const duration = formatDuration(form.startDate, form.startTime, form.endDate, form.endTime);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="bg-white rounded-[18px] w-full max-w-[500px] max-h-[90vh] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-form-title"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 id="event-form-title" className="text-[17px] font-bold">
              {event
                ? t('eventForm.title.edit', 'Edit event')
                : t('eventForm.title.create', 'Add event')}
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
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">{t('eventForm.field.title')} *</span>
              <input
                ref={firstInputRef}
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">{t('eventForm.field.description')} *</span>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors resize-none"
              />
            </label>

            {/* Date & time buttons */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">{t('eventForm.field.dateTime')} *</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className={`flex items-center gap-2 border rounded-[8px] px-3 py-2 text-[13px] cursor-pointer font-sans transition-colors hover:border-[#0d0d0d] bg-white ${form.startDate ? 'border-[#e5e7eb] text-[#374151]' : 'border-dashed border-[#d1d5db] text-[#9ca3af]'}`}
                >
                  <span>📅</span>
                  <span>{fmtDateLabel(form.startDate, form.endDate) === 'select-date' ? t('eventForm.selectDate', 'Select date') : fmtDateLabel(form.startDate, form.endDate)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTimePicker(true)}
                  className={`flex items-center gap-2 border rounded-[8px] px-3 py-2 text-[13px] cursor-pointer font-sans transition-colors hover:border-[#0d0d0d] bg-white ${form.startTime ? 'border-[#e5e7eb] text-[#374151]' : 'border-dashed border-[#d1d5db] text-[#9ca3af]'}`}
                >
                  <span>🕐</span>
                  <span className="font-semibold">{fmtTimeLabel(form.startTime, form.endTime) === 'select-time' ? t('eventForm.selectTime', 'Select time') : fmtTimeLabel(form.startTime, form.endTime)}</span>
                </button>
                {duration && (
                  <span className="text-[10px] font-semibold text-[#16a34a] bg-[#f0fdf4] rounded-[5px] px-2 py-[3px]">
                    {duration}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">{t('eventForm.field.location')} *</span>
                <input
                  required
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder={t('eventForm.placeholder.location', 'e.g. Ljubljana')}
                  className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">{t('eventForm.field.capacity')} *</span>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => set('capacity', e.target.value === '' ? 0 : Number.parseInt(e.target.value, 10))}
                  className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
                />
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">{t('eventForm.field.tags')}</label>
              <TagPicker
                token={token}
                value={form.tags}
                onChange={(slugs) => setForm((prev) => ({ ...prev, tags: slugs }))}
              />
            </div>

            {error && <p className="text-[12px] text-[#dc2626]">{error}</p>}

            <div className="flex gap-2 justify-end mt-1">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb] transition-colors border-0 cursor-pointer font-sans">
                {t('common.cancel', 'Cancel')}
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[#0d0d0d] text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-50 border-0 cursor-pointer font-sans">
                {saving ? t('settings.saving') : t('common.save', 'Save')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showDatePicker && (
        <DateRangePicker
          startDate={form.startDate}
          endDate={form.endDate}
          onChange={(start, end) => setForm(prev => ({ ...prev, startDate: start, endDate: end }))}
          onClose={() => setShowDatePicker(false)}
        />
      )}

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

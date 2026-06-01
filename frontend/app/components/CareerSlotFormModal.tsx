'use client';

import { useState, useEffect, useRef } from 'react';
import TagPicker from './TagPicker';
import ClockTimePicker from './ClockTimePicker';
import { useT } from '../lib/i18n';

export type CareerSlotFormValues = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  capacity: number;
  requirements: string[];
};

type CareerSlot = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  capacity: number;
  requirements?: string[];
};

type Props = {
  slot: CareerSlot | null;
  token: string;
  eventStartAt: string;
  eventEndAt: string;
  onClose: () => void;
  onSave: (values: CareerSlotFormValues) => Promise<void>;
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
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('sl-SI', {
    weekday: 'short', day: 'numeric', month: 'numeric',
  });
}

type FormInternal = {
  title: string;
  description: string;
  selectedDay: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  requirements: string[];
};

export default function CareerSlotFormModal({ slot, token, eventStartAt, eventEndAt, onClose, onSave }: Props) {
  const t = useT();
  const [form, setForm] = useState<FormInternal>(() =>
    slot
      ? {
          title: slot.title,
          description: slot.description,
          selectedDay: toDatePart(slot.startAt),
          startTime: toTimePart(slot.startAt),
          endTime: toTimePart(slot.endAt),
          location: slot.location,
          capacity: slot.capacity,
          requirements: slot.requirements ?? [],
        }
      : {
          title: '', description: '',
          selectedDay: toDatePart(eventStartAt),
          startTime: '', endTime: '',
          location: '', capacity: 1, requirements: [],
        },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function set<K extends keyof FormInternal>(key: K, value: FormInternal[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.startTime || !form.endTime) { setError(t('eventForm.selectTime', 'Select time')); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        title: form.title,
        description: form.description,
        startAt: `${form.selectedDay}T${form.startTime}`,
        endAt: `${form.selectedDay}T${form.endTime}`,
        location: form.location,
        capacity: form.capacity,
        requirements: form.requirements,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.error.save', 'Save failed.'));
    } finally {
      setSaving(false);
    }
  }

  const days = getEventDays(eventStartAt, eventEndAt);
  const isMultiDay = days.length > 1;
  const inputCls = 'w-full border border-[#e5e7eb] rounded-[10px] px-3 py-[8px] text-[13px] font-sans focus:outline-none focus:border-[#0d0d0d] transition-colors';

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4"
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        <div className="bg-white rounded-[20px] w-full max-w-[calc(100vw-2rem)] sm:max-w-[480px] p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[16px] font-bold">
              {slot
                ? t('careerForm.title.edit', 'Edit career interview')
                : t('careerForm.title.create', 'Add career interview')}
            </h3>
            <button type="button" onClick={onClose}
              className="text-[#8e8e93] hover:text-[#0d0d0d] text-[20px] leading-none bg-transparent border-0 cursor-pointer font-sans">
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-[10px] bg-[#fff1f2] px-3 py-2 text-[12px] text-[#dc2626]">{error}</div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">{t('eventForm.field.title')} *</label>
              <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)}
                  placeholder={t('careerForm.placeholder.title', 'e.g. 1:1 with company CTO')} required />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">{t('eventForm.field.description')} *</label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder={t('careerForm.placeholder.description', 'What are you looking for, what would you like to discuss?')} required />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">{t('sessionForm.time', 'Session time')} *</label>
              <div className="flex items-center gap-2 flex-wrap">
                {isMultiDay && (
                  <select required value={form.selectedDay} onChange={(e) => set('selectedDay', e.target.value)}
                    className="text-[13px] outline-none border border-[#e5e7eb] rounded-[8px] px-3 py-2 bg-white text-[#374151] cursor-pointer">
                    {days.map((d) => <option key={d} value={d}>{formatDayLabel(d)}</option>)}
                  </select>
                )}
                <button type="button" onClick={() => setShowTimePicker(true)}
                  className={`flex items-center gap-2 border rounded-[8px] px-3 py-2 text-[13px] cursor-pointer font-sans transition-colors hover:border-[#0d0d0d] bg-white ${form.startTime ? 'border-[#e5e7eb] text-[#374151]' : 'border-dashed border-[#d1d5db] text-[#9ca3af]'}`}>
                  <span>🕐</span>
                  <span className="font-semibold">
                    {form.startTime && form.endTime ? `${form.startTime} → ${form.endTime}` : t('eventForm.selectTime', 'Select time')}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">{t('eventForm.field.location')} *</label>
                <input className={inputCls} value={form.location} onChange={(e) => set('location', e.target.value)}
                  placeholder={t('careerForm.placeholder.location', 'e.g. Room 1')} required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">{t('careerForm.capacity', 'Number of slots')} *</label>
                <input type="number" min={1} className={inputCls} value={form.capacity}
                  onChange={(e) => set('capacity', parseInt(e.target.value, 10) || 1)} required />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#6e6e73] mb-2 uppercase tracking-[0.06em]">{t('careerForm.requirements', 'Requirements (tags)')}</label>
              <TagPicker token={token} value={form.requirements}
                onChange={(slugs) => setForm((prev) => ({ ...prev, requirements: slugs }))} />
            </div>

            <div className="flex gap-3 mt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-[10px] rounded-full border border-[#e5e7eb] text-[13px] font-semibold text-[#6b7280] hover:border-[#0d0d0d] hover:text-[#0d0d0d] transition-colors bg-transparent cursor-pointer font-sans">
                {t('common.cancel', 'Cancel')}
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-[10px] rounded-full bg-[#0d0d0d] text-white text-[13px] font-semibold hover:bg-[#1f1f1f] disabled:opacity-50 transition-colors border-0 cursor-pointer font-sans">
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
          onChange={(start, end) => setForm((prev) => ({ ...prev, startTime: start, endTime: end }))}
          onClose={() => setShowTimePicker(false)}
        />
      )}
    </>
  );
}

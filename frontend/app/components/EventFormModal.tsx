'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { EventItem } from './EventCard';

export type EventFormValues = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  capacity: number;
};

type EventFormModalProps = {
  event: EventItem | null;
  onClose: () => void;
  onSave: (values: EventFormValues) => Promise<void>;
};

const EMPTY: EventFormValues = {
  title: '',
  description: '',
  startAt: '',
  endAt: '',
  location: '',
  capacity: 50,
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function eventToForm(event: EventItem): EventFormValues {
  return {
    title: event.title,
    description: event.description,
    startAt: toDatetimeLocal(event.startAt),
    endAt: toDatetimeLocal(event.endAt),
    location: event.location,
    capacity: event.capacity,
  };
}

export default function EventFormModal({
  event,
  onClose,
  onSave,
}: EventFormModalProps) {
  const [form, setForm] = useState<EventFormValues>(() =>
    event ? eventToForm(event) : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => onClose(), [onClose]);

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
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Napaka pri shranjevanju.',
      );
    } finally {
      setSaving(false);
    }
  }

  function set(field: keyof EventFormValues, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
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
            {event ? 'Uredi konferenco' : 'Dodaj konferenco'}
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
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
              Naslov *
            </span>
            <input
              ref={firstInputRef}
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
              Opis *
            </span>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors resize-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Začetek *
              </span>
              <input
                required
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => set('startAt', e.target.value)}
                className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Konec *
              </span>
              <input
                required
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => set('endAt', e.target.value)}
                className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Lokacija *
              </span>
              <input
                required
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="npr. Ljubljana"
                className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Kapaciteta *
              </span>
              <input
                required
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) =>
                  set(
                    'capacity',
                    e.target.value === ''
                      ? 0
                      : Number.parseInt(e.target.value, 10),
                  )
                }
                className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
              />
            </label>
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
              Prekliči
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-[8px] text-[13px] font-semibold bg-[#0d0d0d] text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-50 border-0 cursor-pointer font-sans"
            >
              {saving ? 'Shranjujem...' : 'Shrani'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

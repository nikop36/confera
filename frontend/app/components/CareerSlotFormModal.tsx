'use client';

import { useState, useEffect, useRef } from 'react';
import TagPicker from './TagPicker';

export type CareerSlotFormValues = {
  title: string;
  description: string;
  scheduledAt: string;
  capacity: number;
  requirements: string[];
};

type CareerSlot = {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  capacity: number;
  requirements?: string[];
};

type Props = {
  slot: CareerSlot | null;
  token: string;
  onClose: () => void;
  onSave: (values: CareerSlotFormValues) => Promise<void>;
};

const EMPTY: CareerSlotFormValues = {
  title: '',
  description: '',
  scheduledAt: '',
  capacity: 1,
  requirements: [],
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CareerSlotFormModal({ slot, token, onClose, onSave }: Props) {
  const [form, setForm] = useState<CareerSlotFormValues>(
    slot
      ? {
          title: slot.title,
          description: slot.description,
          scheduledAt: toDatetimeLocal(slot.scheduledAt),
          capacity: slot.capacity,
          requirements: slot.requirements ?? [],
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function set<K extends keyof CareerSlotFormValues>(
    key: K,
    value: CareerSlotFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Napaka pri shranjevanju.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full border border-[#e5e7eb] rounded-[10px] px-3 py-[8px] text-[13px] font-sans focus:outline-none focus:border-[#0d0d0d] transition-colors';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-[20px] w-full max-w-[480px] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bold">
            {slot ? 'Uredi karierni razgovor' : 'Dodaj karierni razgovor'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8e8e93] hover:text-[#0d0d0d] text-[20px] leading-none bg-transparent border-0 cursor-pointer font-sans"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-[10px] bg-[#fff1f2] px-3 py-2 text-[12px] text-[#dc2626]">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">
              Naslov *
            </label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="npr. 1:1 s CTO podjetja Acme"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">
              Opis *
            </label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Kaj iščete, o čem se želite pogovoriti…"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">
              Datum in ura *
            </label>
            <input
              type="datetime-local"
              className={inputCls}
              value={form.scheduledAt}
              onChange={(e) => set('scheduledAt', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">
              Največ udeležencev *
            </label>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={form.capacity}
              onChange={(e) => set('capacity', parseInt(e.target.value, 10) || 1)}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6e6e73] mb-2 uppercase tracking-[0.06em]">
              Zahteve (oznake)
            </label>
            <TagPicker
              token={token}
              value={form.requirements}
              onChange={(slugs) => setForm((prev) => ({ ...prev, requirements: slugs }))}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-[10px] rounded-full border border-[#e5e7eb] text-[13px] font-semibold text-[#6b7280] hover:border-[#0d0d0d] hover:text-[#0d0d0d] transition-colors bg-transparent cursor-pointer font-sans"
            >
              Prekliči
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-[10px] rounded-full bg-[#0d0d0d] text-white text-[13px] font-semibold hover:bg-[#1f1f1f] disabled:opacity-50 transition-colors border-0 cursor-pointer font-sans"
            >
              {saving ? 'Shranjujem…' : 'Shrani'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

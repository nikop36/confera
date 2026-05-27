'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SessionItem, Speaker } from './SessionCard';
import SpeakerInput from './SpeakerInput';
import TagPicker from './TagPicker';

export type SessionFormValues = {
  title: string;
  description: string;
  speakers: Speaker[];
  startAt: string;
  endAt: string;
  location: string;
  capacity: number | null;
  tags: string[];
};

type SessionFormModalProps = {
  session: SessionItem | null;
  token: string;
  onClose: () => void;
  onSave: (values: SessionFormValues) => Promise<void>;
};

type CommunityUser = {
  uid: string;
  displayName: string;
  bio?: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const EMPTY: SessionFormValues = {
  title: '',
  description: '',
  speakers: [],
  startAt: '',
  endAt: '',
  location: '',
  capacity: null,
  tags: [],
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sessionToForm(session: SessionItem): SessionFormValues {
  return {
    title: session.title,
    description: session.description,
    speakers: session.speakers,
    startAt: toDatetimeLocal(session.startAt),
    endAt: toDatetimeLocal(session.endAt),
    location: session.location,
    capacity: session.capacity,
    tags: session.tags ?? [],
  };
}

export default function SessionFormModal({
  session,
  token,
  onClose,
  onSave,
}: SessionFormModalProps) {
  const [form, setForm] = useState<SessionFormValues>(() =>
    session ? sessionToForm(session) : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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

  function set<K extends keyof SessionFormValues>(
    field: K,
    value: SessionFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addSpeaker() {
    set('speakers', [...form.speakers, { name: '', bio: '' }]);
  }

  function updateSpeaker(index: number, updated: Speaker) {
    set(
      'speakers',
      form.speakers.map((s, i) => (i === index ? updated : s)),
    );
  }

  function removeSpeaker(index: number) {
    set(
      'speakers',
      form.speakers.filter((_, i) => i !== index),
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-[18px] w-full max-w-[520px] max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-form-title"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 id="session-form-title" className="text-[17px] font-bold">
            {session ? 'Uredi sejo' : 'Dodaj sejo'}
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

          {/* Description */}
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

          {/* Speakers */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
              Predavatelji
            </span>
            {form.speakers.map((speaker, index) => (
              <SpeakerInput
                key={index}
                value={speaker}
                onChange={(updated) => updateSpeaker(index, updated)}
                onRemove={() => removeSpeaker(index)}
                users={users}
              />
            ))}
            <button
              type="button"
              onClick={addSpeaker}
              className="text-[11px] font-semibold text-[#6b7280] hover:text-[#0d0d0d] border border-dashed border-[#d1d5db] rounded-[8px] py-[6px] bg-transparent cursor-pointer transition-colors font-sans"
            >
              + Dodaj predavatelja
            </button>
          </div>

          {/* Start / End */}
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

          {/* Location / Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Lokacija / sled *
              </span>
              <input
                required
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="npr. Dvorana A"
                className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Kapaciteta
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
                placeholder="Brez omejitve"
                className="border border-[#e5e7eb] rounded-[8px] px-3 py-2 text-[13px] outline-none focus:border-[#0d0d0d] transition-colors"
              />
            </label>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">
              Oznake
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

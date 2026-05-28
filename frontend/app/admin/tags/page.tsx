'use client';

import { useEffect, useState } from 'react';
import { useStoredUser } from '../../lib/auth';
import { tagColour } from '../../components/TagPicker';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Tag = { id: string; label: string; slug: string };

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function TagsAdminPage() {
  const user = useStoredUser();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.idToken) return;
    void loadTags(user.idToken);
  }, [user?.idToken]);

  async function loadTags(token: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load tags');
      const data = (await res.json()) as Tag[];
      setTags(data);
    } catch {
      setError('Could not load tags.');
    } finally {
      setLoading(false);
    }
  }

  function handleLabelChange(val: string) {
    setLabel(val);
    if (!slugTouched) setSlug(slugify(val));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.idToken || !label.trim() || !slug.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`${API}/tags`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label: label.trim(), slug: slug.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? 'Failed to create tag');
      }
      setLabel('');
      setSlug('');
      setSlugTouched(false);
      void loadTags(user.idToken);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error creating tag');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!user?.idToken) return;
    setDeletingId(id);
    try {
      await fetch(`${API}/tags/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      setTags((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const inputCls =
    'border border-[#e5e7eb] rounded-[10px] px-3 py-[8px] text-[13px] outline-none focus:border-[#0d0d0d] transition-colors font-sans';

  return (
    <div className="max-w-[600px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold">Tags</h1>
        <p className="text-[13px] text-[#8e8e93] mt-1">
          Shared tag pool used across events, sessions, and profiles.
        </p>
      </div>

      {/* Create form */}
      <form onSubmit={(e) => void handleCreate(e)} className="bg-white border border-[#e5e7eb] rounded-[16px] p-5 mb-6">
        <p className="text-[12px] font-bold text-[#6e6e73] uppercase tracking-[0.06em] mb-4">Add tag</p>
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">
              Label
            </label>
            <input
              className={`${inputCls} w-full`}
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g. Artificial Intelligence"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-[#6e6e73] mb-1 uppercase tracking-[0.06em]">
              Slug
            </label>
            <input
              className={`${inputCls} w-full font-mono`}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="e.g. artificial-intelligence"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
            />
          </div>
        </div>

        {slug && (
          <div className="mb-3">
            <span className="text-[11px] text-[#6e6e73]">Preview: </span>
            {(() => {
              const { bg, text } = tagColour(slug);
              return (
                <span
                  style={{ background: bg, color: text }}
                  className="text-[11px] font-semibold px-[8px] py-[2px] rounded-full"
                >
                  {label || slug}
                </span>
              );
            })()}
          </div>
        )}

        {saveError && (
          <p className="text-[12px] text-[#dc2626] mb-3">{saveError}</p>
        )}

        <button
          type="submit"
          disabled={saving || !label.trim() || !slug.trim()}
          className="px-5 py-[8px] bg-[#0d0d0d] text-white text-[13px] font-semibold rounded-full hover:bg-[#1f1f1f] disabled:opacity-50 transition-colors border-0 cursor-pointer font-sans"
        >
          {saving ? 'Adding…' : 'Add tag'}
        </button>
      </form>

      {/* Tag list */}
      <div className="bg-white border border-[#e5e7eb] rounded-[16px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0f0f0]">
          <p className="text-[12px] font-bold text-[#6e6e73] uppercase tracking-[0.06em]">
            All tags {!loading && `· ${tags.length}`}
          </p>
        </div>

        {error && (
          <div className="px-5 py-4 text-[13px] text-[#dc2626]">{error}</div>
        )}

        {loading ? (
          <div className="px-5 py-4 flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-[#f3f4f6] rounded-[8px] animate-pulse" />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#8e8e93]">
            No tags yet. Add one above.
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {tags.map((tag) => {
              const { bg, text } = tagColour(tag.slug);
              return (
                <div key={tag.id} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      style={{ background: bg, color: text }}
                      className="text-[11px] font-semibold px-[8px] py-[2px] rounded-full"
                    >
                      {tag.label}
                    </span>
                    <span className="text-[12px] text-[#8e8e93] font-mono">{tag.slug}</span>
                  </div>
                  <button
                    type="button"
                    disabled={deletingId === tag.id}
                    onClick={() => void handleDelete(tag.id)}
                    className="text-[11px] font-semibold text-[#dc2626] hover:text-[#b91c1c] disabled:opacity-50 bg-transparent border-0 cursor-pointer font-sans"
                  >
                    {deletingId === tag.id ? '…' : 'Delete'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../components/AppShell';
import TagPicker, { type Tag, TagPills } from '../components/TagPicker';
import { useStoredUser } from '../lib/auth';
import { useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const PAGE_SIZE = 5;

const GRADIENTS = [
  'linear-gradient(135deg, #7c6cf6, #c084fc)',
  'linear-gradient(135deg, #fb923c, #fbbf24)',
  'linear-gradient(135deg, #22d3ee, #6ee7b7)',
  'linear-gradient(135deg, #f472b6, #fb7185)',
];

// ─── types ────────────────────────────────────────────────────────────────────

type NewsEvent = {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  location?: string;
  capacity?: number;
  registeredCount?: number;
  tags?: string[];
  isRegistered: boolean;
  score?: number;
  archived?: boolean;
};

// ─── pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '…')[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };

  add(1);
  if (page > 3) pages.push('…');
  if (page > 2) add(page - 1);
  add(page);
  if (page < totalPages - 1) add(page + 1);
  if (page < totalPages - 2) pages.push('…');
  add(totalPages);

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        type="button"
        disabled={page === 1}
        onClick={onPrev}
        className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[13px] text-[#6b7280] hover:bg-[#f3f4f6] disabled:opacity-30 disabled:cursor-default bg-transparent border-0 cursor-pointer font-sans transition-colors"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-[12px] text-[#9ca3af]">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={[
              'w-8 h-8 flex items-center justify-center rounded-[8px] text-[12px] font-semibold border-0 cursor-pointer font-sans transition-colors',
              p === page ? 'bg-[#0d0d0d] text-white' : 'text-[#374151] hover:bg-[#f3f4f6] bg-transparent',
            ].join(' ')}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={onNext}
        className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[13px] text-[#6b7280] hover:bg-[#f3f4f6] disabled:opacity-30 disabled:cursor-default bg-transparent border-0 cursor-pointer font-sans transition-colors"
      >
        ›
      </button>
    </div>
  );
}

// ─── event card ───────────────────────────────────────────────────────────────

function NewsEventCard({
  event,
  index,
  tagMap,
  isRegistering,
  registerError,
  onRegister,
  onCancel,
  onClick,
}: {
  event: NewsEvent;
  index: number;
  tagMap: Map<string, string>;
  isRegistering: boolean;
  registerError?: string;
  onRegister: () => void;
  onCancel: () => void;
  onClick: () => void;
}) {
  const t = useT();
  const isFull = (event.registeredCount ?? 0) >= (event.capacity ?? Infinity);
  const tagPills = (event.tags ?? []).map((slug) => ({ slug, label: tagMap.get(slug) ?? slug }));

  return (
    <div
      className={`rounded-[18px] overflow-hidden bg-white cursor-pointer transition-shadow hover:shadow-sm ${
        event.isRegistered ? 'border-2 border-[#059669]' : 'border border-[#f0f0f0]'
      }`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {/* Gradient banner */}
      <div className="h-[96px] relative" style={{ background: GRADIENTS[index % GRADIENTS.length] }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 96" fill="none" preserveAspectRatio="xMidYMid slice">
          <circle cx="340" cy="8" r="80" fill="rgba(255,255,255,0.1)" />
          <circle cx="20" cy="88" r="55" fill="rgba(255,255,255,0.07)" />
        </svg>

        {/* Recommended badge */}
        {event.score !== undefined && (
          <div className="absolute top-[10px] left-[12px] flex items-center gap-1 bg-white/25 backdrop-blur-sm rounded-full px-2.5 py-1">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
            </svg>
            <span className="text-[10px] font-bold text-white">{t('events.recommended', 'Priporočeno')}</span>
          </div>
        )}

        {/* Registered badge */}
        {event.isRegistered && (
          <div className="absolute top-[10px] right-[12px] flex items-center gap-1 bg-white/25 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-[10px] font-bold text-white">✓ {t('eventDetail.registered', 'Prijavljeni')}</span>
          </div>
        )}

        {/* Date bottom-left */}
        <div className="absolute bottom-[10px] left-[14px] text-white">
          <p className="text-[11px] font-semibold opacity-85">
            {new Date(event.startAt).toLocaleDateString('sl-SI', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' · '}
            {new Date(event.startAt).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Capacity bottom-right */}
        {event.capacity != null && event.registeredCount != null && (
          <div className="absolute bottom-[10px] right-[12px] bg-white/20 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-white">
            {event.registeredCount}/{event.capacity}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="px-[14px] py-3">
        <p className="text-[14px] font-semibold mb-[3px]">{event.title}</p>
        {event.location && (
          <p className="text-[12px] text-[#8e8e93] flex items-center gap-1 mb-[5px]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {event.location}
          </p>
        )}
        {event.description && (
          <p className="text-[12px] text-[#b0b0b0] line-clamp-1 mb-[6px]">{event.description}</p>
        )}
        {tagPills.length > 0 && <TagPills tags={tagPills} />}

        {/* Register / Leave row — stops propagation so card click doesn't fire */}
        {registerError && (
          <p className="text-[11px] text-[#dc2626] mt-2">{registerError}</p>
        )}
        <div
          className="mt-3"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {event.isRegistered ? (
            <button
              type="button"
              disabled={isRegistering}
              onClick={onCancel}
              className="w-full py-[7px] rounded-[8px] text-[11px] font-semibold bg-[#fff1f2] text-[#dc2626] hover:bg-[#fee2e2] transition-colors disabled:opacity-50 border-0 cursor-pointer font-sans"
            >
              {isRegistering ? t('events.cancelling', 'Prekinjam...') : t('events.leave', 'Zapusti')}
            </button>
          ) : (
            <button
              type="button"
              disabled={isFull || isRegistering}
              onClick={onRegister}
              className="w-full py-[7px] rounded-[8px] text-[11px] font-semibold bg-[#0d0d0d] text-white hover:bg-[#1f1f1f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-0 cursor-pointer font-sans"
            >
              {isRegistering
                ? t('events.registering', 'Prijavljam...')
                : isFull
                  ? t('events.soldOut', 'Razprodano')
                  : t('events.register', 'Prijava')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-[18px] overflow-hidden animate-pulse border border-[#f0f0f0]">
          <div className="h-[96px] bg-[#f0f0f0]" />
          <div className="px-[14px] py-3">
            <div className="h-[14px] bg-[#f0f0f0] rounded w-2/3 mb-2" />
            <div className="h-[11px] bg-[#f0f0f0] rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function NewsPage() {
  const user = useStoredUser();
  const t = useT();
  const router = useRouter();

  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [onlyJoined, setOnlyJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registeringIds, setRegisteringIds] = useState<Record<string, boolean>>({});
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const tagMap = useMemo(() => new Map(tags.map((tg) => [tg.slug, tg.label])), [tags]);

  const loadEvents = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
    try {
      const [eventsRes, recsRes, tagsRes] = await Promise.allSettled([
        fetch(`${API}/events`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/events/recommendations/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/tags`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (eventsRes.status === 'rejected' || !eventsRes.value.ok) {
        throw new Error(t('events.error.load', 'Napaka pri nalaganju dogodkov'));
      }

      const json = await eventsRes.value.json();
      const rawEvents: NewsEvent[] = Array.isArray(json) ? json : (json.data ?? []);

      // Merge recommendation scores — optional, degrades gracefully
      const scoreMap = new Map<string, number>();
      if (recsRes.status === 'fulfilled' && recsRes.value.ok) {
        const recs = (await recsRes.value.json()) as { id: string; score: number }[];
        recs.forEach((r) => scoreMap.set(r.id, r.score));
      }

      if (tagsRes.status === 'fulfilled' && tagsRes.value.ok) {
        setTags((await tagsRes.value.json()) as Tag[]);
      }

      const merged = rawEvents.map((e) => ({ ...e, score: scoreMap.get(e.id) }));
      // Recommended first, then chronological
      merged.sort((a, b) => {
        if (a.score !== undefined && b.score !== undefined) return b.score - a.score;
        if (a.score !== undefined) return -1;
        if (b.score !== undefined) return 1;
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      });

      setEvents(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('events.error.generic', 'Prišlo je do napake'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!user?.idToken) return;
    void loadEvents(user.idToken);
  }, [user?.idToken, loadEvents]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [selectedTags, onlyJoined]);

  // ── register / cancel ──────────────────────────────────────────────────────

  async function handleRegister(eventId: string) {
    if (!user?.idToken) return;
    setRegisteringIds((prev) => ({ ...prev, [eventId]: true }));
    setRegisterErrors((prev) => ({ ...prev, [eventId]: '' }));
    try {
      const res = await fetch(`${API}/events/${eventId}/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? t('events.error.register'));
      }
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, isRegistered: true, registeredCount: (e.registeredCount ?? 0) + 1 }
            : e,
        ),
      );
    } catch (err) {
      setRegisterErrors((prev) => ({
        ...prev,
        [eventId]: err instanceof Error ? err.message : t('events.error.register'),
      }));
    } finally {
      setRegisteringIds((prev) => ({ ...prev, [eventId]: false }));
    }
  }

  async function handleCancel(eventId: string) {
    if (!user?.idToken) return;
    setRegisteringIds((prev) => ({ ...prev, [eventId]: true }));
    setRegisterErrors((prev) => ({ ...prev, [eventId]: '' }));
    try {
      const res = await fetch(`${API}/events/${eventId}/register`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(msg ?? t('events.error.cancel'));
      }
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, isRegistered: false, registeredCount: Math.max(0, (e.registeredCount ?? 1) - 1) }
            : e,
        ),
      );
    } catch (err) {
      setRegisterErrors((prev) => ({
        ...prev,
        [eventId]: err instanceof Error ? err.message : t('events.error.cancel'),
      }));
    } finally {
      setRegisteringIds((prev) => ({ ...prev, [eventId]: false }));
    }
  }

  // ── derived state ──────────────────────────────────────────────────────────

  // 1. Tag filter
  const tagFiltered = useMemo(
    () =>
      selectedTags.length === 0
        ? events
        : events.filter((e) => selectedTags.some((slug) => e.tags?.includes(slug))),
    [events, selectedTags],
  );

  // 2. Joined filter
  const filtered = useMemo(
    () => (onlyJoined ? tagFiltered.filter((e) => e.isRegistered) : tagFiltered),
    [tagFiltered, onlyJoined],
  );

  // 3. Client-side pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEvents = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-[22px] font-bold">{t('news.title', 'Novosti')}</h2>
        {!loading && (
          <p className="text-[13px] text-[#8e8e93] mt-1">
            {filtered.length} {t('events.count', 'dogodkov')}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-start gap-2">
        {/* Joined toggle */}
        <button
          type="button"
          onClick={() => setOnlyJoined((v) => !v)}
          className={[
            'flex items-center gap-[6px] px-3 py-[6px] rounded-full text-[12px] font-semibold border transition-colors cursor-pointer font-sans shrink-0',
            onlyJoined
              ? 'bg-[#ecfdf3] text-[#166534] border-[#a7f3d0]'
              : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#d1d5db]',
          ].join(' ')}
        >
          {onlyJoined ? '✓ ' : ''}{t('news.onlyJoined', 'Moji dogodki')}
        </button>

        {/* Tag picker */}
        {tags.length > 0 && (
          <div className="flex-1 min-w-0">
            <TagPicker
              token={user?.idToken ?? ''}
              value={selectedTags}
              onChange={setSelectedTags}
              tags={tags}
            />
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTags([])}
                className="mt-2 text-[11px] font-semibold px-[9px] py-[3px] rounded-full border border-transparent text-[#8e8e93] hover:text-[#0d0d0d] bg-transparent cursor-pointer font-sans"
              >
                {t('events.clearFilter', 'Počisti filter')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Page counter */}
      {!loading && filtered.length > PAGE_SIZE && (
        <p className="text-[11px] text-[#9ca3af] mb-3">
          {t('news.showing', 'Prikazano')} {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}{' '}
          {t('news.of', 'od')} {filtered.length}
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <SkeletonCards />
      ) : filtered.length === 0 ? (
        <div className="rounded-[14px] border border-[#f0f0f0] px-5 py-6 text-sm text-[#8e8e93]">
          {onlyJoined
            ? t('news.noneJoined', 'Niste prijavljeni na noben dogodek.')
            : selectedTags.length > 0
              ? t('events.noneForTags', 'Ni dogodkov z izbranimi oznakami.')
              : t('events.none', 'Ni razpoložljivih dogodkov.')}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {pageEvents.map((event, i) => (
              <NewsEventCard
                key={event.id}
                event={event}
                index={pageStart + i}
                tagMap={tagMap}
                isRegistering={Boolean(registeringIds[event.id])}
                registerError={registerErrors[event.id]}
                onRegister={() => void handleRegister(event.id)}
                onCancel={() => void handleCancel(event.id)}
                onClick={() => router.push(`/events/${event.id}`)}
              />
            ))}
          </div>

          <Pagination
            page={safePage}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            onPage={setPage}
          />
        </>
      )}
    </AppShell>
  );
}
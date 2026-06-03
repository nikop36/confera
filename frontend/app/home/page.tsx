'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../components/AppShell';
import TagPicker, { type Tag, TagPills } from '../components/TagPicker';
import { useStoredUser } from '../lib/auth';
import { useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type Event = {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  location?: string;
  capacity?: number;
  registeredCount?: number;
  tags?: string[];
  score?: number;
};

type RecommendedEvent = {
  id: string;
  score: number;
};

const GRADIENTS = [
  'linear-gradient(135deg, #7c6cf6, #c084fc)',
  'linear-gradient(135deg, #fb923c, #fbbf24)',
  'linear-gradient(135deg, #22d3ee, #6ee7b7)',
  'linear-gradient(135deg, #f472b6, #fb7185)',
];

export default function HomePage() {
  const user = useStoredUser();
  const t = useT();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tagMap = useMemo(
    () => new Map(tags.map((tg) => [tg.slug, tg.label])),
    [tags],
  );

  const filtered = useMemo(
    () =>
      selectedTags.length === 0
        ? events
        : events.filter((e) => selectedTags.some((s) => e.tags?.includes(s))),
    [events, selectedTags],
  );

  useEffect(() => {
    if (!user?.idToken) return;
    const token = user.idToken;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [eventsRes, recsRes, tagsRes] = await Promise.allSettled([
          fetch(`${API}/events`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/events/recommendations/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/tags`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (eventsRes.status === 'rejected' || !eventsRes.value.ok) {
          throw new Error(t('events.error.load', 'Failed to load events'));
        }

        const rawEvents = (await eventsRes.value.json()) as Event[];

        const scoreMap = new Map<string, number>();
        if (recsRes.status === 'fulfilled' && recsRes.value.ok) {
          const recs = (await recsRes.value.json()) as RecommendedEvent[];
          recs.forEach((r) => scoreMap.set(r.id, r.score));
        }

        if (tagsRes.status === 'fulfilled' && tagsRes.value.ok) {
          const data = (await tagsRes.value.json()) as Tag[];
          setTags(data);
        }

        const merged = rawEvents.map((e) => ({ ...e, score: scoreMap.get(e.id) }));
        merged.sort((a, b) => {
          if (a.score !== undefined && b.score !== undefined) return b.score - a.score;
          if (a.score !== undefined) return -1;
          if (b.score !== undefined) return 1;
          return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
        });

        setEvents(merged);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error.generic', 'An error occurred'));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user?.idToken, t]);

  return (
    <AppShell>
      <div className="mb-5">
        <h2 className="text-[22px] font-bold">{t('nav.news', 'Dogodki')}</h2>
        {!loading && (
          <p className="text-[13px] text-[#8e8e93] mt-1">
            {filtered.length} {t('events.total', 'events')}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {tags.length > 0 && (
        <div className="mb-4">
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

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[18px] overflow-hidden animate-pulse">
              <div className="h-[96px] bg-[#f0f0f0]" />
              <div className="px-[14px] py-3 border border-t-0 border-[#f0f0f0] rounded-b-[18px]">
                <div className="h-[14px] bg-[#f0f0f0] rounded w-2/3 mb-2" />
                <div className="h-[11px] bg-[#f0f0f0] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[14px] border border-[#f0f0f0] px-5 py-6 text-sm text-[#8e8e93]">
          {selectedTags.length > 0 ? t('events.noneForTags', 'Ni dogodkov z izbranimi oznakami.') : t('events.empty', 'No events yet.')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((event, i) => {
            const isRecommended = event.score !== undefined;
            const eventTagPills = (event.tags ?? []).map((slug) => ({
              slug,
              label: tagMap.get(slug) ?? slug,
            }));
            return (
              <div
                key={event.id}
                className={`rounded-[18px] overflow-hidden bg-white cursor-pointer transition-shadow hover:shadow-sm ${
                  isRecommended ? 'border-2 border-[#0071e3]' : 'border border-[#f0f0f0]'
                }`}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/events/${event.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/events/${event.id}`);
                  }
                }}
              >
                <div className="h-[96px] relative" style={{ background: GRADIENTS[i % 4] }}>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 96" fill="none" preserveAspectRatio="xMidYMid slice">
                    <circle cx="340" cy="8" r="80" fill="rgba(255,255,255,0.1)" />
                    <circle cx="20" cy="88" r="55" fill="rgba(255,255,255,0.07)" />
                  </svg>

                  {isRecommended && (
                    <div className="absolute top-[10px] left-[12px] flex items-center gap-1 bg-white/25 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
                      </svg>
                      <span className="text-[10px] font-bold text-white">Priporočeno</span>
                    </div>
                  )}

                  <div className="absolute bottom-[10px] left-[14px] text-white">
                    <p className="text-[11px] font-semibold opacity-85">
                      {new Date(event.startAt).toLocaleDateString('sl-SI', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      {new Date(event.startAt).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {event.capacity != null && event.registeredCount != null && (
                    <div className="absolute bottom-[10px] right-[12px] bg-white/20 rounded-lg px-2 py-0.5 text-[10px] font-semibold text-white">
                      {event.registeredCount}/{event.capacity}
                    </div>
                  )}
                </div>

                <div className="px-[14px] py-3">
                  <p className="text-[14px] font-semibold mb-[3px]">{event.title}</p>
                  {event.location && (
                    <p className="text-[12px] text-[#8e8e93] flex items-center gap-1 mb-[5px]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                      {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-[12px] text-[#b0b0b0] line-clamp-1 mb-[6px]">{event.description}</p>
                  )}
                  {eventTagPills.length > 0 && <TagPills tags={eventTagPills} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

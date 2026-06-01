'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '../components/AppShell';
import FilterBar, { type CommunityFilter } from '../components/FilterBar';
import PersonCard, { type CommunityUser } from '../components/PersonCard';
import { useStoredUser } from '../lib/auth';
import { useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const PAGE_SIZE = 12;

type MatchResult = {
  uid: string;
  displayName: string;
  affiliation?: string;
  score: number;
};

type ConnectionOverview = {
  pendingSent: Array<{ counterpart: { uid: string } }>;
  accepted: Array<{ counterpart: { uid: string } }>;
};

export default function CommunityPage() {
  const user = useStoredUser();
  const t = useT();
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');

  const [connectedUids, setConnectedUids] = useState<Set<string>>(new Set());
  const [pendingSentUids, setPendingSentUids] = useState<Set<string>>(new Set());
  const [connectingUids, setConnectingUids] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<CommunityFilter>('all');
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Load community users + matches in parallel
  useEffect(() => {
    if (!user?.idToken) return;
    const token = user.idToken;

    const selfUid = user.uid;

    async function load() {
      setLoadingUsers(true);
      setError('');
      try {
        const [usersRes, matchesRes] = await Promise.allSettled([
          fetch(`${API}/users/community`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API}/matches/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (usersRes.status === 'rejected' || !usersRes.value.ok) {
          throw new Error(
            t('community.error.load', 'Failed to load participants.'),
          );
        }

        const rawUsers = (await usersRes.value.json()) as CommunityUser[];

        // Matches are optional — degrade gracefully if unavailable
        const scoreMap = new Map<string, number>();
        if (matchesRes.status === 'fulfilled' && matchesRes.value.ok) {
          const matches = (await matchesRes.value.json()) as MatchResult[];
          for (const m of matches) {
            scoreMap.set(m.uid, m.score);
          }
        }

        // Annotate users with match score, exclude self
        const annotated: CommunityUser[] = rawUsers
          .filter((u) => u.uid !== selfUid)
          .map((u) => ({
            ...u,
            score: scoreMap.get(u.uid),
          }));

        // Sort: matched first (desc score), then alphabetical
        annotated.sort((a, b) => {
          if (a.score !== undefined && b.score !== undefined) {
            return b.score - a.score;
          }
          if (a.score !== undefined) return -1;
          if (b.score !== undefined) return 1;
          return a.displayName.localeCompare(b.displayName, 'sl-SI');
        });

        setUsers(annotated);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('community.error.generic', 'An error occurred.'),
        );
      } finally {
        setLoadingUsers(false);
      }
    }

    void load();
  }, [user?.idToken, user?.uid, t]);

  // Load connection state
  useEffect(() => {
    if (!user?.idToken) return;
    const token = user.idToken;

    async function loadConnections() {
      try {
        const res = await fetch(`${API}/connections/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as ConnectionOverview;
        setConnectedUids(
          new Set((data.accepted ?? []).map((c) => c.counterpart.uid)),
        );
        setPendingSentUids(
          new Set((data.pendingSent ?? []).map((c) => c.counterpart.uid)),
        );
      } catch {
        // non-fatal
      }
    }

    const refresh = () => void loadConnections();
    void loadConnections();
    window.addEventListener('connections:refresh', refresh);
    return () => window.removeEventListener('connections:refresh', refresh);
  }, [user?.idToken]);

  async function handleConnect(uid: string) {
    if (!user?.idToken) return;
    setConnectingUids((prev) => ({ ...prev, [uid]: true }));
    try {
      const res = await fetch(`${API}/connections/requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientUid: uid }),
      });
      if (!res.ok) return;
      setPendingSentUids((prev) => new Set([...prev, uid]));
      window.dispatchEvent(new Event('connections:refresh'));
    } finally {
      setConnectingUids((prev) => ({ ...prev, [uid]: false }));
    }
  }

  // Client-side filter + search
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('sl-SI');
    return users.filter((u) => {
      if (activeFilter === 'match' && u.score === undefined) return false;
      if (activeFilter === 'participant' && u.role !== 'participant') return false;
      if (activeFilter === 'industry' && u.role !== 'industry') return false;
      if (activeFilter === 'organizer' && u.role !== 'organizer') return false;
      if (q) {
        const name = u.displayName.toLocaleLowerCase('sl-SI');
        const affil = (u.affiliation ?? '').toLocaleLowerCase('sl-SI');
        if (!name.includes(q) && !affil.includes(q)) return false;
      }
      return true;
    });
  }, [users, activeFilter, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <AppShell>
      <div className="mb-5">
        <h2 className="text-[22px] font-bold">{t('community.title')}</h2>
        <p className="text-[13px] text-[#8e8e93] mt-1">
          {t('community.subtitle')}
          {!loadingUsers && ` · ${users.length} ${t('community.participants')}`}
        </p>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setVisibleCount(PAGE_SIZE);
        }}
        activeFilter={activeFilter}
        onFilterChange={(f) => {
          setActiveFilter(f);
          setVisibleCount(PAGE_SIZE);
        }}
      />

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {loadingUsers ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState search={search} activeFilter={activeFilter} />
      ) : (
        <>
          <p className="text-[12px] text-[#8e8e93] mb-3">
            {t('community.shown')} {visible.length} {t('community.of')} {filtered.length}
          </p>
          <div
            className="grid gap-[10px]"
            style={{
              gridTemplateColumns: 'repeat(3, 1fr)',
              alignItems: 'start',
            }}
          >
            {visible.map((person) => (
              <PersonCard
                key={person.uid}
                person={person}
                isExpanded={expandedUid === person.uid}
                onToggle={() =>
                  setExpandedUid((prev) =>
                    prev === person.uid ? null : person.uid,
                  )
                }
                isConnected={connectedUids.has(person.uid)}
                isPending={pendingSentUids.has(person.uid)}
                isConnecting={Boolean(connectingUids[person.uid])}
                onConnect={() => void handleConnect(person.uid)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="px-6 py-[9px] rounded-full border border-[#e5e7eb] bg-white text-[13px] font-semibold text-[#3d3d3d] hover:bg-[#f7f7f7] transition-colors font-sans"
              >
                {t('community.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function SkeletonGrid() {
  return (
    <div
      className="grid gap-[10px]"
      style={{ gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'start' }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#f0f0f0] rounded-[14px] p-[13px] animate-pulse"
        >
          <div className="flex items-center gap-[9px] mb-3">
            <div className="w-[38px] h-[38px] rounded-full bg-[#f0f0f0]" />
            <div className="flex-1">
              <div className="h-[12px] bg-[#f0f0f0] rounded mb-1.5 w-3/4" />
              <div className="h-[10px] bg-[#f0f0f0] rounded w-1/2" />
            </div>
          </div>
          <div className="h-[10px] bg-[#f0f0f0] rounded mb-1.5 w-full" />
          <div className="h-[10px] bg-[#f0f0f0] rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  search,
  activeFilter,
}: {
  search: string;
  activeFilter: CommunityFilter;
}) {
  const t = useT();
  if (activeFilter === 'match' && !search) {
    return (
      <div className="rounded-[14px] border border-[#f0f0f0] px-5 py-6 text-sm text-[#6e6e73]">
        <p className="font-semibold text-[#0d0d0d] mb-1">{t('community.noMatches')}</p>
        <p>
          {t('community.noMatchesDesc')}{' '}
          <Link href="/profile" className="text-[#0071e3] hover:underline">
            {t('community.completeProfile')} →
          </Link>
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-[14px] border border-[#f0f0f0] px-5 py-6 text-sm text-[#8e8e93]">
      {t('community.noResults')}
    </div>
  );
}

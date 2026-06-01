'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { clearStoredUser, useStoredUser } from '../lib/auth';
import { useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type NavItem = {
  key:
    | 'news'
    | 'profile'
    | 'meetings'
    | 'invites'
    | 'connections'
    | 'community'
    | 'events'
    | 'settings';
  href: string;
  badge?: number;
};

const NAV: NavItem[] = [
  { key: 'news', href: '/home' },
  { key: 'profile', href: '/profile' },
  { key: 'meetings', href: '/meetings' },
  { key: 'invites', href: '/invites' },
  { key: 'connections', href: '/connections' },
  { key: 'community', href: '/community' },
  { key: 'events', href: '/events' },
  { key: 'settings', href: '/settings' },
];

const SUGGESTIONS = [
  { name: 'Dr. Petra Kos', org: 'Univerza Ljubljana', hue: 200 },
  { name: 'Andrej Novak', org: 'Startup Slovenia', hue: 280 },
  { name: 'Nina Hauptman', org: 'Public Administration', hue: 155 },
];

type MatchSuggestion = {
  uid: string;
  displayName: string;
  affiliation?: string;
};

type ConnectionOverview = {
  pendingCount: number;
  pendingSent: Array<{
    counterpart: {
      uid: string;
    };
  }>;
  accepted: Array<{
    counterpart: {
      uid: string;
    };
  }>;
};

type InviteOverview = {
  pendingCount: number;
  processed?: Array<{
    invitationStatus?: 'pending' | 'accepted' | 'rejected';
  }>;
  interviewerPending?: Array<{
    invitationStatus?: 'pending' | 'accepted' | 'rejected';
  }>;
  interviewerProcessed?: Array<{
    invitationStatus?: 'pending' | 'accepted' | 'rejected';
  }>;
};

type ApiNotification = {
  id: string;
  message: string;
  read: boolean;
  createdAt:
    | string
    | {
        _seconds?: number;
        seconds?: number;
      };
};

type SidebarNotification = {
  id: string;
  text: string;
  time: string;
  unread: boolean;
};

const RECOMMENDATIONS = [
  { label: 'AI in robotika', bg: '#1d1d1f', fg: '#ffffff' },
  { label: 'Industrija', bg: '#ff6b6b', fg: '#ffffff' },
  { label: 'Javna uprava', bg: '#dbeafe', fg: '#1e40af' },
  { label: 'Sustainability', bg: '#7c3aed', fg: '#ffffff' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const user = useStoredUser();
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [meetingsBadgeCount, setMeetingsBadgeCount] = useState(0);
  const [connectingUids, setConnectingUids] = useState<Record<string, boolean>>({});
  const [connectedUids, setConnectedUids] = useState<Set<string>>(new Set());
  const [pendingSentUids, setPendingSentUids] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<SidebarNotification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const unreadNotificationsCount = notifications.filter(
    (item) => item.unread,
  ).length;

  const initials = user?.displayName
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '??';
  const suggestions = user?.idToken && matches.length
    ? matches
      .filter((match) => !connectedUids.has(match.uid))
      .slice(0, 3)
      .map((match, index) => ({
      uid: match.uid,
      name: match.displayName,
      org: match.affiliation || 'Confera',
      hue: [200, 280, 155][index] ?? 210,
    }))
    : SUGGESTIONS.map((entry) => ({ ...entry, uid: '' }));

  const loadMatches = useCallback(async (idToken: string) => {
    try {
      const response = await fetch(`${API}/matches/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!response.ok) {
        setMatches([]);
        return;
      }

      const data = (await response.json()) as MatchSuggestion[];
      setMatches(data);
    } catch {
      setMatches([]);
    }
  }, []);

  const loadConnections = useCallback(async (idToken: string) => {
    try {
      const response = await fetch(`${API}/connections/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) return;
      const data = (await response.json()) as ConnectionOverview;
      setPendingFriendRequests(data.pendingCount ?? 0);
      setConnectedUids(
        new Set((data.accepted ?? []).map((item) => item.counterpart.uid)),
      );
      setPendingSentUids(
        new Set((data.pendingSent ?? []).map((item) => item.counterpart.uid)),
      );
    } catch {
      // ignore sidebar badge refresh errors
    }
  }, []);

  const loadInvites = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API}/invites/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = (await response.json()) as InviteOverview;
      setPendingInvites(data.pendingCount ?? 0);
      const candidateAcceptedCount = (data.processed ?? []).filter(
        (item) => item.invitationStatus === 'accepted',
      ).length;
      const interviewerActiveCount = [
        ...(data.interviewerPending ?? []),
        ...(data.interviewerProcessed ?? []),
      ].filter((item) => item.invitationStatus !== 'rejected').length;
      setMeetingsBadgeCount(candidateAcceptedCount + interviewerActiveCount);
    } catch {
      // ignore sidebar badge refresh errors
    }
  }, []);

  const loadNotifications = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = (await response.json()) as ApiNotification[];
      const mapped = data.map((item) => ({
        id: item.id,
        text: item.message,
        time: formatRelativeTime(item.createdAt),
        unread: !item.read,
      }));
      setNotifications(mapped);
    } catch {
      // ignore notification refresh errors
    }
  }, []);

  useEffect(() => {
    if (!user?.idToken) return;
    const idToken = user.idToken;
    const initial = window.setTimeout(() => {
      void loadMatches(idToken);
    }, 0);
    return () => window.clearTimeout(initial);
  }, [user?.idToken, loadMatches]);

  useEffect(() => {
    if (!user?.idToken) return;
    const idToken = user.idToken;
    const refresh = () => void loadConnections(idToken);
    const initial = window.setTimeout(refresh, 0);
    window.addEventListener('connections:refresh', refresh);
    const interval = window.setInterval(refresh, 45_000);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener('connections:refresh', refresh);
      window.clearInterval(interval);
    };
  }, [user?.idToken, loadConnections]);

  useEffect(() => {
    if (!user?.idToken) return;
    const idToken = user.idToken;
    const refresh = () => void loadInvites(idToken);
    const initial = window.setTimeout(refresh, 0);
    window.addEventListener('invites:refresh', refresh);
    const interval = window.setInterval(refresh, 45_000);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener('invites:refresh', refresh);
      window.clearInterval(interval);
    };
  }, [user?.idToken, loadInvites]);

  useEffect(() => {
    if (!user?.idToken) return;
    const idToken = user.idToken;
    const initial = window.setTimeout(() => {
      void loadNotifications(idToken);
    }, 0);
    const interval = window.setInterval(
      () => void loadNotifications(idToken),
      30_000,
    );
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [user?.idToken, loadNotifications]);

  useEffect(() => {
    if (!isNotificationsOpen) {
      document.body.style.overflow = '';
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isNotificationsOpen]);

  function handleLogout() {
    clearStoredUser();
    setMatches([]);
    router.replace('/login');
  }

  async function handleConnect(targetUid: string) {
    if (!user?.idToken || !targetUid) return;
    setConnectingUids((prev) => ({ ...prev, [targetUid]: true }));
    try {
      const response = await fetch(`${API}/connections/requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientUid: targetUid }),
      });
      if (!response.ok) {
        return;
      }
      setPendingSentUids((prev) => new Set([...prev, targetUid]));
      window.dispatchEvent(new Event('connections:refresh'));
    } finally {
      setConnectingUids((prev) => ({ ...prev, [targetUid]: false }));
    }
  }

  async function handleNotificationClick(notificationId: string) {
    if (!user?.idToken) return;

    const target = notifications.find((item) => item.id === notificationId);
    if (!target || !target.unread) return;

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, unread: false } : item,
      ),
    );

    try {
      const response = await fetch(`${API}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });

      if (!response.ok) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notificationId ? { ...item, unread: true } : item,
          ),
        );
      }
    } catch {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, unread: true } : item,
        ),
      );
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] font-sans">
      <div className="max-w-[1536px] mx-auto flex min-h-screen px-5 gap-6">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-[220px] shrink-0 sticky top-0 h-screen flex flex-col pt-7 pb-5">

          {/* Avatar + user info */}
          <div className="mb-6">
            <div className="relative w-16 mb-3">
              <div
                className="absolute w-[46px] h-[46px] rounded-full bg-gradient-to-br from-[#a8edea] to-[#fed6e3] blur-sm opacity-85 z-0"
                style={{ top: -4, left: -6 }}
              />
              {user?.profileImageUrl ? (
                <div className="relative w-14 h-14 rounded-full z-10 border-[3px] border-white shadow-md overflow-hidden bg-[#f3f4f6]">
                  <Image
                    src={user.profileImageUrl}
                    alt={user.displayName ?? 'Profilna slika'}
                    className="w-full h-full object-cover"
                    fill
                    sizes="56px"
                  />
                </div>
              ) : (
                <div className="relative w-14 h-14 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-lg font-bold z-10 border-[3px] border-white shadow-md">
                  {initials}
                </div>
              )}
            </div>
            <p className="font-bold text-[15px] mb-0.5 leading-tight">{user?.displayName ?? t('shell.participant', 'Participant')}</p>
            <p className="text-xs text-[#8e8e93] truncate max-w-[200px]">{user?.email ?? '—'}</p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-0.5 flex-1">
            {NAV.map(({ key, href, badge }) => {
              const active = pathname === href;
              const dynamicBadge =
                key === 'connections'
                  ? pendingFriendRequests
                  : key === 'invites'
                    ? pendingInvites
                    : key === 'meetings'
                      ? meetingsBadgeCount
                      : badge;
              const label = t(`nav.${key}`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-[10px] px-[14px] py-[9px] rounded-xl no-underline text-sm transition-colors ${
                    active
                      ? 'bg-[#0d0d0d] text-white font-semibold'
                      : 'text-[#3d3d3d] font-normal hover:bg-[#f5f5f5]'
                  }`}
                >
                  <NavIcon itemKey={key} active={active} />
                  <span className="flex-1">{label}</span>
                  {typeof dynamicBadge === 'number' && dynamicBadge > 0 && (
                    <span
                      className={`min-w-5 h-5 px-[5px] rounded-[10px] text-[11px] font-bold flex items-center justify-center ${
                        active ? 'bg-white text-[#0d0d0d]' : 'bg-[#0d0d0d] text-white'
                      }`}
                    >
                      {dynamicBadge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Confera branding */}
          <div className="mt-4 p-[14px] rounded-2xl bg-gradient-to-br from-[#f0f9ff] to-[#fef3fb] relative overflow-hidden">
            <div className="absolute w-14 h-14 rounded-full bg-gradient-to-br from-[#a8edea] to-[#c2e9fb] -top-3 -right-3 opacity-50" />
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-[26px] h-[26px] rounded-lg bg-[#0d0d0d] flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
                </svg>
              </div>
              <span className="font-bold text-[13px]">Confera 2026</span>
            </div>
            <p className="text-[11px] text-[#6e6e73] leading-relaxed relative">{t('shell.brandTagline', 'Smart networking at conferences')}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex items-center justify-center rounded-xl border border-[#e5e5ea] bg-white px-4 py-2 text-sm font-semibold text-[#3d3d3d] transition-colors hover:bg-[#f5f5f5] font-sans"
          >
            {t('common.logout')}
          </button>
        </aside>

        {/* ── CENTER ── */}
        <main className="flex-1 min-w-0 py-7 pb-12">
          {children}
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="w-[280px] shrink-0 sticky top-0 h-screen pt-7 pb-5 overflow-y-auto flex flex-col gap-7">

          {/* Notifications */}
          <section>
            <div className="flex items-center justify-between mb-[14px]">
              <h3 className="text-lg font-bold">{t('shell.notifications')}</h3>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(true)}
                className="relative mr-2 w-9 h-9 rounded-full border border-[#e5e7eb] bg-white flex items-center justify-center hover:bg-[#f7f7f7]"
                aria-label={t('shell.showAllNotifications', 'Show all notifications')}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#111827"
                  strokeWidth="1.8"
                >
                  <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#111827] text-white text-[10px] font-bold leading-4">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {notifications.slice(0, 3).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleNotificationClick(n.id)}
                  className={`text-left flex gap-[10px] px-3 py-2.5 rounded-xl border-0 w-full ${n.unread ? 'bg-[#f0f7ff]' : 'bg-[#f8fafc]'} hover:bg-[#eef2f7]`}
                >
                  <div className={`w-[7px] h-[7px] rounded-full shrink-0 mt-[5px] ${n.unread ? 'bg-[#007AFF]' : 'bg-[#d1d1d6]'}`} />
                  <div>
                    <p className="text-[13px] leading-relaxed">{n.text}</p>
                    <p className="text-[11px] text-[#8e8e93] mt-0.5">{n.time}</p>
                  </div>
                </button>
              ))}
              {notifications.length === 0 && (
                <div className="px-3 py-2.5 text-[13px] text-[#8e8e93]">
                  {t('shell.noNotifications')}
                </div>
              )}
            </div>
          </section>

          {/* Suggestions */}
          <section>
            <div className="flex justify-between items-center mb-[14px]">
              <h3 className="text-lg font-bold">{t('shell.suggestions')}</h3>
              <button className="text-xs text-[#007AFF] bg-transparent border-0 cursor-pointer font-sans">{t('shell.seeAll')}</button>
            </div>
            <div className="flex flex-col gap-3">
              {suggestions.map((sug, i) => (
                <div key={i} className="flex items-center gap-[10px]">
                  <div
                    className="w-[38px] h-[38px] rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: `hsl(${sug.hue},60%,88%)`, color: `hsl(${sug.hue},55%,32%)` }}
                  >
                    {sug.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    {sug.uid ? (
                      <Link href={`/profile/${sug.uid}`} className="text-[13px] font-semibold truncate block no-underline text-[#0d0d0d] hover:underline">
                        {sug.name}
                      </Link>
                    ) : (
                      <p className="text-[13px] font-semibold truncate">{sug.name}</p>
                    )}
                    <p className="text-[11px] text-[#8e8e93] truncate">{sug.org}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleConnect(sug.uid)}
                    disabled={
                      !sug.uid ||
                      Boolean(connectingUids[sug.uid]) ||
                      pendingSentUids.has(sug.uid) ||
                      connectedUids.has(sug.uid)
                    }
                    className="px-[14px] py-[5px] rounded-full text-xs font-semibold bg-[#0d0d0d] text-white border-0 cursor-pointer shrink-0 font-sans disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {connectingUids[sug.uid]
                      ? t('shell.connecting', 'Sending...')
                      : pendingSentUids.has(sug.uid)
                        ? t('shell.sent', 'Sent')
                        : t('shell.connect', 'Connect')}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Recommendations */}
          <section>
            <h3 className="text-lg font-bold mb-[14px]">{t('shell.recommendations')}</h3>
            <div className="grid grid-cols-2 gap-[10px]">
              {RECOMMENDATIONS.map((r, i) => (
                <button
                  key={i}
                  className="p-4 rounded-2xl cursor-pointer border-0 text-left font-sans"
                  style={{ background: r.bg, color: r.fg }}
                >
                  <RecommIcon index={i} fg={r.fg} />
                  <p className="text-xs font-semibold mt-2 leading-tight">{r.label}</p>
                </button>
              ))}
            </div>
          </section>

        </aside>
      </div>
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label={t('common.close', 'Close')}
            className="absolute inset-0 bg-black/25"
            onClick={() => setIsNotificationsOpen(false)}
          />
          <div className="relative w-full max-w-[680px] max-h-[75vh] overflow-hidden rounded-2xl bg-white shadow-xl border border-[#e5e7eb] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold">{t('shell.allNotifications', 'All notifications')}</h3>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(false)}
                className="px-3 py-1.5 rounded-[8px] border border-[#e5e7eb] text-sm text-[#374151] hover:bg-[#f7f7f7]"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-2">
              {notifications.length === 0 && (
                <div className="px-3 py-2.5 text-[13px] text-[#8e8e93]">
                  {t('shell.noNotifications')}
                </div>
              )}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleNotificationClick(n.id)}
                  className={`text-left flex gap-[10px] px-3 py-2.5 rounded-xl border-0 w-full ${n.unread ? 'bg-[#f0f7ff]' : 'bg-[#f8fafc]'} hover:bg-[#eef2f7]`}
                >
                  <div className={`w-[7px] h-[7px] rounded-full shrink-0 mt-[5px] ${n.unread ? 'bg-[#007AFF]' : 'bg-[#d1d1d6]'}`} />
                  <div>
                    <p className="text-[13px] leading-relaxed">{n.text}</p>
                    <p className="text-[11px] text-[#8e8e93] mt-0.5">{n.time}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavIcon({
  itemKey,
  active,
}: {
  itemKey: NavItem['key'];
  active: boolean;
}) {
  const color = active ? '#fff' : '#6e6e73';
  const props = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '1.9' };
  switch (itemKey) {
    case 'news': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case 'profile': return <svg {...props}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>;
    case 'meetings': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case 'invites': return <svg {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
    case 'connections': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'community': return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>;
    case 'events': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" /></svg>;
    case 'settings': return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="4" /></svg>;
  }
}

function RecommIcon({ index, fg }: { index: number; fg: string }) {
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: fg, strokeWidth: '1.8' };
  switch (index) {
    case 0: return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>;
    case 1: return <svg {...props}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
    case 2: return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    case 3: return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="4" /></svg>;
  }
}

function formatRelativeTime(
  createdAt: ApiNotification['createdAt'],
): string {
  const createdAtDate = normalizeDate(createdAt);
  if (!createdAtDate) return '';

  const diffMs = Date.now() - createdAtDate.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMin < 1) return 'zdaj';
  if (diffMin < 60) return `${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d`;
}

function normalizeDate(createdAt: ApiNotification['createdAt']): Date | null {
  if (typeof createdAt === 'string') {
    const date = new Date(createdAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const seconds = createdAt._seconds ?? createdAt.seconds;
  if (typeof seconds === 'number') {
    return new Date(seconds * 1000);
  }

  return null;
}

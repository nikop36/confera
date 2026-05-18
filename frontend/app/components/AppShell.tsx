'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearStoredUser, useStoredUser } from '../lib/auth';

const NAV = [
  { label: 'Novice', href: '/home' },
  { label: 'Profil', href: '/profile' },
  { label: 'Srečanja', href: '/meetings', badge: 3 },
  { label: 'Povabila', href: '/invites', badge: 1 },
  { label: 'Prijatelji', href: '/connections' },
  { label: 'Skupnost', href: '/community' },
  { label: 'Nastavitve', href: '/settings' },
];

const SUGGESTIONS = [
  { name: 'Dr. Petra Kos', org: 'Univerza Ljubljana', hue: 200 },
  { name: 'Andrej Novak', org: 'Startup Slovenia', hue: 280 },
  { name: 'Nina Hauptman', org: 'Ministrstvo', hue: 155 },
];

const RECOMMENDATIONS = [
  { label: 'AI in robotika', bg: '#1d1d1f', fg: '#ffffff' },
  { label: 'Industrija', bg: '#ff6b6b', fg: '#ffffff' },
  { label: 'Javna uprava', bg: '#dbeafe', fg: '#1e40af' },
  { label: 'Vzdržnost', bg: '#7c3aed', fg: '#ffffff' },
];

const NOTIFICATIONS = [
  { text: 'Ana Kovač vas je povabila k srečanju', time: '2h', unread: true },
  { text: 'Vaša registracija je potrjena za Confera 2026', time: '1d', unread: false },
  { text: 'Novo srečanje dodano v vaš razpored', time: '2d', unread: false },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const user = useStoredUser();
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearStoredUser();
    router.push('/login');
  }

  const initials = user?.displayName
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '??';

  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] font-sans">
      <div className="max-w-[1280px] mx-auto flex min-h-screen px-5 gap-6">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-[220px] shrink-0 sticky top-0 h-screen flex flex-col pt-7 pb-5">

          {/* Avatar + user info */}
          <div className="mb-6">
            <div className="relative w-16 mb-3">
              <div
                className="absolute w-[46px] h-[46px] rounded-full bg-gradient-to-br from-[#a8edea] to-[#fed6e3] blur-sm opacity-85 z-0"
                style={{ top: -4, left: -6 }}
              />
              <div className="relative w-14 h-14 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-lg font-bold z-10 border-[3px] border-white shadow-md">
                {initials}
              </div>
            </div>
            <p className="font-bold text-[15px] mb-0.5 leading-tight">{user?.displayName ?? 'Udeleženec'}</p>
            <p className="text-xs text-[#8e8e93] truncate max-w-[200px]">{user?.email ?? '—'}</p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-0.5 flex-1">
            {NAV.map(({ label, href, badge }) => {
              const active = pathname === href;
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
                  <NavIcon label={label} active={active} />
                  <span className="flex-1">{label}</span>
                  {badge && badge > 0 && (
                    <span className={`min-w-5 h-5 px-[5px] rounded-[10px] text-[11px] font-bold flex items-center justify-center ${
                      active ? 'bg-white text-[#0d0d0d]' : 'bg-[#0d0d0d] text-white'
                    }`}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-[10px] px-[14px] py-[9px] rounded-xl text-sm text-[#d14242] font-normal hover:bg-[#fff5f5] w-full border-0 bg-transparent cursor-pointer font-sans mb-1"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Odjava</span>
          </button>

          {/* Confera branding */}
          <div className="mt-1 p-[14px] rounded-2xl bg-gradient-to-br from-[#f0f9ff] to-[#fef3fb] relative overflow-hidden">
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
            <p className="text-[11px] text-[#6e6e73] leading-relaxed relative">Pametno mreženje na konferencah</p>
          </div>
        </aside>

        {/* ── CENTER ── */}
        <main className="flex-1 min-w-0 py-7 pb-12">
          {children}
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="w-[280px] shrink-0 sticky top-0 h-screen pt-7 pb-5 overflow-y-auto flex flex-col gap-7">

          {/* Notifications */}
          <section>
            <h3 className="text-lg font-bold mb-[14px]">Obvestila</h3>
            <div className="flex flex-col gap-2">
              {NOTIFICATIONS.map((n, i) => (
                <div key={i} className={`flex gap-[10px] px-3 py-2.5 rounded-xl ${n.unread ? 'bg-[#f0f7ff]' : ''}`}>
                  <div className={`w-[7px] h-[7px] rounded-full shrink-0 mt-[5px] ${n.unread ? 'bg-[#007AFF]' : 'bg-[#d1d1d6]'}`} />
                  <div>
                    <p className="text-[13px] leading-relaxed">{n.text}</p>
                    <p className="text-[11px] text-[#8e8e93] mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Suggestions */}
          <section>
            <div className="flex justify-between items-center mb-[14px]">
              <h3 className="text-lg font-bold">Predlogi</h3>
              <button className="text-xs text-[#007AFF] bg-transparent border-0 cursor-pointer font-sans">Vse</button>
            </div>
            <div className="flex flex-col gap-3">
              {SUGGESTIONS.map((sug, i) => (
                <div key={i} className="flex items-center gap-[10px]">
                  <div
                    className="w-[38px] h-[38px] rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: `hsl(${sug.hue},60%,88%)`, color: `hsl(${sug.hue},55%,32%)` }}
                  >
                    {sug.name.split(' ').map(w => w[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{sug.name}</p>
                    <p className="text-[11px] text-[#8e8e93] truncate">{sug.org}</p>
                  </div>
                  <button className="px-[14px] py-[5px] rounded-full text-xs font-semibold bg-[#0d0d0d] text-white border-0 cursor-pointer shrink-0 font-sans">
                    Poveži
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Recommendations */}
          <section>
            <h3 className="text-lg font-bold mb-[14px]">Priporočila</h3>
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
    </div>
  );
}

function NavIcon({ label, active }: { label: string; active: boolean }) {
  const color = active ? '#fff' : '#6e6e73';
  const props = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '1.9' };
  switch (label) {
    case 'Novice': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case 'Profil': return <svg {...props}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>;
    case 'Srečanja': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case 'Povabila': return <svg {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
    case 'Prijatelji': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'Skupnost': return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>;
    case 'Nastavitve': return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
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

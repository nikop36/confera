// frontend/app/admin/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getStoredUser, useHydrated, useStoredUser } from '../lib/auth';
import { useT } from '../lib/i18n';

type AdminNavItem = {
  labelKey: string;
  labelFallback: string;
  href: string;
  icon: ReactNode;
  badge?: number;
  disabled?: boolean;
  children?: Array<{ labelKey: string; labelFallback: string; href: string }>;
};

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 13h20" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="7" rx="0.5" />
      <rect x="12" y="7" width="3" height="11" rx="0.5" />
      <rect x="17" y="9" width="3" height="9" rx="0.5" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

const ADMIN_NAV: AdminNavItem[] = [
  { labelKey: 'admin.nav.roleRequests', labelFallback: 'Role Requests', href: '/admin/role-requests', icon: <CheckIcon /> },
  { labelKey: 'admin.nav.tags', labelFallback: 'Tags', href: '/admin/tags', icon: <TagIcon /> },
  { labelKey: 'admin.nav.scheduling', labelFallback: 'Scheduling', href: '/admin/scheduling', icon: <CalendarIcon /> },
  { labelKey: 'admin.nav.meetings', labelFallback: 'Meetings', href: '/admin/meetings', icon: <ClipboardIcon /> },
  { labelKey: 'admin.nav.careerInterviews', labelFallback: 'Career Interviews', href: '/admin/career-interviews', icon: <BriefcaseIcon /> },
  {
    labelKey: 'admin.nav.statistics',
    labelFallback: 'Statistics',
    href: '/admin/statistics',
    icon: <BarChartIcon />,
    children: [
      { labelKey: 'admin.nav.stats.overview', labelFallback: 'Overview', href: '/admin/statistics' },
      { labelKey: 'admin.nav.stats.operations', labelFallback: 'Operations', href: '/admin/statistics/operations' },
      { labelKey: 'admin.nav.stats.usage', labelFallback: 'Usage', href: '/admin/statistics/usage' },
      { labelKey: 'admin.nav.stats.matching', labelFallback: 'Matching', href: '/admin/statistics/matching' },
      { labelKey: 'admin.nav.stats.engagement', labelFallback: 'Engagement', href: '/admin/statistics/engagement' },
      { labelKey: 'admin.nav.stats.reports', labelFallback: 'Reports', href: '/admin/statistics/reports' },
    ],
  },
  { labelKey: 'admin.nav.users', labelFallback: 'Users', href: '/admin/users', icon: <UsersIcon /> },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const t = useT();
  const hydrated = useHydrated();
  const user = useStoredUser();
  const currentUser = hydrated ? user ?? getStoredUser() : null;
  const router = useRouter();
  const pathname = usePathname();
  const [statsNavOpen, setStatsNavOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser?.idToken) {
      router.replace('/login');
      return;
    }
    if (currentUser.role !== 'admin') {
      router.replace('/home');
    }
  }, [currentUser?.idToken, currentUser?.role, hydrated, router]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#8e8e93]">{t('admin.access.checking', 'Checking access...')}</p>
      </div>
    );
  }

  const initials = currentUser.displayName
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '??';

  return (
    <div className="min-h-screen bg-white text-[#0d0d0d] font-sans flex">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 bg-[#f7f7f7] border-r border-[#e5e7eb] flex flex-col py-5 px-3 sticky top-0 h-screen">
        {/* Brand */}
        <div className="flex items-center gap-[10px] px-2 mb-6">
          <div className="w-[26px] h-[26px] bg-[#0d0d0d] rounded-[7px] flex items-center justify-center shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </svg>
          </div>
          <span className="font-bold text-[14px] text-[#0d0d0d]">Confera Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {ADMIN_NAV.map(({ labelKey, labelFallback, href, icon, badge, disabled, children }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const label = t(labelKey, labelFallback);
            if (disabled) {
              return (
                <div
                  key={href}
                  className="flex items-center gap-[10px] px-[11px] py-[9px] rounded-xl text-sm text-[#c0c0c0] cursor-not-allowed"
                >
                  {icon}
                  <span className="flex-1">{label}</span>
                  <span className="text-[10px] bg-[#e5e7eb] text-[#9ca3af] rounded-full px-2 py-0.5 font-semibold">{t('admin.nav.soon', 'soon')}</span>
                </div>
              );
            }
            if (!children?.length) {
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-[10px] px-[11px] py-[9px] rounded-xl text-sm no-underline transition-colors ${
                    active
                      ? 'bg-[#0d0d0d] text-white font-semibold'
                      : 'text-[#3d3d3d] font-normal hover:bg-[#ececec]'
                  }`}
                >
                  {icon}
                  <span className="flex-1">{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className={`min-w-5 h-5 px-[5px] rounded-[10px] text-[11px] font-bold flex items-center justify-center ${
                      active ? 'bg-white text-[#0d0d0d]' : 'bg-[#ef4444] text-white'
                    }`}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            }

            const showChildren = statsNavOpen || active;
            return (
              <div
                key={href}
                onMouseEnter={() => setStatsNavOpen(true)}
                onMouseLeave={() => setStatsNavOpen(false)}
              >
                <Link
                  href={href}
                  className={`flex items-center gap-[10px] px-[11px] py-[9px] rounded-xl text-sm no-underline transition-colors ${
                    active
                      ? 'bg-[#0d0d0d] text-white font-semibold'
                      : 'text-[#3d3d3d] font-normal hover:bg-[#ececec]'
                  }`}
                >
                  {icon}
                  <span className="flex-1">{label}</span>
                  <span className={`text-[10px] transition-transform ${showChildren ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </Link>
                {showChildren && (
                  <div className="mt-1 mb-1 ml-5 pl-2 border-l border-[#d7dbe0] space-y-1">
                    {children.map((child) => {
                      const childActive =
                        pathname === child.href || pathname.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block rounded-lg px-2 py-1.5 text-[12px] no-underline transition-colors ${
                            childActive
                              ? 'bg-[#111827] text-white font-medium'
                              : 'text-[#4b5563] hover:bg-[#ececec]'
                          }`}
                        >
                          {t(child.labelKey, child.labelFallback)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#e5e7eb] pt-4 flex flex-col gap-3">
          <Link
            href="/home"
            className="flex items-center gap-2 text-[12px] text-[#6e6e73] no-underline hover:text-[#0d0d0d] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t('common.backToApp', 'Back to app')}
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#0d0d0d] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#0d0d0d] truncate">{currentUser.displayName}</p>
                <p className="text-[11px] text-[#8e8e93] truncate">{currentUser.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 py-7 px-8">
        {children}
      </main>
    </div>
  );
}

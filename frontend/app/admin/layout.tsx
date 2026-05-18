// frontend/app/admin/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStoredUser } from '../lib/auth';

type AdminNavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
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

const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Role Requests', href: '/admin/role-requests', icon: <CheckIcon /> },
  { label: 'Users', href: '/admin/users', icon: <UsersIcon />, disabled: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useStoredUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user === null) {
      router.push('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/home');
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#8e8e93]">Preverjanje dostopa...</p>
      </div>
    );
  }

  const initials = user.displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
          {ADMIN_NAV.map(({ label, href, icon, badge, disabled }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            if (disabled) {
              return (
                <div
                  key={href}
                  className="flex items-center gap-[10px] px-[11px] py-[9px] rounded-xl text-sm text-[#c0c0c0] cursor-not-allowed"
                >
                  {icon}
                  <span className="flex-1">{label}</span>
                  <span className="text-[10px] bg-[#e5e7eb] text-[#9ca3af] rounded-full px-2 py-0.5 font-semibold">soon</span>
                </div>
              );
            }
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
            Back to app
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#0d0d0d] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#0d0d0d] truncate">{user.displayName}</p>
                <p className="text-[11px] text-[#8e8e93] truncate">{user.email}</p>
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

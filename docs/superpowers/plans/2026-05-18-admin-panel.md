# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated admin panel at `/admin` for reviewing and approving/rejecting role upgrade requests.

**Architecture:** A separate `layout.tsx` (AdminShell) wraps all `/admin` routes with an auth guard and a light sidebar. The only data page for now is `/admin/role-requests`, which calls the existing backend endpoints. Adding future admin sections requires only a new page file + one `ADMIN_NAV` entry.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Firebase auth via `useStoredUser()` (localStorage)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/app/admin/layout.tsx` | Create | AdminShell: auth guard, light sidebar, nav |
| `frontend/app/admin/page.tsx` | Create | Redirect `/admin` → `/admin/role-requests` |
| `frontend/app/admin/role-requests/page.tsx` | Create | Fetch, display, approve/reject role requests |

---

## Task 1: AdminShell layout

**Files:**
- Create: `frontend/app/admin/layout.tsx`

- [ ] **Step 1: Create the file with the AdminShell component**

```tsx
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
```

- [ ] **Step 2: Verify it compiles — start dev server if not running**

```bash
cd frontend && npm run dev
```

Navigate to `http://localhost:3001/admin` as a non-admin user. Expected: redirect to `/home`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/admin/layout.tsx
git commit -m "feat: add AdminShell layout with auth guard and light sidebar"
```

---

## Task 2: Admin index redirect

**Files:**
- Create: `frontend/app/admin/page.tsx`

- [ ] **Step 1: Create the redirect page**

```tsx
// frontend/app/admin/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/role-requests');
  }, [router]);

  return null;
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3001/admin` as an admin user. Expected: immediately redirected to `/admin/role-requests` (which will 404 until Task 3).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/admin/page.tsx
git commit -m "feat: redirect /admin to /admin/role-requests"
```

---

## Task 3: Role requests page

**Files:**
- Create: `frontend/app/admin/role-requests/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// frontend/app/admin/role-requests/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useStoredUser } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type RoleRequest = {
  id: string;
  uid: string;
  email: string;
  requestedRole: 'organizer' | 'industry';
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  organizer: { bg: '#f3e8ff', text: '#7c3aed' },
  industry:  { bg: '#dbeafe', text: '#1d4ed8' },
};

function daysAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function initials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#fef9c3', text: '#92400e' },
  { bg: '#ede9fe', text: '#6d28d9' },
];

function avatarColor(uid: string) {
  const idx = uid.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function RoleRequestsPage() {
  const user = useStoredUser();
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    const token = user?.idToken;
    if (!token) return;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/role-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = Array.isArray(data.message) ? data.message[0] : data.message;
          throw new Error(msg ?? 'Failed to load role requests');
        }
        const data = (await res.json()) as RoleRequest[];
        setRequests(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user]);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    if (!user?.idToken) return;
    setActing(id);
    try {
      const res = await fetch(`${API}/role-requests/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? `Failed to ${action} request`);
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActing(null);
    }
  }

  const pendingCount = requests.length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#0d0d0d] mb-1">Role Requests</h1>
        <p className="text-[13px] text-[#8e8e93]">
          Review and manage pending role upgrade requests from participants.
        </p>
      </div>

      {/* Stats strip */}
      <div className="flex gap-3 mb-6">
        <div className="rounded-[12px] bg-[#f7f7f7] px-5 py-4 min-w-[110px]">
          <div className="text-[22px] font-bold text-[#0d0d0d]">
            {loading ? '—' : pendingCount}
          </div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">Pending</div>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-[14px] bg-[#f7f7f7] px-5 py-4 text-sm text-[#8e8e93]">
          Loading requests...
        </div>
      )}

      {!loading && requests.length === 0 && !error && (
        <div className="rounded-[14px] border border-[#f0f0f0] px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-[#0d0d0d] mb-1">All caught up</p>
          <p className="text-[13px] text-[#8e8e93]">No pending role requests at the moment.</p>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="flex flex-col gap-3">
          {requests.map((req) => {
            const color = avatarColor(req.uid);
            const roleColor = ROLE_COLORS[req.requestedRole] ?? { bg: '#f3f4f6', text: '#374151' };
            const isActing = acting === req.id;

            return (
              <div
                key={req.id}
                className="border border-[#f0f0f0] rounded-[14px] px-5 py-4 flex items-start gap-4"
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                  style={{ background: color.bg, color: color.text }}
                >
                  {initials(req.email)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[14px] font-semibold text-[#0d0d0d]">{req.email}</span>
                    <span className="text-[12px] text-[#8e8e93]">participant →</span>
                    <span
                      className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: roleColor.bg, color: roleColor.text }}
                    >
                      {req.requestedRole}
                    </span>
                  </div>
                  {req.reason && (
                    <p className="text-[13px] text-[#4b5563] bg-[#f7f7f7] rounded-[8px] px-3 py-2 mt-2 italic">
                      "{req.reason}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[11px] text-[#8e8e93]">{daysAgo(req.createdAt)}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleAction(req.id, 'approve')}
                      className="px-4 py-[6px] rounded-[8px] bg-[#0d0d0d] text-white text-[12px] font-semibold border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                      {isActing ? '...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => handleAction(req.id, 'reject')}
                      className="px-4 py-[6px] rounded-[8px] bg-[#f0f0f0] text-[#6e6e73] text-[12px] font-semibold border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    >
                      {isActing ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser as admin user**

1. Navigate to `http://localhost:3001/admin/role-requests`
2. Expected: page loads, shows pending request count, lists requests with email, requested role badge, optional reason, approve/reject buttons
3. Click **Approve** on one request — expected: request disappears from list, pending count decrements
4. Click **Reject** on another — expected: same
5. When all approved/rejected: expected: "All caught up" empty state

- [ ] **Step 3: Verify non-admin redirect**

1. Log out or switch to a non-admin account
2. Navigate to `http://localhost:3001/admin/role-requests`
3. Expected: redirect to `/home`

- [ ] **Step 4: Commit**

```bash
git add frontend/app/admin/role-requests/page.tsx
git commit -m "feat: add role requests admin page with approve/reject"
```

---

## Adding future admin sections (reference)

To add a new admin section later (e.g., Users):

1. Create `frontend/app/admin/users/page.tsx`
2. In `frontend/app/admin/layout.tsx`, update `ADMIN_NAV`:
   ```ts
   { label: 'Users', href: '/admin/users', icon: <UsersIcon /> },
   // remove disabled: true
   ```

That's all. The `AdminShell` handles the rest.

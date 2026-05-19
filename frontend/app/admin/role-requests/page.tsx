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
                      &ldquo;{req.reason}&rdquo;
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

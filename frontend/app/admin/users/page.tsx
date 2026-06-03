'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStoredUser } from '../../lib/auth';
import { useT } from '../../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type AdminUser = {
  uid: string;
  displayName?: string;
  email?: string;
  role?: string;
  profileStatus?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastLoginAt?: unknown;
  lastActiveAt?: unknown;
  reportCount?: number;
  reports?: ProfileReport[];
};

const ROLE_ORDER = ['all', 'admin', 'organizer', 'industry', 'participant', 'guest'];
const REPORT_FILTERS = ['all', 'reported', 'mostReports'] as const;

type ReportFilter = (typeof REPORT_FILTERS)[number];
type ProfileReport = {
  id: string;
  reporterUid: string;
  reason: string;
  customReason?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export default function AdminUsersPage() {
  const t = useT();
  const user = useStoredUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [reportsTarget, setReportsTarget] = useState<AdminUser | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const token = user?.idToken;
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/users/admin`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(t('admin.users.errorLoad', 'Failed to load users.'));
      }
      setUsers((await response.json()) as AdminUser[]);
    } catch {
      setError(t('admin.users.errorLoad', 'Failed to load users.'));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadUsers();
  }, [loadUsers]);

  const roles = useMemo(() => {
    const existing = new Set(users.map((entry) => entry.role).filter(Boolean) as string[]);
    return ROLE_ORDER.filter((role) => role === 'all' || existing.has(role));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = users.filter((entry) => {
      if (roleFilter !== 'all' && entry.role !== roleFilter) return false;
      if (reportFilter === 'reported' && (entry.reportCount ?? 0) === 0) return false;
      if (!term) return true;
      const haystack =
        `${entry.displayName ?? ''} ${entry.email ?? ''} ${entry.uid}`.toLowerCase();
      return haystack.includes(term);
    });

    if (reportFilter === 'mostReports') {
      return [...filtered].sort((a, b) => (b.reportCount ?? 0) - (a.reportCount ?? 0));
    }

    return filtered;
  }, [query, reportFilter, roleFilter, users]);

  async function confirmDelete() {
    if (!user?.idToken || !deleteTarget) return;
    setDeletingUid(deleteTarget.uid);
    setError('');

    try {
      const response = await fetch(`${API}/users/${deleteTarget.uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
        const message = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(message ?? t('admin.users.errorDelete', 'Failed to delete user.'));
      }
      setUsers((prev) => prev.filter((entry) => entry.uid !== deleteTarget.uid));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.users.errorDelete', 'Failed to delete user.'));
    } finally {
      setDeletingUid(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[32px] font-bold tracking-tight">{t('admin.users.title', 'Users')}</h1>
        <p className="text-sm text-[#8e8e93] mt-1">
          {t('admin.users.subtitle', 'Review registered users, activity, and roles.')}
        </p>
      </div>

      <section className="rounded-[12px] border border-[#ececec] bg-white p-4 mb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#8e8e93]">
                {t('admin.users.roleFilter', 'Role')}
              </span>
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={`rounded-[8px] border px-3 py-1.5 text-sm transition-colors ${
                    roleFilter === role
                      ? 'border-[#111827] bg-[#111827] text-white'
                      : 'border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f9fafb]'
                  }`}
                >
                  {role === 'all' ? t('admin.filter.all', 'All') : roleLabel(role, t)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#8e8e93]">
                {t('admin.users.reportFilter', 'Reports')}
              </span>
              {REPORT_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setReportFilter(filter)}
                  className={`rounded-[8px] border px-3 py-1.5 text-sm transition-colors ${
                    reportFilter === filter
                      ? 'border-[#111827] bg-[#111827] text-white'
                      : 'border-[#d1d5db] bg-white text-[#374151] hover:bg-[#f9fafb]'
                  }`}
                >
                  {reportFilterLabel(filter, t)}
                </button>
              ))}
            </div>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.users.searchPlaceholder', 'Search users...')}
            className="min-h-[36px] w-full rounded-[8px] border border-[#d1d5db] px-3 py-1.5 text-sm outline-none focus:border-[#111827] lg:w-[320px]"
          />
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label={t('admin.users.total', 'Total users')}
          value={users.length}
          description={t('admin.users.totalDesc', 'All registered accounts.')}
        />
        <MetricCard
          label={t('admin.users.visible', 'Visible')}
          value={filteredUsers.length}
          description={t('admin.users.visibleDesc', 'Users matching the current filters.')}
        />
        <MetricCard
          label={t('admin.users.admins', 'Admins')}
          value={users.filter((entry) => entry.role === 'admin').length}
          description={t('admin.users.adminsDesc', 'Accounts with administrator access.')}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-[12px] border border-[#ececec] bg-white">
        <div className="grid grid-cols-[minmax(0,1.5fr)_130px_150px_110px_52px] gap-4 border-b border-[#f0f0f0] px-5 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[#8e8e93] max-lg:hidden">
          <span>{t('admin.users.person', 'Person')}</span>
          <span>{t('admin.users.role', 'Role')}</span>
          <span>{t('admin.users.lastActive', 'Last active')}</span>
          <span>{t('admin.users.reports', 'Reports')}</span>
          <span className="text-right">{t('common.delete', 'Delete')}</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-14 rounded-[10px] bg-[#f3f4f6] animate-pulse" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center">
            <h2 className="text-[16px] font-semibold">{t('admin.users.emptyTitle', 'No users found')}</h2>
            <p className="mt-1 text-sm text-[#8e8e93]">
              {t('admin.users.emptyDesc', 'Try changing the role filter or search text.')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {filteredUsers.map((entry) => {
              const isSelf = entry.uid === user?.uid;
              return (
                <div
                  key={entry.uid}
                  className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.5fr)_130px_150px_110px_52px] lg:items-center lg:gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={entry.displayName ?? entry.email ?? entry.uid} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">
                        {entry.displayName || t('admin.users.unnamed', 'Unnamed user')}
                      </p>
                      <p className="truncate text-xs text-[#8e8e93]">{entry.email ?? entry.uid}</p>
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs font-semibold text-[#374151]">
                      {roleLabel(entry.role ?? 'participant', t)}
                    </span>
                  </div>
                  <p className="text-sm text-[#4b5563]">
                    {formatLastActive(getActivityDate(entry), t)}
                  </p>
                  <div>
                    <button
                      type="button"
                      disabled={(entry.reportCount ?? 0) === 0}
                      onClick={() => setReportsTarget(entry)}
                      className={`inline-flex min-w-[42px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                        (entry.reportCount ?? 0) > 0
                          ? 'bg-[#fff1f2] text-[#dc2626] hover:bg-[#fee2e2]'
                          : 'bg-[#f3f4f6] text-[#9ca3af] cursor-default'
                      }`}
                    >
                      {entry.reportCount ?? 0}
                    </button>
                  </div>
                  <div className="flex justify-start lg:justify-end">
                    <button
                      type="button"
                      disabled={isSelf || deletingUid === entry.uid}
                      onClick={() => setDeleteTarget(entry)}
                      aria-label={t('admin.users.deleteUser', 'Delete user')}
                      title={isSelf ? t('admin.users.cannotDeleteSelf', 'You cannot delete yourself here') : t('admin.users.deleteUser', 'Delete user')}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#fecaca] bg-[#fff1f2] text-[#dc2626] transition-colors hover:bg-[#fee2e2] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <span className="text-[20px] leading-none">×</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[420px] rounded-[16px] bg-white p-5 shadow-xl">
            <h2 className="text-[18px] font-semibold">{t('admin.users.confirmDeleteTitle', 'Delete user profile?')}</h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              {t('admin.users.confirmDeleteDesc', 'This will remove the selected user profile and related application data. This action cannot be undone.')}
            </p>
            <div className="mt-4 rounded-[10px] bg-[#f9fafb] px-3 py-2">
              <p className="text-sm font-semibold">{deleteTarget.displayName || t('admin.users.unnamed', 'Unnamed user')}</p>
              <p className="text-xs text-[#8e8e93]">{deleteTarget.email ?? deleteTarget.uid}</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-[10px] border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]"
              >
                {t('common.no', 'No')}
              </button>
              <button
                type="button"
                disabled={deletingUid === deleteTarget.uid}
                onClick={() => void confirmDelete()}
                className="rounded-[10px] border border-[#dc2626] bg-[#dc2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-50"
              >
                {deletingUid === deleteTarget.uid
                  ? t('admin.action.deleting', 'Deleting...')
                  : t('common.yes', 'Yes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[520px] rounded-[16px] bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-semibold">
                  {t('admin.users.reportReasonsTitle', 'Profile reports')}
                </h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {(reportsTarget.displayName || t('admin.users.unnamed', 'Unnamed user'))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportsTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                aria-label={t('common.close', 'Close')}
              >
                ×
              </button>
            </div>
            <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {(reportsTarget.reports ?? []).map((report) => (
                <div key={report.id} className="rounded-[12px] border border-[#ececec] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#111827]">
                      {reportReasonLabel(report.reason, t)}
                    </p>
                    <p className="text-xs text-[#8e8e93]">
                      {formatReportDate(parseDate(report.updatedAt), t)}
                    </p>
                  </div>
                  {report.customReason && (
                    <p className="mt-2 text-sm leading-relaxed text-[#4b5563]">
                      {report.customReason}
                    </p>
                  )}
                  <p className="mt-2 truncate text-xs text-[#9ca3af]">
                    {t('admin.users.reportedBy', 'Reported by')}: {report.reporterUid}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#ececec] bg-white px-5 py-4">
      <p className="text-sm text-[#8e8e93]">{label}</p>
      <p className="mt-1 text-[26px] font-bold">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-[#9ca3af]">{description}</p>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-bold text-white">
      {initials}
    </div>
  );
}

function roleLabel(role: string, t: ReturnType<typeof useT>) {
  return t(`admin.role.${role}`, role);
}

function reportFilterLabel(filter: ReportFilter, t: ReturnType<typeof useT>) {
  if (filter === 'reported') return t('admin.users.reportedOnly', 'Reported only');
  if (filter === 'mostReports') return t('admin.users.mostReports', 'Most reports');
  return t('admin.filter.all', 'All');
}

function reportReasonLabel(reason: string, t: ReturnType<typeof useT>) {
  return t(`profilePublic.reportReason.${reason}`, reason);
}

function getActivityDate(entry: AdminUser) {
  return parseDate(entry.lastActiveAt) ?? parseDate(entry.lastLoginAt) ?? parseDate(entry.updatedAt) ?? parseDate(entry.createdAt);
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const seconds = record.seconds ?? record._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }
  return null;
}

function formatLastActive(date: Date | null, t: ReturnType<typeof useT>) {
  if (!date) return t('admin.users.neverActive', 'No activity yet');

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) return t('admin.users.activeNow', 'active now');
  if (minutes < 60) return t('admin.users.lastActiveMinutes', 'last active {{count}} min ago').replace('{{count}}', String(minutes));
  if (hours < 24) return t('admin.users.lastActiveHours', 'last active {{count}} h ago').replace('{{count}}', String(hours));
  if (days < 7) return t('admin.users.lastActiveDays', 'last active {{count}} days ago').replace('{{count}}', String(days));
  if (days < 30) return t('admin.users.lastActiveWeek', 'last active a week ago');
  if (days < 365) {
    return t('admin.users.lastActiveMonths', 'last active {{count}} months ago').replace('{{count}}', String(Math.max(1, months)));
  }
  return t('admin.users.lastActiveYears', 'last active {{count}} years ago').replace('{{count}}', String(Math.max(1, years)));
}

function formatReportDate(date: Date | null, t: ReturnType<typeof useT>) {
  if (!date) return t('admin.users.unknownDate', 'unknown date');
  return date.toLocaleDateString();
}

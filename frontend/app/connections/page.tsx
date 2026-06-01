'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '../components/AppShell';
import { useStoredUser } from '../lib/auth';
import { useT } from '../lib/i18n';

const ConnectionGraph = dynamic(
  () => import('../components/ConnectionGraph').then((m) => ({ default: m.ConnectionGraph })),
  { ssr: false },
);

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type ConnectionItem = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  counterpart: {
    uid: string;
    displayName: string;
    email: string;
    affiliation?: string;
  };
};

type ConnectionPayload = {
  pendingCount: number;
  pendingReceived: ConnectionItem[];
  pendingSent: ConnectionItem[];
  accepted: ConnectionItem[];
};

export default function ConnectionsPage() {
  const user = useStoredUser();
  const t = useT();
  const [data, setData] = useState<ConnectionPayload>({
    pendingCount: 0,
    pendingReceived: [],
    pendingSent: [],
    accepted: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'zahteve' | 'povezave' | 'graf'>('zahteve');
  const [connectedUids, setConnectedUids] = useState<Set<string>>(new Set());
  const [pendingSentUids, setPendingSentUids] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.idToken) return;
    const idToken = user.idToken;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${API}/connections/me`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const message = Array.isArray(body.message) ? body.message[0] : body.message;
          throw new Error(
            message ?? t('connections.error.load', 'Failed to load connections'),
          );
        }
        const payload = (await response.json()) as ConnectionPayload;
        setData(payload);
        setConnectedUids(new Set(payload.accepted.map((c) => c.counterpart.uid)));
        setPendingSentUids(new Set(payload.pendingSent.map((c) => c.counterpart.uid)));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('connections.error.load', 'Failed to load connections'),
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user?.idToken, t]);

  async function handleRequestAction(id: string, action: 'approve' | 'reject') {
    if (!user?.idToken) return;
    const idToken = user.idToken;
    setActingId(id);
    setError('');
    try {
      const response = await fetch(`${API}/connections/requests/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(
          message ??
            t('connections.error.requestAction', 'Failed to process request'),
        );
      }

      setData((prev) => {
        const request = prev.pendingReceived.find((item) => item.id === id);
        if (!request) return prev;

        const remaining = prev.pendingReceived.filter((item) => item.id !== id);
        const accepted =
          action === 'approve' ? [request, ...prev.accepted] : prev.accepted;

        return {
          ...prev,
          pendingCount: Math.max(0, prev.pendingCount - 1),
          pendingReceived: remaining,
          accepted,
        };
      });
      window.dispatchEvent(new Event('connections:refresh'));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('connections.error.action', 'Action failed'),
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleRemoveConnection(id: string) {
    if (!user?.idToken) return;
    const idToken = user.idToken;
    setActingId(id);
    setError('');
    try {
      const response = await fetch(`${API}/connections/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(
          message ??
            t('connections.error.remove', 'Failed to remove connection'),
        );
      }

      setData((prev) => ({
        ...prev,
        accepted: prev.accepted.filter((item) => item.id !== id),
      }));
      window.dispatchEvent(new Event('connections:refresh'));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('connections.error.action', 'Action failed'),
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleConnect(uid: string) {
    if (!user?.idToken) return;
    const res = await fetch(`${API}/connections/requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${user.idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipientUid: uid }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string | string[] };
      const msg = Array.isArray(body.message) ? body.message[0] : body.message;
      throw new Error(msg ?? 'Napaka pri pošiljanju zahteve.');
    }
    setPendingSentUids((prev) => new Set([...prev, uid]));
    window.dispatchEvent(new Event('connections:refresh'));
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">{t('connections.title')}</h2>
        <p className="text-[13px] text-[#8e8e93] mt-1">
          {t('connections.subtitle')}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {(
          [
            {
              key: 'zahteve' as const,
              label:
                data.pendingReceived.length > 0
                  ? `Zahteve (${data.pendingReceived.length})`
                  : 'Zahteve',
            },
            { key: 'povezave' as const, label: 'Povezave' },
            { key: 'graf' as const, label: 'Graf' },
          ]
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-[7px] rounded-full text-[13px] font-semibold transition-colors ${
              activeTab === key
                ? 'bg-[#0071e3] text-white'
                : 'bg-[#f0f0f0] text-[#3d3d3d] hover:bg-[#e5e5e5]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-[12px] bg-[#fff1f2] px-4 py-3 text-sm text-[#dc2626]">
          {error}
        </div>
      )}

      {activeTab === 'zahteve' && (
        <section className="mb-6">
          <h3 className="text-[16px] font-semibold mb-3">
            {t('connections.requests')} ({data.pendingReceived.length})
          </h3>
          {loading ? (
            <div className="rounded-[12px] bg-[#f7f7f7] px-4 py-3 text-sm text-[#8e8e93]">
              {t('connections.loadingRequests')}
            </div>
          ) : data.pendingReceived.length === 0 ? (
            <div className="rounded-[12px] border border-[#f0f0f0] px-4 py-4 text-sm text-[#8e8e93]">
              {t('connections.noneRequests')}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {data.pendingReceived.map((request) => (
                <div
                  key={request.id}
                  className="rounded-[12px] border border-[#f0f0f0] px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-[#f0f7ff] text-[#2563eb] text-xs font-bold flex items-center justify-center">
                    {request.counterpart.displayName
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${request.counterpart.uid}`} className="text-[14px] font-semibold text-[#0d0d0d] truncate block hover:underline no-underline">
                      {request.counterpart.displayName}
                    </Link>
                    <p className="text-[12px] text-[#8e8e93] truncate">
                      {request.counterpart.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actingId === request.id}
                      onClick={() => void handleRequestAction(request.id, 'approve')}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#d1fae5] bg-[#ecfdf3] text-[#166534] disabled:opacity-40"
                    >
                      {t('connections.approve')}
                    </button>
                    <button
                      type="button"
                      disabled={actingId === request.id}
                      onClick={() => void handleRequestAction(request.id, 'reject')}
                      className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-[#fecaca] bg-[#fff1f2] text-[#b91c1c] disabled:opacity-40"
                    >
                      {t('connections.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'povezave' && (
        <section>
          <h3 className="text-[16px] font-semibold mb-3">{t('connections.accepted')}</h3>
          {loading ? (
            <div className="rounded-[12px] bg-[#f7f7f7] px-4 py-3 text-sm text-[#8e8e93]">
              {t('connections.loadingAccepted')}
            </div>
          ) : data.accepted.length === 0 ? (
            <div className="rounded-[12px] border border-[#f0f0f0] px-4 py-4 text-sm text-[#8e8e93]">
              {t('connections.noneAccepted')}
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {data.accepted.map((connection) => (
                <div
                  key={connection.id}
                  className="rounded-[12px] border border-[#f0f0f0] px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${connection.counterpart.uid}`} className="text-[14px] font-semibold text-[#0d0d0d] truncate block hover:underline no-underline">
                        {connection.counterpart.displayName}
                      </Link>
                      <p className="text-[12px] text-[#8e8e93] truncate">
                        {connection.counterpart.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={actingId === connection.id}
                      onClick={() => void handleRemoveConnection(connection.id)}
                      className="px-2.5 py-1 rounded-[8px] text-[12px] font-semibold border border-[#fecaca] bg-[#fff1f2] text-[#b91c1c] disabled:opacity-40"
                    >
                      {t('connections.remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'graf' && (
        <ConnectionGraph
          idToken={user?.idToken}
          connectedUids={connectedUids}
          pendingUids={pendingSentUids}
          onConnectAction={handleConnect}
        />
      )}
    </AppShell>
  );
}

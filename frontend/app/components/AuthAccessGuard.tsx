'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  buildLoginPath,
  getSafeReferrerPath,
} from '../lib/auth-validation';
import {
  clearStoredUser,
  useHydrated,
  useStoredUser,
} from '../lib/auth';
import { useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const PUBLIC_PATHS = new Set(['/', '/login', '/register']);

type VerifiedSession = {
  token: string;
  pathname: string;
  role?: string;
};

export default function AuthAccessGuard({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useStoredUser();
  const t = useT();
  const [verifiedSession, setVerifiedSession] =
    useState<VerifiedSession | null>(null);
  const isPublic = PUBLIC_PATHS.has(pathname);
  const isAdminRoute = pathname.startsWith('/admin');
  const isVerifiedForRoute =
    verifiedSession?.token === user?.idToken &&
    verifiedSession?.pathname === pathname;
  const canRender =
    isPublic ||
    (hydrated &&
      Boolean(user?.idToken) &&
      isVerifiedForRoute &&
      (!isAdminRoute || verifiedSession.role === 'admin'));

  useEffect(() => {
    if (!hydrated || isPublic) return;

    if (!user?.idToken) {
      const requestedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      router.replace(buildLoginPath(requestedPath));
      return;
    }

    const token = user.idToken;
    const controller = new AbortController();

    async function verifySession() {
      try {
        const response = await fetch(`${API}/profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Session verification failed');
        }

        const profile = (await response.json()) as { role?: string };
        if (controller.signal.aborted) return;

        if (isAdminRoute && profile.role !== 'admin') {
          router.replace(getSafeReferrerPath(document.referrer) ?? '/home');
          return;
        }

        setVerifiedSession({
          token,
          pathname,
          role: profile.role,
        });
      } catch {
        if (controller.signal.aborted) return;

        setVerifiedSession(null);
        clearStoredUser();
        const requestedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        router.replace(buildLoginPath(requestedPath));
      }
    }

    void verifySession();
    return () => controller.abort();
  }, [
    hydrated,
    isAdminRoute,
    isPublic,
    pathname,
    router,
    user?.idToken,
  ]);

  if (canRender) return children;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-[#8e8e93]">{t('common.loading')}</p>
    </div>
  );
}

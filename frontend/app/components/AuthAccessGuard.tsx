'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  buildLoginPath,
  getSafeReferrerPath,
} from '../lib/auth-validation';
import { useHydrated, useStoredUser } from '../lib/auth';
import { useT } from '../lib/i18n';

const PUBLIC_PATHS = new Set(['/', '/login', '/register']);

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
  const isPublic = PUBLIC_PATHS.has(pathname);
  const isAdminRoute = pathname.startsWith('/admin');
  const canRender =
    isPublic ||
    (hydrated &&
      Boolean(user?.idToken) &&
      (!isAdminRoute || user?.role === 'admin'));

  useEffect(() => {
    if (!hydrated || isPublic) return;

    if (!user?.idToken) {
      const requestedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      router.replace(buildLoginPath(requestedPath));
      return;
    }

    if (isAdminRoute && user.role !== 'admin') {
      router.replace(getSafeReferrerPath(document.referrer) ?? '/home');
    }
  }, [
    hydrated,
    isAdminRoute,
    isPublic,
    router,
    user?.idToken,
    user?.role,
  ]);

  if (canRender) return children;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-sm text-[#8e8e93]">{t('common.loading')}</p>
    </div>
  );
}

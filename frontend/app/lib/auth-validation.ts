import type { StoredUser } from './auth';

const DISPLAY_NAME_PATTERN =
  /^[\p{L}\p{M}](?:[\p{L}\p{M}]|[ .'\u2019-](?=[\p{L}\p{M}])){0,78}[\p{L}\p{M}]$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeDisplayName(value: string): string {
  return value.normalize('NFKC').trim();
}

export function normalizeInviteToken(value: string): string {
  return value.trim();
}

export function isValidDisplayName(value: string): boolean {
  const normalized = normalizeDisplayName(value);
  return (
    normalized.length >= 2 &&
    normalized.length <= 80 &&
    DISPLAY_NAME_PATTERN.test(normalized)
  );
}

export function isValidRegistrationPassword(value: string): boolean {
  return (
    value.length >= 12 &&
    value.length <= 128 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9\s]/.test(value) &&
    !/[\s\u0000-\u001f\u007f]/.test(value)
  );
}

export function validateRegistrationInput(input: {
  displayName: string;
  email: string;
  password: string;
  inviteToken?: string;
}): 'displayName' | 'email' | 'password' | 'inviteToken' | null {
  if (!isValidDisplayName(input.displayName)) return 'displayName';
  if (
    input.email.length > 254 ||
    !EMAIL_PATTERN.test(normalizeEmail(input.email))
  ) {
    return 'email';
  }
  if (!isValidRegistrationPassword(input.password)) return 'password';
  if (
    input.inviteToken &&
    !/^[A-Za-z0-9_-]{1,128}$/.test(normalizeInviteToken(input.inviteToken))
  ) {
    return 'inviteToken';
  }
  return null;
}

export function getRegistrationErrorTranslationKey(
  message: string | undefined,
): string {
  const normalizedMessage = message?.toLowerCase() ?? '';

  if (normalizedMessage.includes('already registered')) {
    return 'auth.error.emailExists';
  }
  if (normalizedMessage.includes('invitation')) {
    return 'auth.error.invitePending';
  }
  if (normalizedMessage.includes('personal data')) {
    return 'auth.error.passwordPersonalData';
  }
  if (normalizedMessage.includes('display name')) {
    return 'auth.error.displayName';
  }
  if (normalizedMessage.includes('password')) {
    return 'auth.error.password';
  }
  if (normalizedMessage.includes('invite token')) {
    return 'auth.error.inviteToken';
  }
  if (normalizedMessage.includes('email')) {
    return 'auth.error.email';
  }

  return 'auth.error.registerFailed';
}

export function getSafeReturnPath(value: string | null): string | null {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, 'https://confera.local');
    if (parsed.origin !== 'https://confera.local') return null;
    if (parsed.pathname === '/login' || parsed.pathname === '/register') {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function getSafeReferrerPath(referrer: string): string | null {
  if (!referrer) return null;

  try {
    const parsed = new URL(referrer);
    if (parsed.origin !== window.location.origin) return null;
    return getSafeReturnPath(
      `${parsed.pathname}${parsed.search}${parsed.hash}`,
    );
  } catch {
    return null;
  }
}

export function buildLoginPath(returnTo: string): string {
  const safeReturnPath = getSafeReturnPath(returnTo);
  return safeReturnPath
    ? `/login?returnTo=${encodeURIComponent(safeReturnPath)}`
    : '/login';
}

export function canAccessPath(
  user: StoredUser | null,
  pathname: string,
): boolean {
  if (!user?.idToken) return false;
  return !pathname.startsWith('/admin') || user.role === 'admin';
}

export function resolvePostAuthDestination(
  user: StoredUser,
  requestedPath: string | null,
): string {
  const safeReturnPath = getSafeReturnPath(requestedPath);
  if (safeReturnPath && canAccessPath(user, safeReturnPath)) {
    return safeReturnPath;
  }
  return user.role === 'admin' ? '/admin' : '/home';
}

import { useMemo, useSyncExternalStore } from 'react';

export type StoredUser = {
  uid?: string;
  displayName: string;
  email: string;
  role?: string;
  idToken?: string;
  profileImageUrl?: string;
};

const STORAGE_KEY = 'confera_user';
const USER_UPDATED_EVENT = 'confera:user-updated';

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveStoredUser(user: StoredUser) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(USER_UPDATED_EVENT));
}

export function clearStoredUser() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(USER_UPDATED_EVENT));
}

function subscribeToStoredUser(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(USER_UPDATED_EVENT, callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(USER_UPDATED_EVENT, callback);
  };
}

function getStoredUserSnapshot() {
  return JSON.stringify(getStoredUser());
}

function getServerStoredUserSnapshot() {
  return 'null';
}

function subscribeNoop() {
  return () => {};
}

function getHydratedClientSnapshot() {
  return true;
}

function getHydratedServerSnapshot() {
  return false;
}

export function useStoredUser(): StoredUser | null {
  const snapshot = useSyncExternalStore(
    subscribeToStoredUser,
    getStoredUserSnapshot,
    getServerStoredUserSnapshot,
  );

  return useMemo(() => JSON.parse(snapshot) as StoredUser | null, [snapshot]);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    getHydratedClientSnapshot,
    getHydratedServerSnapshot,
  );
}

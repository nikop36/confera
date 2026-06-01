'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../components/AppShell';
import {
  clearStoredUser,
  saveStoredUser,
  useStoredUser,
} from '../lib/auth';
import { firebaseChangePassword } from '../lib/firebase';
import { getStoredLocale, saveStoredLocale, useT, type Locale } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type ProfileResponse = {
  language?: string;
  timezone?: string;
  displayName?: string;
  email?: string;
};

const LANGUAGE_OPTIONS = [
  { value: 'sl', labelKey: 'settings.language.sl', fallback: 'Slovenian' },
  { value: 'en', labelKey: 'settings.language.en', fallback: 'English' },
];

export default function SettingsPage() {
  const user = useStoredUser();
  const router = useRouter();
  const t = useT();

  const [language, setLanguage] = useState<Locale>(getStoredLocale());
  const [timezone, setTimezone] = useState('Europe/Ljubljana');
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState('');
  const [prefsError, setPrefsError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const timezoneOptions = useMemo(() => {
    const intlObject = globalThis.Intl as
      | (typeof globalThis.Intl & {
          supportedValuesOf?: (key: string) => string[];
        })
      | undefined;

    if (!intlObject || !intlObject.supportedValuesOf) {
      return [
        'Europe/Ljubljana',
        'UTC',
        'Europe/Berlin',
        'Europe/London',
        'America/New_York',
      ];
    }

    try {
      const supported = intlObject.supportedValuesOf('timeZone');
      if (!supported || supported.length === 0) {
        return ['Europe/Ljubljana', 'UTC'];
      }
      return supported;
    } catch {
      return ['Europe/Ljubljana', 'UTC'];
    }
  }, []);

  useEffect(() => {
    if (!user?.idToken) return;

    async function loadSettings(idToken: string) {
      setLoading(true);
      setPrefsError('');
      try {
        const res = await fetch(`${API}/profile/me`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!res.ok) {
          throw new Error(t('settings.error.load', 'Failed to load settings'));
        }

        const data = (await res.json()) as ProfileResponse;
        setLanguage(data.language === 'en' ? 'en' : 'sl');
        setTimezone(data.timezone || 'Europe/Ljubljana');
        if (data.language === 'en' || data.language === 'sl') {
          saveStoredLocale(data.language);
        }
      } catch (err) {
        setPrefsError(
          err instanceof Error
            ? err.message
            : t('settings.error.load', 'Failed to load settings'),
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSettings(user.idToken);
  }, [user?.idToken, t]);

  async function handleSavePreferences() {
    if (!user?.idToken) return;
    setSavingPrefs(true);
    setPrefsMessage('');
    setPrefsError('');

    try {
      const res = await fetch(`${API}/profile/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language, timezone }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const message = Array.isArray(payload.message)
          ? payload.message[0]
          : payload.message;
        throw new Error(
          message || t('settings.error.save', 'Failed to save settings'),
        );
      }

      saveStoredLocale(language === 'en' ? 'en' : 'sl');
      setPrefsMessage(t('settings.saved', 'Settings saved.'));
    } catch (err) {
      setPrefsError(
        err instanceof Error
          ? err.message
          : t('settings.error.save', 'Failed to save settings'),
      );
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleChangePassword() {
    if (!user?.idToken) return;
    setPasswordMessage('');
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError(
        t('settings.password.error.minLength', 'Password must be at least 8 characters.'),
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.password.error.mismatch', 'Passwords do not match.'));
      return;
    }

    setChangingPassword(true);
    try {
      const { idToken } = await firebaseChangePassword(user.idToken, newPassword);
      saveStoredUser({ ...user, idToken });
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage(t('settings.password.saved', 'Password changed successfully.'));
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : t('settings.password.error.save', 'Password change failed'),
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user?.idToken) return;
    setDeleteError('');

    if (deleteConfirm !== 'DELETE') {
      setDeleteError(t('settings.delete.error.confirm', 'Type DELETE to confirm.'));
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await fetch(`${API}/profile/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.idToken}` },
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const message = Array.isArray(payload.message)
          ? payload.message[0]
          : payload.message;
        throw new Error(
          message || t('settings.delete.error.failed', 'Account deletion failed'),
        );
      }

      clearStoredUser();
      router.replace('/login');
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.delete.error.failed', 'Account deletion failed'),
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  if (!user) {
    return (
          <AppShell>
        <div className="rounded-[12px] border border-[#f0f0f0] p-4 text-sm text-[#8e8e93]">
          {t('settings.loginRequired', 'Sign in to edit settings.')}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-[22px] font-bold">{t('settings.title')}</h2>
        <p className="text-[13px] text-[#8e8e93] mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      <section className="rounded-[12px] border border-[#f0f0f0] p-4 mb-4">
        <h3 className="text-[16px] font-semibold mb-4">{t('settings.languageTimezone')}</h3>
        {loading ? (
          <p className="text-sm text-[#8e8e93]">{t('common.loading', 'Loading...')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-[#6e6e73]">{t('settings.language')}</label>
              <select
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value === 'en' ? 'en' : 'sl')
                }
                className="mt-1 w-full rounded-[10px] border border-[#e7e7e7] bg-white px-3 py-2 text-sm"
              >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey, option.fallback)}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[12px] text-[#6e6e73]">{t('settings.timezone')}</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 w-full rounded-[10px] border border-[#e7e7e7] bg-white px-3 py-2 text-sm"
              >
                {timezoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {prefsError && (
          <p className="mt-3 text-sm text-[#dc2626]">{prefsError}</p>
        )}
        {prefsMessage && (
          <p className="mt-3 text-sm text-[#166534]">{prefsMessage}</p>
        )}

        <button
          type="button"
          onClick={handleSavePreferences}
          disabled={loading || savingPrefs}
          className="mt-4 rounded-[10px] bg-[#0d0d0d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {savingPrefs ? t('settings.saving') : t('settings.save')}
        </button>
      </section>

      <section className="rounded-[12px] border border-[#f0f0f0] p-4 mb-4">
        <h3 className="text-[16px] font-semibold mb-4">{t('settings.password.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-[#6e6e73]">{t('settings.password.new')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-[#e7e7e7] bg-white px-3 py-2 text-sm"
              placeholder={t('settings.password.placeholder.minLength', 'At least 8 characters')}
            />
          </div>
          <div>
            <label className="text-[12px] text-[#6e6e73]">{t('settings.password.confirm')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-[#e7e7e7] bg-white px-3 py-2 text-sm"
              placeholder={t('settings.password.placeholder.repeat', 'Repeat new password')}
            />
          </div>
        </div>

        {passwordError && (
          <p className="mt-3 text-sm text-[#dc2626]">{passwordError}</p>
        )}
        {passwordMessage && (
          <p className="mt-3 text-sm text-[#166534]">{passwordMessage}</p>
        )}

        <button
          type="button"
          onClick={handleChangePassword}
          disabled={changingPassword}
          className="mt-4 rounded-[10px] bg-[#0d0d0d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {changingPassword ? t('settings.password.saving') : t('settings.password.save')}
        </button>
      </section>

      <section className="rounded-[12px] border border-[#fee2e2] bg-[#fff5f5] p-4">
        <h3 className="text-[16px] font-semibold text-[#991b1b] mb-2">
          {t('settings.delete.title')}
        </h3>
        <p className="text-sm text-[#7f1d1d]">
          {t('settings.delete.description')} <span className="font-semibold">DELETE</span>.
        </p>
        <input
          type="text"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          className="mt-3 w-full max-w-[260px] rounded-[10px] border border-[#fecaca] bg-white px-3 py-2 text-sm"
          placeholder="DELETE"
        />
        {deleteError && <p className="mt-2 text-sm text-[#b91c1c]">{deleteError}</p>}
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
          className="mt-3 rounded-[10px] bg-[#b91c1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {deletingAccount ? t('settings.delete.running') : t('settings.delete.action')}
        </button>
      </section>
    </AppShell>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { saveStoredUser } from '../lib/auth';
import { saveStoredLocale, useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function field(key: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? t('auth.error.loginFailed', 'Sign in failed'));
      }

      const { idToken, uid } = await res.json() as { idToken: string; uid: string };

      let displayName = form.email.split('@')[0];
      let role = 'participant';
      let profileImageUrl = '';

      const profileRes = await fetch(`${API}/profile/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (profileRes.ok) {
        const profile = await profileRes.json() as {
          displayName?: string;
          role?: string;
          language?: string;
          roleProfile?: { profileImageUrl?: unknown };
        };
        displayName = profile.displayName ?? displayName;
        role = profile.role ?? role;
        if (profile.language === 'en' || profile.language === 'sl') {
          saveStoredLocale(profile.language);
        }
        profileImageUrl =
          typeof profile.roleProfile?.profileImageUrl === 'string'
            ? profile.roleProfile.profileImageUrl
            : '';
      }

      saveStoredUser({
        uid,
        idToken,
        displayName,
        email: form.email,
        role,
        profileImageUrl,
      });
      router.push(role === 'admin' ? '/admin' : '/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error.generic', 'An error occurred'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex bg-white font-sans">

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #f0f5fb 0%, #faf0fb 100%)' }}
      >
        {/* Subtle grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(127,168,200,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(127,168,200,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <Link href="/" className="relative flex items-center gap-2 no-underline">
          <div className="w-2 h-2 rounded-full bg-[#7fa8c8]" />
          <span className="font-bold text-[17px] text-[#0d0d0d] tracking-wide">Confera</span>
        </Link>

        <div className="relative">
          <p className="text-[11px] font-semibold text-[#7fa8c8] tracking-[0.18em] uppercase mb-4">{t('auth.login.submit')}</p>
          <h1 className="text-[2.4rem] font-bold leading-tight text-[#0d0d0d] mb-5">
            {t('auth.login.hero.line1', 'Continue')}<br />
            <span className="text-[#7fa8c8]">{t('auth.login.hero.line2', 'with your')}</span><br />
            {t('auth.login.hero.line3', 'profile.')}
          </h1>
          <p className="text-[14px] text-[#6e6e73] leading-relaxed max-w-[260px]">
            {t(
              'auth.login.hero.desc',
              'Access your profile, recommendations, and conference networking invites.',
            )}
          </p>

          {/* Network decoration */}
          <svg className="mt-10" width="260" height="90" viewBox="0 0 260 90" fill="none">
            <line x1="55" y1="45" x2="130" y2="18" stroke="rgba(127,168,200,0.2)" strokeWidth="1" />
            <line x1="55" y1="45" x2="130" y2="72" stroke="rgba(127,168,200,0.2)" strokeWidth="1" />
            <line x1="130" y1="18" x2="205" y2="33" stroke="rgba(127,168,200,0.2)" strokeWidth="1" />
            <line x1="130" y1="72" x2="205" y2="57" stroke="rgba(127,168,200,0.2)" strokeWidth="1" />
            <circle cx="55" cy="45" r="14" fill="rgba(127,168,200,0.06)" stroke="rgba(127,168,200,0.2)" strokeWidth="1" />
            <circle cx="55" cy="45" r="5" fill="rgba(127,168,200,0.25)" stroke="rgba(127,168,200,0.6)" strokeWidth="1" />
            <circle cx="130" cy="18" r="3.5" fill="rgba(127,168,200,0.15)" stroke="rgba(127,168,200,0.35)" strokeWidth="1" />
            <circle cx="130" cy="72" r="3.5" fill="rgba(127,168,200,0.15)" stroke="rgba(127,168,200,0.35)" strokeWidth="1" />
            <circle cx="205" cy="33" r="4.5" fill="rgba(196,168,125,0.2)" stroke="rgba(196,168,125,0.45)" strokeWidth="1" />
            <circle cx="205" cy="57" r="3" fill="rgba(127,168,200,0.12)" stroke="rgba(127,168,200,0.3)" strokeWidth="1" />
          </svg>
        </div>

        <p className="relative text-[12px] text-[#8e8e93]">Confera 2026</p>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 no-underline mb-8">
            <div className="w-2 h-2 rounded-full bg-[#7fa8c8]" />
            <span className="font-bold text-[17px] text-[#0d0d0d] tracking-wide">Confera</span>
          </Link>

          <div className="mb-8">
            <h2 className="text-[28px] font-bold text-[#0d0d0d] mb-1">{t('auth.login.title')}</h2>
            <p className="text-[14px] text-[#8e8e93]">
              {t('auth.login.noAccount')}{' '}
              <Link href="/register" className="text-[#7fa8c8] hover:underline">{t('auth.login.createAccount')}</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#6e6e73] mb-1.5">{t('auth.login.email')}</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={field('email')}
                placeholder="jana@primer.si"
                required
                className="profile-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#6e6e73] mb-1.5">{t('auth.login.password')}</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={field('password')}
                  placeholder={t('auth.login.passwordPlaceholder', 'Your password')}
                  required
                  className="profile-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8e8e93] hover:text-[#0d0d0d] transition-colors bg-transparent border-0 cursor-pointer"
                  aria-label={
                    showPw
                      ? t('auth.password.hide', 'Hide password')
                      : t('auth.password.show', 'Show password')
                  }
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-3 rounded-xl text-[13px]"
                style={{ background: 'rgba(209,66,66,0.06)', border: '1px solid rgba(209,66,66,0.15)', color: '#d14242' }}
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#0d0d0d] text-white text-[14px] font-semibold border-0 cursor-pointer font-sans mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.login.submitting') : t('auth.login.submit')}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a20.29 20.29 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.73 10.73 0 0 1 12 4c7 0 11 8 11 8a20.55 20.55 0 0 1-3.17 4.23" />
      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

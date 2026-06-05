'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { saveStoredUser, useHydrated } from '../lib/auth';
import {
  getRegistrationErrorTranslationKey,
  getSafeReturnPath,
  normalizeDisplayName,
  normalizeEmail,
  normalizeInviteToken,
  resolvePostAuthDestination,
  validateRegistrationInput,
} from '../lib/auth-validation';
import { firebaseSignIn } from '../lib/firebase';
import { saveStoredLocale, useT } from '../lib/i18n';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function passwordStrength(pw: string) {
  if (!pw) return null;
  const score = [
    pw.length >= 12 && pw.length <= 128,
    /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    /\d/.test(pw),
    /[^A-Za-z0-9\s]/.test(pw) && !/\s/.test(pw),
  ].filter(Boolean).length;
  const levels = [
    { key: 'auth.register.passwordStrength.weak', fallback: 'Weak', color: '#d14242' },
    { key: 'auth.register.passwordStrength.weak', fallback: 'Weak', color: '#d14242' },
    { key: 'auth.register.passwordStrength.medium', fallback: 'Medium', color: '#c4a87d' },
    { key: 'auth.register.passwordStrength.good', fallback: 'Good', color: '#7fa8c8' },
    { key: 'auth.register.passwordStrength.strong', fallback: 'Strong', color: '#16803c' },
  ];
  return { score, ...levels[score] };
}

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', inviteToken: '' });
  const [showPw, setShowPw] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hydrated = useHydrated();
  const returnTo = hydrated
    ? getSafeReturnPath(
        new URLSearchParams(window.location.search).get('returnTo'),
      )
    : null;

  const strength = passwordStrength(form.password);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const normalizedForm = {
        displayName: normalizeDisplayName(form.displayName),
        email: normalizeEmail(form.email),
        password: form.password,
        inviteToken: normalizeInviteToken(form.inviteToken),
      };
      const validationError = validateRegistrationInput(normalizedForm);
      if (validationError) {
        throw new Error(
          t(
            `auth.error.${validationError}`,
            'Please check the entered registration data.',
          ),
        );
      }

      const body: Record<string, string> = {
        displayName: normalizedForm.displayName,
        email: normalizedForm.email,
        password: normalizedForm.password,
      };
      if (normalizedForm.inviteToken) {
        body.inviteToken = normalizedForm.inviteToken;
      }

      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(
          t(
            getRegistrationErrorTranslationKey(
              typeof msg === 'string' ? msg : undefined,
            ),
            t('auth.error.registerFailed', 'Registration failed'),
          ),
        );
      }

      const data = await res.json().catch(() => ({}));
      const { idToken, uid } = await firebaseSignIn(
        normalizedForm.email,
        normalizedForm.password,
      );
      saveStoredLocale('sl');

      const storedUser = {
        displayName: normalizedForm.displayName,
        email: normalizedForm.email,
        uid: (data as { uid?: string }).uid ?? uid,
        idToken,
        role: (data as { role?: string }).role ?? 'participant',
      };
      saveStoredUser(storedUser);
      router.replace(resolvePostAuthDestination(storedUser, returnTo));
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
          <p className="text-[11px] font-semibold text-[#7fa8c8] tracking-[0.18em] uppercase mb-4">
            {t('auth.register.hero.badge', 'New registration')}
          </p>
          <h2 className="text-[2.4rem] font-bold leading-tight text-[#0d0d0d] mb-5">
            {t('auth.register.hero.line1', 'Smart')}<br />
            <span className="text-[#7fa8c8]">{t('auth.register.hero.line2', 'networking')}</span><br />
            {t('auth.register.hero.line3', 'starts here.')}
          </h2>
          <p className="text-[14px] text-[#6e6e73] leading-relaxed max-w-[260px]">
            {t(
              'auth.register.hero.desc',
              'Join focused networking between conference participants — academia, industry, and public sector.',
            )}
          </p>

          {/* Network decoration */}
          <svg className="mt-10" width="260" height="100" viewBox="0 0 260 100" fill="none">
            <line x1="55" y1="50" x2="130" y2="22" stroke="rgba(127,168,200,0.2)" strokeWidth="1" />
            <line x1="55" y1="50" x2="130" y2="78" stroke="rgba(127,168,200,0.2)" strokeWidth="1" />
            <line x1="130" y1="22" x2="205" y2="38" stroke="rgba(127,168,200,0.2)" strokeWidth="1" />
            <line x1="130" y1="78" x2="205" y2="62" stroke="rgba(127,168,200,0.2)" strokeWidth="1" />
            <line x1="130" y1="22" x2="130" y2="78" stroke="rgba(127,168,200,0.08)" strokeWidth="1" />
            <line x1="205" y1="38" x2="205" y2="62" stroke="rgba(127,168,200,0.08)" strokeWidth="1" />
            <circle cx="55" cy="50" r="16" fill="rgba(127,168,200,0.06)" stroke="rgba(127,168,200,0.18)" strokeWidth="1" />
            <circle cx="55" cy="50" r="6" fill="rgba(127,168,200,0.2)" stroke="rgba(127,168,200,0.55)" strokeWidth="1" />
            <circle cx="130" cy="22" r="4" fill="rgba(127,168,200,0.12)" stroke="rgba(127,168,200,0.3)" strokeWidth="1" />
            <circle cx="130" cy="78" r="4" fill="rgba(127,168,200,0.12)" stroke="rgba(127,168,200,0.3)" strokeWidth="1" />
            <circle cx="205" cy="38" r="5" fill="rgba(196,168,125,0.2)" stroke="rgba(196,168,125,0.45)" strokeWidth="1" />
            <circle cx="205" cy="62" r="3" fill="rgba(127,168,200,0.1)" stroke="rgba(127,168,200,0.25)" strokeWidth="1" />
          </svg>
        </div>

          <p className="relative text-[12px] text-[#8e8e93]">{t('auth.register.hero.footer', 'Confera 2026')}</p>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-start justify-center p-8 lg:p-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-[400px] py-4"
        >
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 no-underline mb-8">
            <div className="w-2 h-2 rounded-full bg-[#7fa8c8]" />
            <span className="font-bold text-[17px] text-[#0d0d0d] tracking-wide">Confera</span>
          </Link>

          <div className="mb-8">
            <h2 className="text-[28px] font-bold text-[#0d0d0d] mb-1">{t('auth.register.title')}</h2>
            <p className="text-[14px] text-[#8e8e93]">
              {t('auth.register.hasAccount')}{' '}
              <Link
                href={
                  returnTo
                    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
                    : '/login'
                }
                className="text-[#7fa8c8] hover:underline"
              >
                {t('auth.register.signIn')}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold text-[#6e6e73] mb-1.5">{t('auth.register.fullName')}</label>
              <input
                id="displayName"
                type="text"
                value={form.displayName}
                onChange={field('displayName')}
                placeholder="Jana Novak"
                autoComplete="name"
                maxLength={80}
                required
                className="profile-input"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#6e6e73] mb-1.5">{t('auth.register.email')}</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={field('email')}
                placeholder="jana@primer.si"
                autoComplete="email"
                maxLength={254}
                required
                className="profile-input"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#6e6e73] mb-1.5">{t('auth.register.password')}</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={field('password')}
                  placeholder={t('auth.register.passwordPlaceholder', 'Min. 12 characters')}
                  autoComplete="new-password"
                  maxLength={128}
                  required
                  className="profile-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8e8e93] hover:text-[#0d0d0d] transition-colors bg-transparent border-0 cursor-pointer"
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {strength && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="h-0.5 flex-1 rounded-full transition-all duration-300"
                        style={{ background: i <= strength.score ? strength.color : '#e5e7eb' }}
                      />
                    ))}
                  </div>
                  <span className="text-[12px]" style={{ color: strength.color }}>
                    {t(strength.key, strength.fallback)}
                  </span>
                </div>
              )}
              <p className="mt-1.5 text-[12px] text-[#8e8e93]">
                {t(
                  'auth.register.passwordHint',
                  'At least 12 characters, 1 uppercase letter, 1 number, 1 special character.',
                )}
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowInvite(v => !v)}
                className="flex items-center gap-1.5 text-[13px] text-[#8e8e93] hover:text-[#0d0d0d] bg-transparent border-0 cursor-pointer font-sans transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={showInvite ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
                </svg>
                {t('auth.register.inviteToggle', 'I have an invite code (optional)')}
              </button>
              {showInvite && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 overflow-hidden"
                >
                  <input
                    type="text"
                    value={form.inviteToken}
                    onChange={field('inviteToken')}
                    placeholder="INVITE-XXXX"
                    autoComplete="off"
                    maxLength={128}
                    className="profile-input font-mono"
                  />
                </motion.div>
              )}
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
              className="w-full py-3 rounded-full bg-[#0d0d0d] text-white text-[14px] font-semibold border-0 cursor-pointer font-sans mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {t('auth.register.submitting')}
                </>
              ) : (
                <>
                  {t('auth.register.submit')}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-[12px] text-center text-[#8e8e93]">
            {t('auth.register.terms.prefix', 'By registering, you agree to the')}{' '}
            <span className="text-[#7fa8c8] cursor-pointer hover:underline">{t('auth.register.terms.terms', 'terms of use')}</span>
            {' '}in{' '}
            <span className="text-[#7fa8c8] cursor-pointer hover:underline">{t('auth.register.terms.privacy', 'privacy policy')}</span>.
          </p>
        </motion.div>
      </div>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

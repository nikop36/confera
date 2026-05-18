'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { saveStoredUser } from '../lib/auth';
import { firebaseSignIn } from '../lib/firebase';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function passwordStrength(pw: string) {
  if (!pw) return null;
  const score = [pw.length >= 12, /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  const levels = [
    { label: 'Šibko', color: '#e05c5c' },
    { label: 'Šibko', color: '#e05c5c' },
    { label: 'Srednje', color: '#c4a87d' },
    { label: 'Dobro', color: '#7fa8c8' },
    { label: 'Močno', color: '#6fcf97' },
  ];
  return { score, ...levels[score] };
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', inviteToken: '' });
  const [showPw, setShowPw] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const body: Record<string, string> = {
        displayName: form.displayName,
        email: form.email,
        password: form.password,
      };
      if (form.inviteToken) body.inviteToken = form.inviteToken;

      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Registracija ni uspela');
      }

      const data = await res.json().catch(() => ({}));

      const { idToken, uid } = await firebaseSignIn(form.email, form.password);

      saveStoredUser({
        displayName: form.displayName,
        email: form.email,
        uid: (data as { uid?: string }).uid ?? uid,
        idToken,
        role: (data as { role?: string }).role ?? 'participant',
      });
      router.push('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prišlo je do napake');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex flex-col relative w-[45%] overflow-hidden">
        <div className="absolute inset-0 map-grid" />
        <div className="absolute inset-0 vignette" />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 30% 50%, rgba(127,168,200,0.07) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--border-accent)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
            </div>
            <span className="font-display text-lg tracking-wide" style={{ color: 'var(--text)' }}>Confera</span>
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            <div className="section-label mb-4">Nova registracija</div>
            <h2 className="font-display text-5xl font-light leading-tight mb-6" style={{ color: 'var(--text)' }}>
              Pametno<br />
              <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>mreženje</em><br />
              se začne tukaj.
            </h2>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Pridružite se sistemu za ciljno usmerjeno mreženje med udeleženci
              konference — akademija, industrija, javna uprava.
            </p>

            {/* Network node decoration */}
            <div className="mt-12">
              <svg width="280" height="100" viewBox="0 0 280 100" fill="none">
                <line x1="60" y1="50" x2="140" y2="22" stroke="rgba(127,168,200,0.15)" strokeWidth="1" />
                <line x1="60" y1="50" x2="140" y2="78" stroke="rgba(127,168,200,0.15)" strokeWidth="1" />
                <line x1="140" y1="22" x2="220" y2="38" stroke="rgba(127,168,200,0.15)" strokeWidth="1" />
                <line x1="140" y1="78" x2="220" y2="62" stroke="rgba(127,168,200,0.15)" strokeWidth="1" />
                <line x1="140" y1="22" x2="140" y2="78" stroke="rgba(127,168,200,0.07)" strokeWidth="1" />
                <line x1="220" y1="38" x2="220" y2="62" stroke="rgba(127,168,200,0.07)" strokeWidth="1" />
                <circle cx="60" cy="50" r="16" fill="rgba(127,168,200,0.04)" stroke="rgba(127,168,200,0.12)" strokeWidth="1" />
                <circle cx="60" cy="50" r="6" fill="rgba(127,168,200,0.18)" stroke="rgba(127,168,200,0.5)" strokeWidth="1" />
                <circle cx="140" cy="22" r="4" fill="rgba(127,168,200,0.12)" stroke="rgba(127,168,200,0.3)" strokeWidth="1" />
                <circle cx="140" cy="78" r="4" fill="rgba(127,168,200,0.12)" stroke="rgba(127,168,200,0.3)" strokeWidth="1" />
                <circle cx="220" cy="38" r="5" fill="rgba(196,168,125,0.18)" stroke="rgba(196,168,125,0.4)" strokeWidth="1" />
                <circle cx="220" cy="62" r="3" fill="rgba(127,168,200,0.1)" stroke="rgba(127,168,200,0.25)" strokeWidth="1" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="section-divider" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Konferenca 2026</span>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--border-accent)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
              </div>
              <span className="font-display text-lg" style={{ color: 'var(--text)' }}>Confera</span>
            </Link>
          </div>

          <div className="mb-8">
            <div className="section-label mb-3">Ustvari račun</div>
            <h1 className="font-display text-4xl font-light mb-2" style={{ color: 'var(--text)' }}>
              Dobrodošli
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Že imate račun?{' '}
              <Link href="/login" style={{ color: 'var(--accent)' }} className="hover:underline">
                Prijavite se
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Display name */}
            <FormField label="Polno ime">
              <input
                type="text"
                value={form.displayName}
                onChange={field('displayName')}
                placeholder="Jana Novak"
                required
                className="form-input"
              />
            </FormField>

            {/* Email */}
            <FormField label="E-pošta">
              <input
                type="email"
                value={form.email}
                onChange={field('email')}
                placeholder="jana@primer.si"
                required
                className="form-input"
              />
            </FormField>

            {/* Password */}
            <FormField label="Geslo">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={field('password')}
                  placeholder="Min. 12 znakov"
                  required
                  className="form-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-opacity hover:opacity-100 opacity-60"
                  style={{ color: 'var(--text-muted)' }}
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
                        style={{ background: i <= strength.score ? strength.color : 'var(--border)' }}
                      />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                Vsaj 12 znakov, 1 velika črka, 1 številka, 1 poseben znak.
              </p>
            </FormField>

            {/* Invite token */}
            <div>
              <button
                type="button"
                onClick={() => setShowInvite(v => !v)}
                className="flex items-center gap-2 text-xs transition-colors"
                style={{ color: showInvite ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={showInvite ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
                </svg>
                Imam povabilno kodo (neobvezno)
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
                    className="form-input font-mono"
                  />
                </motion.div>
              )}
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-3 rounded-lg text-sm"
                style={{
                  background: 'rgba(224,92,92,0.08)',
                  border: '1px solid rgba(224,92,92,0.2)',
                  color: '#e05c5c',
                }}
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Registracija...
                </>
              ) : (
                <>
                  Ustvari račun
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Z registracijo se strinjate s{' '}
            <span style={{ color: 'var(--accent)' }} className="cursor-pointer hover:underline">pogoji uporabe</span>
            {' '}in{' '}
            <span style={{ color: 'var(--accent)' }} className="cursor-pointer hover:underline">politiko zasebnosti</span>.
          </p>
        </motion.div>
      </div>
    </main>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs mb-1.5 tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
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

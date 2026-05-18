'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { saveStoredUser } from '../lib/auth';
import { firebaseSignIn } from '../lib/firebase';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
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
      const { idToken, uid } = await firebaseSignIn(form.email, form.password);

      let displayName = form.email.split('@')[0];
      let role = 'participant';

      const profileRes = await fetch(`${API}/profile/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (profileRes.ok) {
        const profile = await profileRes.json();
        displayName = profile.displayName ?? displayName;
        role = profile.role ?? role;
      }

      saveStoredUser({ uid, idToken, displayName, email: form.email, role });
      router.push('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prišlo je do napake');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <section className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden">
        <div className="absolute inset-0 map-grid" />
        <div className="absolute inset-0 vignette" />
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--border-accent)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
            </div>
            <span className="font-display text-lg tracking-wide" style={{ color: 'var(--text)' }}>Confera</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-sm">
          <div className="section-label mb-4">Prijava</div>
          <h1 className="font-display text-5xl font-light leading-tight mb-6" style={{ color: 'var(--text)' }}>
            Nadaljujte<br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>s svojim</em><br />
            profilom.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Dostopajte do profila, priporočil in povabil za mreženje na konferenci.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="section-divider" />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Confera 2026</span>
        </div>
      </section>

      <section className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-8">
            <div className="section-label mb-3">Dostop do računa</div>
            <h2 className="font-display text-4xl font-light mb-2" style={{ color: 'var(--text)' }}>
              Prijavite se
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Še nimate računa?{' '}
              <Link href="/register" style={{ color: 'var(--accent)' }} className="hover:underline">
                Ustvarite ga
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <FormField label="Geslo">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={field('password')}
                  placeholder="Vaše geslo"
                  required
                  className="form-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-opacity hover:opacity-100 opacity-60"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={showPw ? 'Skrij geslo' : 'Prikaži geslo'}
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </FormField>

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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Prijava...' : 'Prijava'}
            </button>
          </form>
        </motion.div>
      </section>
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

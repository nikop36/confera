'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import { saveStoredUser, useStoredUser } from '../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type MeetingType = 'online' | 'in-person' | 'both';

type UserProfile = {
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  bio?: string;
  affiliation?: string;
  interests?: string[];
  goals?: string[];
  meetingType?: MeetingType;
  competencies?: string[];
  researchKeywords?: string[];
};

type ProfileForm = {
  bio: string;
  affiliation: string;
  interests: string;
  goals: string;
  meetingType: MeetingType;
  competencies: string;
  researchKeywords: string;
};

const TABS = ['Srečanja', 'Dogodki', 'Povabila', 'Sledilci'];

const CARDS = [
  { title: 'AI v industriji', location: 'Dvorana A', desc: 'Panelna razprava o prihodnosti', from: '#7c6cf6', to: '#c084fc' },
  { title: 'Karierni razgovor', location: 'Sejna soba 3', desc: 'Srečanje z delodajalci', from: '#fb923c', to: '#fbbf24' },
  { title: 'Akademsko mreženje', location: 'Atrij', desc: 'Izmenjava izkušenj', from: '#22d3ee', to: '#6ee7b7' },
  { title: 'Industrijsko srečanje', location: 'Razstavni prostor', desc: 'Razstava rešitev', from: '#f472b6', to: '#fb7185' },
];

const DEFAULT_FORM: ProfileForm = {
  bio: '',
  affiliation: '',
  interests: '',
  goals: '',
  meetingType: 'both',
  competencies: '',
  researchKeywords: '',
};

const MEETING_TYPES: Array<{ value: MeetingType; label: string }> = [
  { value: 'both', label: 'Oboje' },
  { value: 'in-person', label: 'V živo' },
  { value: 'online', label: 'Spletno' },
];

function listToText(value?: string[]) {
  return value?.join(', ') ?? '';
}

function textToList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileToForm(profile?: UserProfile): ProfileForm {
  return {
    bio: profile?.bio ?? '',
    affiliation: profile?.affiliation ?? '',
    interests: listToText(profile?.interests),
    goals: listToText(profile?.goals),
    meetingType: profile?.meetingType ?? 'both',
    competencies: listToText(profile?.competencies),
    researchKeywords: listToText(profile?.researchKeywords),
  };
}

export default function ProfilePage() {
  const user = useStoredUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = user?.idToken;
  const displayName = profile?.displayName ?? user?.displayName ?? 'Udeleženec';
  const email = profile?.email ?? user?.email ?? '';
  const bio = profile?.bio || 'Udeleženec konference Confera 2026. Dopolnite profil za boljša priporočila srečanj in povežite se z udeleženci iz vaše branže.';

  useEffect(() => {
    if (!user?.idToken) return;

    const currentUser = user;

    async function loadProfile(idToken: string) {
      setLoading(true);
      setError('');

      try {
        const res = await fetch(`${API}/profile/me`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const msg = Array.isArray(data.message) ? data.message[0] : data.message;
          throw new Error(msg ?? 'Profila ni bilo mogoče naložiti');
        }

        const data = (await res.json()) as UserProfile;
        setProfile(data);
        setForm(profileToForm(data));
        saveStoredUser({
          ...currentUser,
          uid: data.uid ?? currentUser.uid,
          displayName: data.displayName ?? currentUser.displayName,
          email: data.email ?? currentUser.email,
          role: data.role ?? currentUser.role,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Prišlo je do napake');
      } finally {
        setLoading(false);
      }
    }

    void loadProfile(user.idToken);
  }, [user]);

  const initials = useMemo(
    () => displayName.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase(),
    [displayName],
  );

  function field(key: keyof ProfileForm) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
      setSuccess('');
    };
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError('Prijavna seja nima veljavnega žetona. Ponovno se prijavite.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      bio: form.bio.trim() || undefined,
      affiliation: form.affiliation.trim() || undefined,
      interests: textToList(form.interests),
      goals: textToList(form.goals),
      meetingType: form.meetingType,
      competencies: textToList(form.competencies),
      researchKeywords: textToList(form.researchKeywords),
    };

    try {
      const res = await fetch(`${API}/profile/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Shranjevanje profila ni uspelo');
      }

      setProfile((prev) => ({
        ...prev,
        ...payload,
        displayName,
        email,
      }));
      setSuccess('Profil je shranjen.');
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prišlo je do napake');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      {/* Cover */}
      <div className="rounded-2xl rounded-b-none overflow-hidden h-[164px] relative">
        <div className="absolute inset-0 bg-[#a8d8f0]" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 164" preserveAspectRatio="none" fill="none">
          <path d="M-60 220 Q80 80 260 120 T660 90" stroke="#ffd166" strokeWidth="38" fill="none" />
          <path d="M-60 220 Q80 80 260 120 T660 90" stroke="#1d1d1f" strokeWidth="1.5" fill="none" opacity="0.25" />
          <path d="M-60 245 Q100 95 280 135 T660 108" stroke="#ef476f" strokeWidth="32" fill="none" />
          <path d="M-60 245 Q100 95 280 135 T660 108" stroke="#1d1d1f" strokeWidth="1.5" fill="none" opacity="0.25" />
          <path d="M-60 262 Q120 108 300 148 T660 122" stroke="#06d6a0" strokeWidth="28" fill="none" />
          <path d="M-60 262 Q120 108 300 148 T660 122" stroke="#1d1d1f" strokeWidth="1.5" fill="none" opacity="0.2" />
          <path d="M-60 276 Q140 120 320 158 T660 134" stroke="#118ab2" strokeWidth="24" fill="none" />
          <path d="M-60 276 Q140 120 320 158 T660 134" stroke="#1d1d1f" strokeWidth="1.5" fill="none" opacity="0.2" />
          <path d="M-60 288 Q160 132 340 168 T660 145" stroke="#ffc8dd" strokeWidth="20" fill="none" />
          <path d="M-60 288 Q160 132 340 168 T660 145" stroke="#1d1d1f" strokeWidth="1" fill="none" opacity="0.15" />
        </svg>
      </div>

      {/* Avatar - overlapping cover */}
      <div className="-mt-9 pl-1 mb-3 relative z-30 flex w-full items-end">
        <div className="w-[72px] h-[72px] shrink-0 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-[22px] font-bold border-4 border-white shadow-md">
          {initials || '??'}
        </div>
        <div className="flex items-center w-full">
          <div className="flex-1 flex flex-row gap-6">
            <div className="text-center">
              <span className="text-base font-bold">0 </span>
              <span className="text-[13px] text-[#8e8e93]">Srečanj</span>
            </div>
            <div className="text-center">
              <span className="text-base font-bold">0 </span>
              <span className="text-[13px] text-[#8e8e93]">Povezav</span>
            </div>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditMode((value) => !value);
                setSuccess('');
                setError('');
              }}
              className="px-[18px] py-[6px] rounded-full text-[13px] font-semibold bg-[#0d0d0d] text-white border-0 cursor-pointer font-sans"
            >
              {editMode ? 'Zapri urejanje' : 'Uredi profil'}
            </button>
          </div>
        </div>
      </div>

      {/* Name + bio */}
      <div className="mb-[18px]">
        <div className="flex items-center gap-[7px] mb-[5px]">
          <h2 className="text-xl font-bold">{displayName}</h2>
          <span className="w-[18px] h-[18px] rounded-full bg-[#0071e3] flex items-center justify-center shrink-0">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </div>
        <p className="text-xs text-[#8e8e93] mb-2">{email}</p>
        <p className="text-sm text-[#6e6e73] leading-relaxed">
          {bio}
        </p>
      </div>

      {loading && (
        <div className="mb-[18px] rounded-[16px] bg-[#f7f7f7] px-4 py-3 text-sm text-[#6e6e73]">
          Nalaganje profila...
        </div>
      )}

      {editMode && (
        <form onSubmit={handleSubmit} className="mb-[18px] rounded-[18px] border border-[#f0f0f0] bg-white p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold">Urejanje profila</h3>
              <p className="text-sm text-[#8e8e93] mt-1">
                Podatki bodo uporabljeni za priporočila in kasnejše AI ujemanje.
              </p>
            </div>
            {!token && (
              <span className="rounded-full bg-[#fff8f0] px-3 py-1 text-xs font-semibold text-[#a15c1b]">
                Manjka prijavni žeton
              </span>
            )}
          </div>

          <div className="grid gap-4">
            <FormField label="Organizacija / institucija">
              <input
                value={form.affiliation}
                onChange={field('affiliation')}
                placeholder="npr. Univerza v Mariboru"
                className="profile-input"
              />
            </FormField>

            <FormField label="Kratek opis">
              <textarea
                value={form.bio}
                onChange={field('bio')}
                placeholder="Kdo ste in s kom se želite povezati?"
                rows={3}
                className="profile-input resize-none"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Področja interesa">
                <input
                  value={form.interests}
                  onChange={field('interests')}
                  placeholder="AI, robotika, javna uprava"
                  className="profile-input"
                />
              </FormField>

              <FormField label="Cilji mreženja">
                <input
                  value={form.goals}
                  onChange={field('goals')}
                  placeholder="partnerji, raziskovalci"
                  className="profile-input"
                />
              </FormField>

              <FormField label="Kompetence">
                <input
                  value={form.competencies}
                  onChange={field('competencies')}
                  placeholder="vodenje projektov, ML"
                  className="profile-input"
                />
              </FormField>

              <FormField label="Ključne besede">
                <input
                  value={form.researchKeywords}
                  onChange={field('researchKeywords')}
                  placeholder="LLM, digitalizacija"
                  className="profile-input"
                />
              </FormField>
            </div>

            <FormField label="Način srečanja">
              <select value={form.meetingType} onChange={field('meetingType')} className="profile-input">
                {MEETING_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {error && <p className="mt-4 text-sm text-[#d14242]">{error}</p>}
          {success && <p className="mt-4 text-sm text-[#16803c]">{success}</p>}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="px-[18px] py-[8px] rounded-full text-[13px] font-semibold bg-[#f3f4f6] text-[#3d3d3d] border-0 cursor-pointer font-sans"
            >
              Prekliči
            </button>
            <button
              type="submit"
              disabled={saving || !token}
              className="px-[18px] py-[8px] rounded-full text-[13px] font-semibold bg-[#0d0d0d] text-white border-0 cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Shranjevanje...' : 'Shrani profil'}
            </button>
          </div>
        </form>
      )}

      {/* Tab bar */}
      <div className="flex bg-[#f0f0f0] rounded-[13px] p-1 gap-0.5 mb-[18px]">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 text-[13px] rounded-[9px] border-0 cursor-pointer font-sans transition-all ${
              activeTab === i
                ? 'bg-white text-[#0d0d0d] font-semibold shadow-sm'
                : 'bg-transparent text-[#8e8e93] font-normal'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 2-col card grid */}
      <div className="grid grid-cols-2 gap-3">
        {CARDS.map((card, i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-white border border-[#f0f0f0] cursor-pointer">
            <div className="h-[128px] relative" style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})` }}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 128" fill="none" preserveAspectRatio="xMidYMid slice">
                <circle cx="170" cy="20" r="75" fill="rgba(255,255,255,0.1)" />
                <circle cx="20" cy="110" r="55" fill="rgba(255,255,255,0.07)" />
              </svg>
              <button className="absolute bottom-[9px] right-[9px] bg-white/20 backdrop-blur-sm border-0 rounded-lg w-7 h-7 flex items-center justify-center cursor-pointer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>
            <div className="px-[14px] py-3">
              <p className="text-sm font-semibold mb-1">{card.title}</p>
              <p className="text-xs text-[#8e8e93] flex items-center gap-1 mb-[3px]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                {card.location}
              </p>
              <p className="text-xs text-[#b0b0b0]">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[#6e6e73] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

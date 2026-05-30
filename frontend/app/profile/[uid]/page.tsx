'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import { TagPills } from '../../components/TagPicker';
import { useStoredUser } from '../../lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type PublicProfile = {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  bio?: string;
  affiliation?: string;
  interests?: string[];
  goals?: string[];
  meetingType?: 'online' | 'in-person' | 'both';
  competencies?: string[];
  researchKeywords?: string[];
  tags?: string[];
  roleProfile?: Record<string, unknown>;
};

const AVATAR_GRADIENTS = [
  { from: '#a8edea', to: '#fed6e3', text: '#3d3d3d' },
  { from: '#667eea', to: '#764ba2', text: '#ffffff' },
  { from: '#4facfe', to: '#00f2fe', text: '#ffffff' },
  { from: '#f093fb', to: '#f5576c', text: '#ffffff' },
  { from: '#43e97b', to: '#38f9d7', text: '#1a5c3a' },
  { from: '#fd746c', to: '#ff9068', text: '#ffffff' },
  { from: '#f7971e', to: '#ffd200', text: '#5a3000' },
  { from: '#a18cd1', to: '#fbc2eb', text: '#3d3d3d' },
];

const CHIP_COLORS = [
  'bg-[#eff6ff] text-[#1e40af]',
  'bg-[#f0fdf4] text-[#166534]',
  'bg-[#fdf4ff] text-[#7e22ce]',
  'bg-[#fff7ed] text-[#c2410c]',
];

function avatarGradient(uid: string) {
  return AVATAR_GRADIENTS[uid.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function chipColor(i: number) {
  return CHIP_COLORS[i % CHIP_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function profileImageValue(profile: PublicProfile, key: string): string {
  const v = profile.roleProfile?.[key];
  return typeof v === 'string' ? v : '';
}

function profileNumValue(profile: PublicProfile, key: string, fallback: number): number {
  const v = profile.roleProfile?.[key];
  return typeof v === 'number' ? v : fallback;
}

export default function PublicProfilePage() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const viewer = useStoredUser();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [tagMap, setTagMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API}/profile/${uid}`);
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error();
        const data = (await res.json()) as PublicProfile;
        setProfile(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [uid]);

  useEffect(() => {
    if (!viewer?.idToken) return;
    fetch(`${API}/tags`, { headers: { Authorization: `Bearer ${viewer.idToken}` } })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          const map: Record<string, string> = {};
          for (const t of data as { slug: string; label: string }[]) map[t.slug] = t.label;
          setTagMap(map);
        }
      })
      .catch(() => {});
  }, [viewer?.idToken]);

  useEffect(() => {
    if (!viewer?.idToken || !uid) return;
    fetch(`${API}/connections/me`, { headers: { Authorization: `Bearer ${viewer.idToken}` } })
      .then((r) => r.json())
      .then((data: { accepted?: Array<{ counterpart: { uid: string } }>; pendingSent?: Array<{ counterpart: { uid: string } }> }) => {
        setIsConnected((data.accepted ?? []).some((c) => c.counterpart.uid === uid));
        setIsPending((data.pendingSent ?? []).some((c) => c.counterpart.uid === uid));
      })
      .catch(() => {});
  }, [viewer?.idToken, uid]);

  async function handleConnect() {
    if (!viewer?.idToken) return;
    setConnecting(true);
    try {
      const res = await fetch(`${API}/connections/requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${viewer.idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientUid: uid }),
      });
      if (res.ok) {
        setIsPending(true);
        window.dispatchEvent(new Event('connections:refresh'));
      }
    } finally {
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="rounded-2xl rounded-b-none h-[164px] bg-[#f3f4f6] animate-pulse" />
        <div className="h-[200px] bg-[#f3f4f6] rounded-b-2xl animate-pulse mt-px" />
      </AppShell>
    );
  }

  if (notFound || !profile) {
    return (
      <AppShell>
        <div className="max-w-[560px] mx-auto text-center py-16">
          <p className="text-[#8e8e93] text-[14px]">Profil ni bil najden.</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 text-[13px] font-semibold text-[#0071e3] bg-transparent border-0 cursor-pointer font-sans"
          >
            ← Nazaj
          </button>
        </div>
      </AppShell>
    );
  }

  const gradient = avatarGradient(profile.uid);
  const profileImg = profileImageValue(profile, 'profileImageUrl');
  const backgroundImg = profileImageValue(profile, 'backgroundImageUrl');
  const bgPosX = profileNumValue(profile, 'backgroundImagePositionX', 50);
  const bgPosY = profileNumValue(profile, 'backgroundImagePositionY', 50);
  const bgZoom = profileNumValue(profile, 'backgroundImageZoom', 115);
  const pfPosX = profileNumValue(profile, 'profileImagePositionX', 50);
  const pfPosY = profileNumValue(profile, 'profileImagePositionY', 50);
  const pfZoom = profileNumValue(profile, 'profileImageZoom', 115);

  const isOwnProfile = viewer?.uid === profile.uid;
  const profileTags = (profile.tags ?? [])
    .filter((slug) => tagMap[slug])
    .map((slug) => ({ slug, label: tagMap[slug] }));

  return (
    <AppShell>
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[12px] text-[#8e8e93] hover:text-[#0d0d0d] bg-transparent border-0 cursor-pointer font-sans mb-4 p-0 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Nazaj
        </button>

        {/* Cover */}
        <div className="rounded-2xl rounded-b-none overflow-hidden h-[164px] relative">
          {backgroundImg ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${backgroundImg})`,
                backgroundPosition: `${bgPosX}% ${bgPosY}%`,
                backgroundSize: `${bgZoom}%`,
              }}
            />
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Avatar overlapping cover */}
        <div className="-mt-9 pl-1 mb-3 relative z-30 flex w-full items-end">
          <div
            className="w-[72px] h-[72px] shrink-0 overflow-hidden rounded-full flex items-center justify-center text-[22px] font-bold border-4 border-white shadow-md"
            style={profileImg ? undefined : { background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, color: gradient.text }}
          >
            {profileImg ? (
              <div
                className="h-full w-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${profileImg})`,
                  backgroundPosition: `${pfPosX}% ${pfPosY}%`,
                  backgroundSize: `${pfZoom}%`,
                }}
              />
            ) : (
              initials(profile.displayName) || '??'
            )}
          </div>

          <div className="flex items-center w-full pl-3">
            <div className="flex-1" />
            <div className="flex justify-end">
              {!isOwnProfile && viewer && (
                <button
                  type="button"
                  disabled={isConnected || isPending || connecting}
                  onClick={() => void handleConnect()}
                  className={`px-[18px] py-[6px] rounded-full text-[13px] font-semibold border-0 cursor-pointer font-sans transition-colors ${
                    isConnected
                      ? 'bg-[#ecfdf3] text-[#166534] cursor-default'
                      : isPending
                        ? 'bg-[#f3f4f6] text-[#6b7280] cursor-default'
                        : 'bg-[#0d0d0d] text-white hover:bg-[#1f1f1f] disabled:opacity-50'
                  }`}
                >
                  {isConnected ? 'Povezan/a ✓' : isPending ? 'Čaka odgovor' : connecting ? '…' : 'Poveži se'}
                </button>
              )}
              {isOwnProfile && (
                <Link
                  href="/profile"
                  className="px-[18px] py-[6px] rounded-full text-[13px] font-semibold border border-[#e5e7eb] text-[#3d3d3d] hover:border-[#0d0d0d] no-underline transition-colors"
                  style={{ background: '#7fa8c8', color: '#fff', borderColor: 'transparent' }}
                >
                  Uredi profil
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Name + checkmark + email + bio */}
        <div className="mb-[18px]">
          <div className="flex items-center gap-[7px] mb-[5px]">
            <h2 className="text-xl font-bold">{profile.displayName}</h2>
            <span className="w-[18px] h-[18px] rounded-full bg-[#0071e3] flex items-center justify-center shrink-0">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
          </div>
          <p className="text-xs text-[#8e8e93] mb-2">{profile.email}</p>
          {profile.bio && (
            <p className="text-sm text-[#6e6e73] leading-relaxed">{profile.bio}</p>
          )}
        </div>

        {/* Tags */}
        {profileTags.length > 0 && (
          <div className="bg-white border border-[#e5e7eb] rounded-[20px] px-5 py-4 mb-3">
            <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-[0.06em] mb-3">Oznake</p>
            <TagPills tags={profileTags} />
          </div>
        )}

        {/* Interests + Goals */}
        {((profile.interests ?? []).length > 0 || (profile.goals ?? []).length > 0) && (
          <div className="bg-white border border-[#e5e7eb] rounded-[20px] px-5 py-4 mb-3">
            <div className="grid grid-cols-2 gap-4">
              {(profile.interests ?? []).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-[0.06em] mb-2">Interesi</p>
                  <div className="flex flex-wrap gap-[5px]">
                    {(profile.interests ?? []).map((v, i) => (
                      <span key={v} className={`px-[8px] py-[3px] rounded-full text-[10px] font-medium ${chipColor(i)}`}>{v}</span>
                    ))}
                  </div>
                </div>
              )}
              {(profile.goals ?? []).length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-[0.06em] mb-2">Cilji</p>
                  <div className="flex flex-wrap gap-[5px]">
                    {(profile.goals ?? []).map((v, i) => (
                      <span key={v} className={`px-[8px] py-[3px] rounded-full text-[10px] font-medium ${chipColor((i + 2) % 4)}`}>{v}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Competencies */}
        {(profile.competencies ?? []).length > 0 && (
          <div className="bg-white border border-[#e5e7eb] rounded-[20px] px-5 py-4 mb-3">
            <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-[0.06em] mb-2">Kompetence</p>
            <div className="flex flex-wrap gap-[5px]">
              {(profile.competencies ?? []).map((v, i) => (
                <span key={v} className={`px-[8px] py-[3px] rounded-full text-[10px] font-medium ${chipColor(i)}`}>{v}</span>
              ))}
            </div>
          </div>
        )}

        {/* Research keywords */}
        {(profile.researchKeywords ?? []).length > 0 && (
          <div className="bg-white border border-[#e5e7eb] rounded-[20px] px-5 py-4 mb-3">
            <p className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-[0.06em] mb-2">Raziskovalne teme</p>
            <div className="flex flex-wrap gap-[5px]">
              {(profile.researchKeywords ?? []).map((v, i) => (
                <span key={v} className={`px-[8px] py-[3px] rounded-full text-[10px] font-medium ${chipColor(i)}`}>{v}</span>
              ))}
            </div>
          </div>
        )}

    </AppShell>
  );
}

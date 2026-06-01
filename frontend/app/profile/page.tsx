'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AppShell from '../components/AppShell';
import TagPicker from '../components/TagPicker';
import { saveStoredUser, useStoredUser } from '../lib/auth';
import { uploadProfileImage } from '../lib/supabase-storage';

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
  tags?: string[];
  roleProfile?: Record<string, unknown>;
};

type ConnectionsOverview = {
  accepted: Array<{ id: string }>;
};

type InvitesOverview = {
  processed?: Array<{
    invitationStatus?: 'pending' | 'accepted' | 'rejected';
  }>;
  interviewerPending?: Array<{
    invitationStatus?: 'pending' | 'accepted' | 'rejected';
  }>;
  interviewerProcessed?: Array<{
    invitationStatus?: 'pending' | 'accepted' | 'rejected';
  }>;
};

type ProfileForm = {
  bio: string;
  affiliation: string;
  interests: string[];
  goals: string[];
  meetingType: MeetingType;
  competencies: string[];
  researchKeywords: string[];
  tags: string[];
  profileImageUrl: string;
  backgroundImageUrl: string;
  profileImagePositionX: number;
  profileImagePositionY: number;
  backgroundImagePositionX: number;
  backgroundImagePositionY: number;
  profileImageZoom: number;
  backgroundImageZoom: number;
};

type CropTarget = 'profile' | 'background';

type CropDraft = {
  target: CropTarget;
  imageUrl: string;
  file?: File;
  positionX: number;
  positionY: number;
  zoom: number;
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
  interests: [],
  goals: [],
  meetingType: 'both',
  competencies: [],
  researchKeywords: [],
  tags: [],
  profileImageUrl: '',
  backgroundImageUrl: '',
  profileImagePositionX: 50,
  profileImagePositionY: 50,
  backgroundImagePositionX: 50,
  backgroundImagePositionY: 50,
  profileImageZoom: 115,
  backgroundImageZoom: 115,
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const MEETING_TYPES: Array<{ value: MeetingType; label: string }> = [
  { value: 'both', label: 'Oboje' },
  { value: 'in-person', label: 'V živo' },
  { value: 'online', label: 'Spletno' },
];

function profileImageValue(profile: UserProfile | null | undefined, key: 'profileImageUrl' | 'backgroundImageUrl') {
  const value = profile?.roleProfile?.[key];
  return typeof value === 'string' ? value : '';
}

function profilePositionValue(
  profile: UserProfile | null | undefined,
  key:
    | 'profileImagePositionX'
    | 'profileImagePositionY'
    | 'backgroundImagePositionX'
    | 'backgroundImagePositionY'
    | 'profileImageZoom'
    | 'backgroundImageZoom',
) {
  const value = profile?.roleProfile?.[key];
  if (typeof value === 'number') return value;
  return key.includes('Zoom') ? 115 : 50;
}

function profileToForm(profile?: UserProfile): ProfileForm {
  return {
    bio: profile?.bio ?? '',
    affiliation: profile?.affiliation ?? '',
    interests: profile?.interests ?? [],
    goals: profile?.goals ?? [],
    meetingType: profile?.meetingType ?? 'both',
    competencies: profile?.competencies ?? [],
    researchKeywords: profile?.researchKeywords ?? [],
    tags: profile?.tags ?? [],
    profileImageUrl: profileImageValue(profile, 'profileImageUrl'),
    backgroundImageUrl: profileImageValue(profile, 'backgroundImageUrl'),
    profileImagePositionX: profilePositionValue(profile, 'profileImagePositionX'),
    profileImagePositionY: profilePositionValue(profile, 'profileImagePositionY'),
    backgroundImagePositionX: profilePositionValue(profile, 'backgroundImagePositionX'),
    backgroundImagePositionY: profilePositionValue(profile, 'backgroundImagePositionY'),
    profileImageZoom: profilePositionValue(profile, 'profileImageZoom'),
    backgroundImageZoom: profilePositionValue(profile, 'backgroundImageZoom'),
  };
}

type RoleRequestState = 'idle' | 'submitting' | 'submitted' | 'error';

export default function ProfilePage() {
  const user = useStoredUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [imageUploadError, setImageUploadError] = useState('');
  const [success, setSuccess] = useState('');
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [roleRequestState, setRoleRequestState] = useState<RoleRequestState>('idle');
  const [roleRequestedRole, setRoleRequestedRole] = useState<'organizer' | 'industry'>('organizer');
  const [roleRequestReason, setRoleRequestReason] = useState('');
  const [roleRequestError, setRoleRequestError] = useState('');
  const [connectionCount, setConnectionCount] = useState(0);
  const [meetingCount, setMeetingCount] = useState(0);

  const token = user?.idToken;
  const displayName = profile?.displayName ?? user?.displayName ?? 'Udeleženec';
  const email = profile?.email ?? user?.email ?? '';
  const bio = profile?.bio || 'Udeleženec konference Confera 2026. Dopolnite profil za boljša priporočila srečanj in povežite se z udeleženci iz vaše branže.';
  const profileImageUrl = form.profileImageUrl || profileImageValue(profile, 'profileImageUrl');
  const backgroundImageUrl = form.backgroundImageUrl || profileImageValue(profile, 'backgroundImageUrl');
  const profileImagePosition = `${form.profileImagePositionX}% ${form.profileImagePositionY}%`;
  const backgroundImagePosition = `${form.backgroundImagePositionX}% ${form.backgroundImagePositionY}%`;
  const profileImageSize = `${form.profileImageZoom}%`;
  const backgroundImageSize = `${form.backgroundImageZoom}%`;

  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current || !user?.idToken) return;
    loadedRef.current = true;

    const idToken = user.idToken;
    const currentUser = user;

    async function loadProfile() {
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
          profileImageUrl: profileImageValue(data, 'profileImageUrl'),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Prišlo je do napake');
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [user]);

  useEffect(() => {
    if (!token) return;

    async function loadConnectionCount() {
      try {
        const res = await fetch(`${API}/connections/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;
        const payload = (await res.json()) as ConnectionsOverview;
        setConnectionCount(payload.accepted?.length ?? 0);
      } catch {
        // keep previous count on transient errors
      }
    }

    const refresh = () => void loadConnectionCount();
    void loadConnectionCount();
    window.addEventListener('connections:refresh', refresh);
    return () => window.removeEventListener('connections:refresh', refresh);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    async function loadMeetingCount() {
      try {
        const res = await fetch(`${API}/invites/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const payload = (await res.json()) as InvitesOverview;
        const candidateAcceptedCount = (payload.processed ?? []).filter(
          (item) => item.invitationStatus === 'accepted',
        ).length;
        const interviewerActiveCount = [
          ...(payload.interviewerPending ?? []),
          ...(payload.interviewerProcessed ?? []),
        ].filter((item) => item.invitationStatus !== 'rejected').length;
        setMeetingCount(candidateAcceptedCount + interviewerActiveCount);
      } catch {
        // keep previous count on transient errors
      }
    }

    const refresh = () => void loadMeetingCount();
    void loadMeetingCount();
    window.addEventListener('invites:refresh', refresh);
    return () => window.removeEventListener('invites:refresh', refresh);
  }, [token]);

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

  function closeEditMode() {
    setEditMode(false);
    setForm(profileToForm(profile ?? undefined));
    setSuccess('');
    setError('');
  }

  async function handleImageChange(
    key: 'profileImageUrl' | 'backgroundImageUrl',
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Izberite slikovno datoteko.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError('Slika je prevelika. Izberite sliko manjšo od 5 MB.');
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    setCropDraft({
      target: key === 'profileImageUrl' ? 'profile' : 'background',
      imageUrl,
      file,
      positionX: 50,
      positionY: 50,
      zoom: 115,
    });
    setError('');
    setImageUploadError('');
    setSuccess('');
  }

  function openCropEditor(target: CropTarget) {
    const isProfile = target === 'profile';
    const imageUrl = isProfile ? form.profileImageUrl : form.backgroundImageUrl;
    if (!imageUrl) return;

    setCropDraft({
      target,
      imageUrl,
      positionX: isProfile ? form.profileImagePositionX : form.backgroundImagePositionX,
      positionY: isProfile ? form.profileImagePositionY : form.backgroundImagePositionY,
      zoom: isProfile ? form.profileImageZoom : form.backgroundImageZoom,
    });
  }

  async function applyCropDraft() {
    if (!cropDraft) return;

    setError('');
    setImageUploadError('');
    setUploadingImage(true);

    try {
      const nextImageUrl = cropDraft.file
        ? await uploadProfileImage({
          file: cropDraft.file,
          uid: profile?.uid ?? user?.uid ?? 'unknown-user',
          kind: cropDraft.target === 'profile' ? 'avatar' : 'cover',
        })
        : cropDraft.imageUrl;

      setForm((prev) => (
        cropDraft.target === 'profile'
          ? {
            ...prev,
            profileImageUrl: nextImageUrl,
            profileImagePositionX: cropDraft.positionX,
            profileImagePositionY: cropDraft.positionY,
            profileImageZoom: cropDraft.zoom,
          }
          : {
            ...prev,
            backgroundImageUrl: nextImageUrl,
            backgroundImagePositionX: cropDraft.positionX,
            backgroundImagePositionY: cropDraft.positionY,
            backgroundImageZoom: cropDraft.zoom,
          }
      ));

      if (cropDraft.file) URL.revokeObjectURL(cropDraft.imageUrl);
      setCropDraft(null);
      setSuccess('Slika je naložena. Za trajno shranjevanje pritisnite Shrani profil.');
    } catch (err) {
      setImageUploadError(err instanceof Error ? err.message : 'Slike ni bilo mogoče naložiti.');
    } finally {
      setUploadingImage(false);
    }
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

    try {
      const payload = {
        bio: form.bio.trim() || undefined,
        affiliation: form.affiliation.trim() || undefined,
        interests: [],
        goals: [],
        competencies: [],
        researchKeywords: form.tags.map(s => s.replace(/-/g, ' ')),
        meetingType: form.meetingType,
        tags: form.tags,
        roleProfile: {
          ...(profile?.roleProfile ?? {}),
          profileImageUrl: form.profileImageUrl,
          backgroundImageUrl: form.backgroundImageUrl,
          profileImagePositionX: form.profileImagePositionX,
          profileImagePositionY: form.profileImagePositionY,
          backgroundImagePositionX: form.backgroundImagePositionX,
          backgroundImagePositionY: form.backgroundImagePositionY,
          profileImageZoom: form.profileImageZoom,
          backgroundImageZoom: form.backgroundImageZoom,
        },
      };

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
        tags: form.tags,
        displayName,
        email,
      }));
      if (user) {
        saveStoredUser({
          ...user,
          displayName,
          email,
          profileImageUrl: form.profileImageUrl,
        });
      }
      setSuccess('Profil je shranjen.');
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prišlo je do napake');
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleRequest(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setRoleRequestError('Niste prijavljeni. Odjavite se in se znova prijavite.');
      setRoleRequestState('error');
      return;
    }
    setRoleRequestState('submitting');
    setRoleRequestError('');
    try {
      const res = await fetch(`${API}/role-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ requestedRole: roleRequestedRole, reason: roleRequestReason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(msg ?? 'Zahteva ni bila poslana');
      }
      setRoleRequestState('submitted');
    } catch (err) {
      setRoleRequestError(err instanceof Error ? err.message : 'Prišlo je do napake');
      setRoleRequestState('error');
    }
  }

  const currentRole = profile?.role ?? user?.role;

  return (
    <AppShell>
      {/* Cover */}
      <div className="rounded-2xl rounded-b-none overflow-hidden h-[164px] relative">
        {backgroundImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${backgroundImageUrl})`,
              backgroundPosition: backgroundImagePosition,
              backgroundSize: backgroundImageSize,
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

      {/* Avatar - overlapping cover */}
      <div className="-mt-9 pl-1 mb-3 relative z-30 flex w-full items-end">
        <div className="w-[72px] h-[72px] shrink-0 overflow-hidden rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-[22px] font-bold border-4 border-white shadow-md">
          {profileImageUrl ? (
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${profileImageUrl})`,
                backgroundPosition: profileImagePosition,
                backgroundSize: profileImageSize,
              }}
            />
          ) : (
            initials || '??'
          )}
        </div>
        <div className="flex items-center w-full">
          <div className="flex-1 flex flex-row gap-6">
            <div className="text-center">
              <span className="text-base font-bold">{meetingCount} </span>
              <span className="text-[13px] text-[#8e8e93]">Srečanj</span>
            </div>
            <div className="text-center">
              <span className="text-base font-bold">{connectionCount} </span>
              <span className="text-[13px] text-[#8e8e93]">Povezav</span>
            </div>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditMode((value) => {
                  if (value) {
                    setForm(profileToForm(profile ?? undefined));
                  }

                  return !value;
                });
                setSuccess('');
                setError('');
              }}
              className="px-[18px] py-[6px] rounded-full text-[13px] font-semibold text-white border-0 cursor-pointer font-sans" style={{ background: '#7fa8c8' }}
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

      {currentRole === 'participant' && !editMode && (
        <div className="mb-[18px] rounded-[18px] border border-[#f0f0f0] bg-white p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#1d1d1f]">Zahteva za spremembo vloge</h3>
            <p className="text-sm text-[#8e8e93] mt-1">
              Zaprosili boste administratorja za spremembo vaše vloge na platformi.
            </p>
          </div>

          {roleRequestState === 'submitted' ? (
            <div className="rounded-[14px] bg-[#f0faf4] border border-[#a7f3d0] px-4 py-3 text-sm text-[#16803c]">
              Vaša zahteva je bila poslana. Administrator jo bo pregledal.
            </div>
          ) : (
            <form onSubmit={handleRoleRequest} className="grid gap-4">
              <div>
                <p className="text-xs font-semibold text-[#6e6e73] mb-2">Zahtevana vloga</p>
                <div className="flex gap-2">
                  {(['organizer', 'industry'] as const).map((role) => {
                    const label = role === 'organizer' ? 'Organizator' : 'Industrija';
                    const selected = roleRequestedRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setRoleRequestedRole(role)}
                        className={`rounded-full px-4 py-2 text-[13px] font-semibold border transition-colors ${
                          selected
                            ? 'bg-[#0d0d0d] text-white border-[#0d0d0d]'
                            : 'bg-white text-[#4b5563] border-[#e5e7eb] hover:bg-[#f7f7f7]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6e6e73] mb-1.5">
                  Razlog (neobvezno)
                </label>
                <textarea
                  value={roleRequestReason}
                  onChange={(e) => setRoleRequestReason(e.target.value)}
                  placeholder="Kratko opišite, zakaj zaprošate za to vlogo..."
                  rows={3}
                  className="profile-input resize-none"
                />
              </div>

              {roleRequestState === 'error' && (
                <p className="text-sm text-[#d14242]">{roleRequestError}</p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={roleRequestState === 'submitting'}
                  className="px-[18px] py-[8px] rounded-full text-[13px] font-semibold bg-[#0d0d0d] text-white border-0 cursor-pointer font-sans disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {roleRequestState === 'submitting' ? 'Pošiljanje...' : 'Pošlji zahtevo'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImagePicker
                label="Profilna slika"
                description="Prikaže se v krogu ob vašem profilu."
                imageUrl={form.profileImageUrl}
                positionX={form.profileImagePositionX}
                positionY={form.profileImagePositionY}
                zoom={form.profileImageZoom}
                fallback={initials || '??'}
                variant="avatar"
                onChange={(event) => handleImageChange('profileImageUrl', event)}
                onEdit={() => openCropEditor('profile')}
                onRemove={() => {
                  setForm((prev) => ({
                    ...prev,
                    profileImageUrl: '',
                    profileImagePositionX: 50,
                    profileImagePositionY: 50,
                    profileImageZoom: 115,
                  }));
                }}
              />

              <ImagePicker
                label="Slika ozadja"
                description="Prikaže se kot naslovna slika profila."
                imageUrl={form.backgroundImageUrl}
                positionX={form.backgroundImagePositionX}
                positionY={form.backgroundImagePositionY}
                zoom={form.backgroundImageZoom}
                fallback="Privzeto ozadje"
                variant="cover"
                onChange={(event) => handleImageChange('backgroundImageUrl', event)}
                onEdit={() => openCropEditor('background')}
                onRemove={() => {
                  setForm((prev) => ({
                    ...prev,
                    backgroundImageUrl: '',
                    backgroundImagePositionX: 50,
                    backgroundImagePositionY: 50,
                    backgroundImageZoom: 115,
                  }));
                }}
              />
            </div>

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

            <FormField label="Oznake" description="Izberite oznake, ki vas opisujejo — uporabljene so pri AI ujemanju in skozi celotno platformo.">
              <TagPicker
                token={token ?? ''}
                value={form.tags}
                onChange={(slugs) => {
                  setForm((prev) => ({ ...prev, tags: slugs }));
                  setSuccess('');
                }}
              />
            </FormField>

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
              onClick={closeEditMode}
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

      {cropDraft && (
        <ImageCropModal
          draft={cropDraft}
          uploading={uploadingImage}
          error={imageUploadError}
          onChange={setCropDraft}
          onCancel={() => {
            if (cropDraft.file) URL.revokeObjectURL(cropDraft.imageUrl);
            setCropDraft(null);
            setImageUploadError('');
          }}
          onApply={applyCropDraft}
        />
      )}
    </AppShell>
  );
}

function FormField({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[#6e6e73] mb-1">{label}</span>
      {description && <span className="block text-[11px] text-[#8e8e93] mb-2">{description}</span>}
      {children}
    </label>
  );
}

function ImagePicker({
  label,
  description,
  imageUrl,
  positionX,
  positionY,
  zoom,
  fallback,
  variant,
  onChange,
  onEdit,
  onRemove,
}: {
  label: string;
  description: string;
  imageUrl: string;
  positionX: number;
  positionY: number;
  zoom: number;
  fallback: string;
  variant: 'avatar' | 'cover';
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const isAvatar = variant === 'avatar';

  return (
    <div className="rounded-[16px] border border-[#f0f0f0] bg-[#fcfcfd] p-4">
      <div className="mb-3">
        <p className="text-sm font-bold text-[#1d1d1f]">{label}</p>
        <p className="text-[12px] text-[#8e8e93] mt-1">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`shrink-0 overflow-hidden border border-[#eceff3] bg-white ${
            isAvatar
              ? 'h-[72px] w-[72px] rounded-full'
              : 'h-[72px] w-[128px] rounded-[14px]'
          }`}
        >
          {imageUrl ? (
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundPosition: `${positionX}% ${positionY}%`,
                backgroundSize: `${zoom}%`,
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#f3f4f6] px-3 text-center text-[12px] font-semibold text-[#8e8e93]">
              {fallback}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#4b5563] transition-colors hover:bg-[#f7f7f7] cursor-pointer">
            Izberi sliko
            <input type="file" accept="image/*" onChange={onChange} className="sr-only" />
          </label>
          {imageUrl && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#4b5563] transition-colors hover:bg-[#f7f7f7]"
              >
                Uredi prikaz
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#8e3d3d] transition-colors hover:bg-[#fff5f5]"
              >
                Odstrani
              </button>
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[#a1a1aa]">
        Podprte so slike do 5 MB. Po potrditvi se naložijo v Supabase.
      </p>
    </div>
  );
}

function ImageCropModal({
  draft,
  uploading,
  error,
  onChange,
  onCancel,
  onApply,
}: {
  draft: CropDraft;
  uploading: boolean;
  error: string;
  onChange: (draft: CropDraft) => void;
  onCancel: () => void;
  onApply: () => void | Promise<void>;
}) {
  const isAvatar = draft.target === 'profile';
  const title = isAvatar ? 'Uredi profilno sliko' : 'Uredi sliko ozadja';

  function updatePosition(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
    onChange({ ...draft, positionX: Math.round(x), positionY: Math.round(y) });
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePosition(event);
  }

  function drag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    updatePosition(event);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-[560px] rounded-[24px] bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#1d1d1f]">{title}</h3>
            <p className="mt-1 text-sm text-[#8e8e93]">
              Povlecite sliko in nastavite povečavo pred potrditvijo.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#4b5563] hover:bg-[#f7f7f7]"
          >
            Zapri
          </button>
        </div>

        <div className="flex justify-center">
          <div
            onPointerDown={startDrag}
            onPointerMove={drag}
            className={`relative overflow-hidden bg-[#f3f4f6] cursor-move touch-none ${
              isAvatar
                ? 'h-[280px] w-[280px] rounded-full'
                : 'h-[220px] w-full rounded-[18px]'
            }`}
          >
            <div
              className="absolute inset-0 bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${draft.imageUrl})`,
                backgroundPosition: `${draft.positionX}% ${draft.positionY}%`,
                backgroundSize: `${draft.zoom}%`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 border-2 border-white/80" />
          </div>
        </div>

        <label className="mt-5 block">
          <div className="mb-2 flex items-center justify-between text-[13px] font-semibold text-[#6e6e73]">
            <span>Povečava</span>
            <span>{draft.zoom}%</span>
          </div>
          <input
            type="range"
            min="100"
            max="220"
            value={draft.zoom}
            onChange={(event) => onChange({ ...draft, zoom: Number(event.target.value) })}
            className="w-full accent-[#0d0d0d]"
          />
        </label>

        {error && (
          <div className="mt-4 rounded-[14px] border border-[#f4c7c7] bg-[#fff5f5] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="rounded-full border-0 bg-[#f3f4f6] px-[18px] py-[8px] text-[13px] font-semibold text-[#3d3d3d]"
          >
            Prekliči
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={uploading}
            className="rounded-full border-0 bg-[#0d0d0d] px-[18px] py-[8px] text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {uploading ? 'Nalaganje...' : 'Potrdi prikaz'}
          </button>
        </div>
      </div>
    </div>
  );
}


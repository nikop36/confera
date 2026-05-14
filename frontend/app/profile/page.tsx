'use client';

import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';

type StoredUser = { displayName: string; email: string };

const TABS = ['Srečanja', 'Dogodki', 'Povabila', 'Sledilci'];

const CARDS = [
  { title: 'AI v industriji', location: 'Dvorana A', desc: 'Panelna razprava o prihodnosti', from: '#7c6cf6', to: '#c084fc' },
  { title: 'Karierni razgovor', location: 'Sejna soba 3', desc: 'Srečanje z delodajalci', from: '#fb923c', to: '#fbbf24' },
  { title: 'Akademsko mreženje', location: 'Atrij', desc: 'Izmenjava izkušenj', from: '#22d3ee', to: '#6ee7b7' },
  { title: 'Industrijsko srečanje', location: 'Razstavni prostor', desc: 'Razstava rešitev', from: '#f472b6', to: '#fb7185' },
];

export default function ProfilePage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem('confera_user');
    if (raw) { try { setUser(JSON.parse(raw)); } catch { /* invalid json */ } }
  }, []);

  const initials = user?.displayName
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '??';

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

      {/* Avatar — overlapping cover */}
      <div className="-mt-9 pl-1 mb-3 relative z-30 flex w-full items-end">
        <div className="w-[72px] h-[72px] shrink-0 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center text-[22px] font-bold border-4 border-white shadow-md">
          {initials}
        </div>
              <div className="flex items-center w-full">
        <div className='flex-1 flex flex-row gap-6'>
        <div className=" text-center">
          <span className="text-base font-bold">0 </span>
          <span className="text-[13px] text-[#8e8e93]">Srečanj</span>
        </div>
        <div className=" text-center">
          <span className="text-base font-bold">0 </span>
          <span className="text-[13px] text-[#8e8e93]">Povezav</span>
        </div>
        </div>
        <div className="flex-1 flex justify-end">
          <button className="px-[18px] py-[6px] rounded-full text-[13px] font-semibold bg-[#0d0d0d] text-white border-0 cursor-pointer font-sans">
            Uredi profil
          </button>
        </div>
      </div>
      </div>

      {/* Stats + Edit — own row, three equal-width items */}


      {/* Name + bio */}
      <div className="mb-[18px]">
        <div className="flex items-center gap-[7px] mb-[5px]">
          <h2 className="text-xl font-bold">{user?.displayName ?? 'Udeleženec'}</h2>
          <span className="w-[18px] h-[18px] rounded-full bg-[#0071e3] flex items-center justify-center shrink-0">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </div>
        <p className="text-sm text-[#6e6e73] leading-relaxed">
          Udeleženec konference Confera 2026. Dopolnite profil za boljša priporočila srečanj in povežite se z udeleženci iz vaše branže.
        </p>
      </div>

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

'use client';

import { useState } from 'react';
import AppShell from '../components/AppShell';
import { useT } from '../lib/i18n';

const TAB_KEYS = ['home.tab.recent', 'home.tab.friends', 'home.tab.popular'] as const;

const POSTS = [
  {
    authorKey: 'home.post.1.author',
    authorFallback: 'Confera Organization',
    time: '1h',
    textKey: 'home.post.1.text',
    textFallback:
      'Welcome! Confera 2026 starts in 3 days. Meeting schedules will be published tomorrow — check your invites and complete your profile for better recommendations.',
    bg: '#ecf4fd',
    hasImages: true,
  },
  {
    authorKey: 'home.post.2.author',
    authorFallback: 'Dr. Petra Kos',
    time: '3h',
    textKey: 'home.post.2.text',
    textFallback:
      'I am looking forward to meetings with researchers in AI and public administration. If you are interested in exchanging experience, contact me through the meeting system.',
    bg: '#fff8f0',
    hasImages: false,
  },
] as const;

const IMAGE_GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
];

export default function HomePage() {
  const t = useT();
  const [activeTab, setActiveTab] = useState(1);
  const [liked, setLiked] = useState<Record<number, boolean>>({});

  return (
    <AppShell>

      {/* Header */}
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-[22px] font-bold">{t('home.title', 'News')}</h2>
        <div className="flex gap-5">
          {TAB_KEYS.map((tabKey, i) => (
            <button
              key={tabKey}
              onClick={() => setActiveTab(i)}
              className={`bg-transparent border-0 cursor-pointer font-sans text-sm pb-0.5 border-b-2 transition-colors ${
                activeTab === i
                  ? 'font-bold text-[#0d0d0d] border-[#0d0d0d]'
                  : 'font-normal text-[#8e8e93] border-transparent'
              }`}
            >
              {t(tabKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="flex flex-col gap-[14px]">
        {POSTS.map((post, i) => (
          <article key={i} className="rounded-[18px] p-5" style={{ background: post.bg }}>

            {/* Author row */}
            <div className="flex items-center justify-between mb-[14px]">
              <div className="flex items-center gap-[10px]">
                <div
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                  style={{
                    background: i === 0 ? '#0d0d0d' : 'linear-gradient(135deg,#a8edea,#fed6e3)',
                    color: i === 0 ? '#fff' : '#3d3d3d',
                  }}
                >
                  {t(post.authorKey, post.authorFallback).split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t(post.authorKey, post.authorFallback)}</p>
                  <p className="text-xs text-[#8e8e93]">{post.time} {t('common.ago', 'ago')}</p>
                </div>
              </div>
              <button className="bg-transparent border-0 cursor-pointer text-[#8e8e93] p-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
            </div>

            {/* Text */}
            <p className={`text-sm leading-[1.65] text-[#1d1d1f] ${post.hasImages ? 'mb-[14px]' : 'mb-4'}`}>
              {t(post.textKey, post.textFallback)}
            </p>

            {/* Image grid */}
            {post.hasImages && (
              <div className="grid grid-cols-3 gap-[6px] mb-4 rounded-xl overflow-hidden">
                {IMAGE_GRADIENTS.map((g, j) => (
                  <div
                    key={j}
                    className={`h-[110px] ${j === 0 ? 'rounded-l-[10px]' : j === 2 ? 'rounded-r-[10px]' : ''}`}
                    style={{ background: g }}
                  />
                ))}
              </div>
            )}

            {/* Reactions */}
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-[5px] text-[13px] text-[#8e8e93]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                {i === 0 ? '1.2k' : '348'}
              </span>
              <button
                onClick={() => setLiked(prev => ({ ...prev, [i]: !prev[i] }))}
                className={`flex items-center gap-[5px] text-[13px] bg-transparent border-0 cursor-pointer font-sans p-0 ${
                  liked[i] ? 'text-[#e05c5c] font-semibold' : 'text-[#8e8e93] font-normal'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={liked[i] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {t('home.like', 'Like')}
              </button>
              <button className="flex items-center gap-[5px] text-[13px] text-[#8e8e93] bg-transparent border-0 cursor-pointer font-sans p-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {t('home.comment', 'Comment')}
              </button>
            </div>
          </article>
        ))}

        {/* Share input */}
        <div className="bg-[#f7f7f7] rounded-[18px] p-[18px]">
          <div className="flex items-center gap-[10px] mb-[14px]">
            <div className="w-[34px] h-[34px] rounded-full bg-[#e0e0e0] shrink-0" />
            <input
              type="text"
              placeholder={t('home.sharePlaceholder', 'Share an update with participants...')}
              className="flex-1 bg-transparent border-0 outline-none text-sm text-[#8e8e93] font-sans"
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-3 flex-wrap">
              {[
                { label: t('home.file', 'File'), icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg> },
                { label: t('home.image', 'Image'), icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg> },
                { label: t('home.location', 'Location'), icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg> },
              ].map(({ label, icon }) => (
                <button key={label} className="flex items-center gap-[5px] text-xs text-[#8e8e93] bg-transparent border-0 cursor-pointer font-sans">
                  {icon} {label}
                </button>
              ))}
            </div>
            <button className="px-5 py-[7px] rounded-full bg-[#0d0d0d] text-white text-[13px] font-semibold border-0 cursor-pointer font-sans">
              {t('home.send', 'Send')}
            </button>
          </div>
        </div>
      </div>

    </AppShell>
  );
}

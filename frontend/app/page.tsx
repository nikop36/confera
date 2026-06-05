"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import HeroSection from "./components/HeroSection";
import { useT } from "./lib/i18n";
const FEATURE_ICONS = [
  (
      <svg key="feature-icon-1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
  ),
  (
      <svg key="feature-icon-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <circle cx="8" cy="16" r="1" fill="currentColor" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <circle cx="16" cy="16" r="1" fill="currentColor" />
      </svg>
  ),
  (
      <svg key="feature-icon-3" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
      </svg>
  ),
];

export default function Home() {
  const t = useT();
  const features = [
    {
      icon: FEATURE_ICONS[0],
      tag: t('landing.feature.1.tag', 'Targeted networking'),
      title: t('landing.feature.1.title', 'Right contacts, right moment'),
      desc: t('landing.feature.1.desc', 'The system analyzes your selected tags and connects you with participants from academia, industry, and public administration who share similar topics.'),
    },
    {
      icon: FEATURE_ICONS[1],
      tag: t('landing.feature.2.tag', 'Career fair'),
      title: t('landing.feature.2.title', 'Interviews without chaos'),
      desc: t('landing.feature.2.desc', 'Career interviews and research fair organization with automatic meeting scheduling based on available slots and room capacity.'),
    },
    {
      icon: FEATURE_ICONS[2],
      tag: t('landing.feature.3.tag', 'Smart scheduling'),
      title: t('landing.feature.3.title', 'The algorithm works for you'),
      desc: t('landing.feature.3.desc', 'The advanced algorithm considers tags, availability, and room constraints — each participant gets an optimized schedule without conflicts.'),
    },
  ];
  const steps = [
    { n: "01", title: t('landing.step.1.title', 'Create profile'), desc: t('landing.step.1.desc', 'Set your role — academic, industry expert, or public sector representative.') },
    { n: "02", title: t('landing.step.2.title', 'Choose tags'), desc: t('landing.step.2.desc', 'Mark topics that describe you: from artificial intelligence to sustainability.') },
    { n: "03", title: t('landing.step.3.title', 'System connects'), desc: t('landing.step.3.desc', 'Confera finds participant matches and suggests meetings with the highest potential.') },
    { n: "04", title: t('landing.step.4.title', 'Meet'), desc: t('landing.step.4.desc', 'Receive your personal conference schedule with arranged meetings, locations, and contacts.') },
  ];

  return (
    <div className="bg-white font-sans text-[#0d0d0d]" style={{ overflowX: "clip" }}>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 lg:px-10 h-[62px] bg-white/90 backdrop-blur-md border-b border-[#f0f0f0]">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-2 h-2 rounded-full bg-[#7fa8c8]" />
          <span className="font-bold text-[17px] text-[#0d0d0d] tracking-wide">Confera</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {[t('landing.nav.features', 'Features'), t('landing.nav.how', 'How it works'), t('landing.nav.about', 'About')].map((l) => (
            <a key={l} href="#" className="text-[13px] text-[#6e6e73] no-underline hover:text-[#0d0d0d] transition-colors">{l}</a>
          ))}
        </div>
        <Link
          href="/login"
          className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0d0d0d] text-white text-[13px] font-semibold no-underline"
        >
          {t('auth.login.submit', 'Sign in')}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </nav>

      {/* ── Hero (map + converging lines — unchanged logic) ── */}
      <HeroSection />

      {/* ── Features ── */}
      <section className="py-16 lg:py-24 px-4 lg:px-10 max-w-[1200px] mx-auto">
        <p className="text-xs font-semibold text-[#7fa8c8] tracking-[0.18em] uppercase mb-3">{t('landing.nav.features', 'Features')}</p>
        <div className="flex items-end justify-between mb-14 flex-wrap gap-4">
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight max-w-[420px]">
            {t('landing.features.title.1', 'Everything you need')}<br />
            <span className="text-[#7fa8c8]">{t('landing.features.title.2', 'for the right meeting.')}</span>
          </h2>
          <p className="text-[15px] text-[#6e6e73] leading-relaxed max-w-[340px]">
            {t('landing.features.subtitle', 'From smart matching to automated scheduling — Confera handles logistics so you can focus on content.')}
          </p>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {features.map((f, i) => (
            <motion.div
              key={f.tag}
              className="bg-white rounded-2xl p-8 border border-[#f0f0f0] hover:-translate-y-1 transition-transform duration-200"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              viewport={{ once: true, margin: "-60px" }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-[42px] h-[42px] rounded-xl border border-[#f0f0f0] bg-[#f7f7f7] flex items-center justify-center text-[#7fa8c8]">
                  {f.icon}
                </div>
                <span className="text-[11px] font-semibold text-[#7fa8c8] tracking-[0.15em] uppercase">{f.tag}</span>
              </div>
              <h3 className="text-[1.3rem] font-bold text-[#0d0d0d] mb-2 leading-snug">{f.title}</h3>
              <p className="text-[14px] text-[#6e6e73] leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="px-4 lg:px-10"><div className="h-px bg-[#f0f0f0]" /></div>

      {/* ── How it works ── */}
      <section className="py-16 lg:py-24 px-4 lg:px-10 max-w-[1200px] mx-auto">
        <p className="text-xs font-semibold text-[#7fa8c8] tracking-[0.18em] uppercase mb-3">{t('landing.process', 'Process')}</p>
        <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight mb-14">
          {t('landing.how.title', 'How does Confera work?')}
        </h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              className="py-6"
              style={{ paddingLeft: i === 0 ? 0 : "1.5rem", borderLeft: i === 0 ? "none" : "1px solid #f0f0f0" }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              viewport={{ once: true }}
            >
              <div className="text-[3rem] font-bold leading-none text-[#e5e7eb] mb-2">{s.n}</div>
              <h3 className="text-[1.1rem] font-bold mb-1.5">{s.title}</h3>
              <p className="text-[14px] text-[#6e6e73] leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 lg:py-24 px-4 lg:px-10 text-center bg-[#f7f7f7]">
        <p className="text-xs font-semibold text-[#7fa8c8] tracking-[0.18em] uppercase mb-4">{t('landing.join', 'Join')}</p>
        <motion.h2
          className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight mx-auto mb-4"
          style={{ maxWidth: 720 }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          {t('landing.cta.title.1', 'Your next key')}<br />
          <span className="text-[#7fa8c8]">{t('landing.cta.title.2', 'business opportunity')}</span> {t('landing.cta.title.3', 'is waiting.')}
        </motion.h2>
        <p className="text-[15px] text-[#6e6e73] max-w-[400px] mx-auto mb-8 leading-relaxed">
          {t('landing.cta.subtitle', 'Register before the conference and Confera takes care of the rest.')}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="/register"
            className="flex items-center gap-1.5 px-6 py-3 rounded-full bg-[#0d0d0d] text-white text-[14px] font-semibold no-underline"
          >
            {t('landing.cta.register', 'Participant registration')}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="#"
            className="flex items-center gap-1.5 px-6 py-3 rounded-full border border-[#e5e7eb] bg-white text-[#3d3d3d] text-[14px] font-semibold no-underline hover:bg-[#f7f7f7] transition-colors"
          >
            {t('landing.cta.contact', 'Contact us')}
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="flex items-center justify-between flex-wrap gap-4 px-4 lg:px-10 py-6 border-t border-[#f0f0f0] bg-white">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7fa8c8]" />
          <span className="font-bold text-[14px] tracking-wide">Confera</span>
        </div>
        <p className="text-[12px] text-[#8e8e93]">
          © 2026 Confera · {t('landing.footer.tagline', 'Targeted networking system')}
        </p>
        <div className="flex gap-5">
          {[t('landing.footer.privacy', 'Privacy'), t('landing.footer.terms', 'Terms'), t('landing.footer.contact', 'Contact')].map((l) => (
            <a key={l} href="#" className="text-[12px] text-[#8e8e93] no-underline hover:text-[#0d0d0d] transition-colors">{l}</a>
          ))}
        </div>
      </footer>

    </div>
  );
}

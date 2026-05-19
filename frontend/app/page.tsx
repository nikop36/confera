"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import HeroSection from "./components/HeroSection";

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
    tag: "Ciljno mreženje",
    title: "Pravi stiki, pravi trenutek",
    desc: "Sistem analizira vaša interesna področja in vas poveže z udeleženci iz akademije, industrije in javne uprave, ki delijo enake strokovne cilje.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <circle cx="8" cy="16" r="1" fill="currentColor" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <circle cx="16" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
    tag: "Karierni sejem",
    title: "Razgovori brez kaosa",
    desc: "Organizacija kariernih razgovorov in raziskovalnega sejma z avtomatičnim razporejanjem srečanj glede na razpoložljive termine in prostorske zmogljivosti.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
      </svg>
    ),
    tag: "Pametno razporejanje",
    title: "Algoritem dela namesto vas",
    desc: "Napredni algoritem upošteva interese, prostost in prostorske omejitve — vsak udeleženec dobi optimiziran urnik srečanj brez trkov.",
  },
];

const STEPS = [
  { n: "01", title: "Ustvari profil", desc: "Določi svojo vlogo — akademik, strokovnjak iz industrije ali predstavnik javne uprave." },
  { n: "02", title: "Izberi interese", desc: "Označi področja, ki vas zanimajo: od umetne inteligence do trajnostnega razvoja." },
  { n: "03", title: "Sistem poveže", desc: "Confera najde ujemanja med udeleženci in predlaga srečanja z največjim potencialom." },
  { n: "04", title: "Srečaj se", desc: "Prejmite osebni urnik konference z razporejenimi srečanji, lokacijami in kontakti." },
];

export default function Home() {
  return (
    <div className="bg-white font-sans text-[#0d0d0d]" style={{ overflowX: "clip" }}>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 h-[62px] bg-white/90 backdrop-blur-md border-b border-[#f0f0f0]">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-2 h-2 rounded-full bg-[#7fa8c8]" />
          <span className="font-bold text-[17px] text-[#0d0d0d] tracking-wide">Confera</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {["Funkcije", "Kako deluje", "O projektu"].map((l) => (
            <a key={l} href="#" className="text-[13px] text-[#6e6e73] no-underline hover:text-[#0d0d0d] transition-colors">{l}</a>
          ))}
        </div>
        <Link
          href="/login"
          className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0d0d0d] text-white text-[13px] font-semibold no-underline"
        >
          Prijava
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </nav>

      {/* ── Hero (map + converging lines — unchanged logic) ── */}
      <HeroSection />

      {/* ── Features ── */}
      <section className="py-24 px-10 max-w-[1200px] mx-auto">
        <p className="text-xs font-semibold text-[#7fa8c8] tracking-[0.18em] uppercase mb-3">Funkcije</p>
        <div className="flex items-end justify-between mb-14 flex-wrap gap-4">
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight max-w-[420px]">
            Vse, kar potrebujete<br />
            <span className="text-[#7fa8c8]">za pravo srečanje.</span>
          </h2>
          <p className="text-[15px] text-[#6e6e73] leading-relaxed max-w-[340px]">
            Od pametnega ujemanja do avtomatiziranega urnika — Confera skrbi za logistiko, vi pa za vsebino.
          </p>
        </div>

        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {FEATURES.map((f, i) => (
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
      <div className="px-10"><div className="h-px bg-[#f0f0f0]" /></div>

      {/* ── How it works ── */}
      <section className="py-24 px-10 max-w-[1200px] mx-auto">
        <p className="text-xs font-semibold text-[#7fa8c8] tracking-[0.18em] uppercase mb-3">Proces</p>
        <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-tight mb-14">
          Kako deluje Confera?
        </h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {STEPS.map((s, i) => (
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
      <section className="py-24 px-10 text-center bg-[#f7f7f7]">
        <p className="text-xs font-semibold text-[#7fa8c8] tracking-[0.18em] uppercase mb-4">Pridruži se</p>
        <motion.h2
          className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight mx-auto mb-4"
          style={{ maxWidth: 720 }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          Vaša naslednja ključna<br />
          <span className="text-[#7fa8c8]">poslovna priložnost</span> čaka.
        </motion.h2>
        <p className="text-[15px] text-[#6e6e73] max-w-[400px] mx-auto mb-8 leading-relaxed">
          Registrirajte se pred konferenco in Confera poskrbi za ostalo.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="/register"
            className="flex items-center gap-1.5 px-6 py-3 rounded-full bg-[#0d0d0d] text-white text-[14px] font-semibold no-underline"
          >
            Registracija udeležencev
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="#"
            className="flex items-center gap-1.5 px-6 py-3 rounded-full border border-[#e5e7eb] bg-white text-[#3d3d3d] text-[14px] font-semibold no-underline hover:bg-[#f7f7f7] transition-colors"
          >
            Kontaktirajte nas
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="flex items-center justify-between flex-wrap gap-4 px-10 py-6 border-t border-[#f0f0f0] bg-white">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7fa8c8]" />
          <span className="font-bold text-[14px] tracking-wide">Confera</span>
        </div>
        <p className="text-[12px] text-[#8e8e93]">
          © 2026 Confera · Sistem za ciljno usmerjeno mreženje
        </p>
        <div className="flex gap-5">
          {["Zasebnost", "Pogoji", "Kontakt"].map((l) => (
            <a key={l} href="#" className="text-[12px] text-[#8e8e93] no-underline hover:text-[#0d0d0d] transition-colors">{l}</a>
          ))}
        </div>
      </footer>

    </div>
  );
}

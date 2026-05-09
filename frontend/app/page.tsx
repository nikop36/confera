"use client";

import { motion } from "framer-motion";
import HeroSection from "./components/HeroSection";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
    label: "Ciljno mreženje",
    title: "Pravi stiki, pravi trenutek",
    desc: "Sistem analizira vaša interesna področja in vas poveže z udeleženci iz akademije, industrije in javne uprave, ki delijo enake strokovne cilje.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <circle cx="8" cy="16" r="1" fill="currentColor" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <circle cx="16" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
    label: "Karierni sejem",
    title: "Razgovori brez kaosa",
    desc: "Organizacija kariernih razgovorov in raziskovalnega sejma z avtomatičnim razporejanjem srečanj glede na razpoložljive termine in prostorske zmogljivosti.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
      </svg>
    ),
    label: "Pametno razporejanje",
    title: "Algoritem dela namesto vas",
    desc: "Napredni algoritem upošteva interese, prostost in prostorske omejitve — vsak udeleženec dobi optimiziran urnik srečanj brez trkov.",
  },
];

const steps = [
  { n: "01", title: "Ustvari profil", desc: "Določi svojo vlogo — akademik, strokovnjak iz industrije ali predstavnik javne uprave." },
  { n: "02", title: "Izberi interese", desc: "Označi področja, ki vas zanimajo: od umetne inteligence do trajnostnega razvoja." },
  { n: "03", title: "Sistem poveže", desc: "Confera najde ujemanja med udeleženci in predlaga srečanja z največjim potencialom." },
  { n: "04", title: "Srečaj se", desc: "Prejmite osebni urnik konference z razporejenimi srečanji, lokacijami in kontakti." },
];

export default function Home() {
  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", overflowX: "clip" }}>

      {/* ── Fixed nav ── */}
      <nav
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.25rem 2.5rem",
          background: "rgba(7,11,15,0.7)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div className="pulse-dot" />
          <span className="font-display" style={{ fontSize: "1.4rem", fontWeight: 500, letterSpacing: "0.05em" }}>
            Confera
          </span>
        </div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {["Funkcije", "Kako deluje", "O projektu"].map((l) => (
            <a key={l} href="#" className="nav-link">{l}</a>
          ))}
        </div>
        <a href="#" className="btn-primary" style={{ fontSize: "0.78rem", padding: "0.55rem 1.4rem" }}>
          Prijava
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </nav>

      {/* ── Hero (map background + converging lines) ── */}
      <HeroSection />

      {/* ── Accent divider ── */}
      <div style={{ padding: "0 2.5rem" }}>
        <div className="accent-line" />
      </div>

      {/* ── Features ── */}
      <section style={{ padding: "7rem 2.5rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1rem" }}>
          <span className="section-label">Funkcije</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "4rem", flexWrap: "wrap", gap: "1rem" }}>
          <h2 className="font-display" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 300, lineHeight: 1.15, maxWidth: "440px" }}>
            Vse, kar potrebujete<br />
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>za pravo srečanje.</em>
          </h2>
          <p style={{ maxWidth: "340px", color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.7 }}>
            Od pametnega ujemanja do avtomatiziranega urnika — Confera skrbi za logistiko, vi pa za vsebino.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              className="glass-card feature-card"
              style={{ padding: "2rem", borderRadius: "16px" }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              viewport={{ once: true, margin: "-60px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div className="icon-box" style={{ color: "var(--accent)" }}>{f.icon}</div>
                <span className="section-label">{f.label}</span>
              </div>
              <h3 className="font-display" style={{ fontSize: "1.55rem", fontWeight: 400, marginBottom: "0.75rem", lineHeight: 1.2 }}>
                {f.title}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.75 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: "7rem 2.5rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1rem" }}>
          <span className="section-label">Proces</span>
        </div>
        <h2 className="font-display" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 300, lineHeight: 1.15, marginBottom: "4rem" }}>
          Kako deluje Confera?
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              style={{ padding: "1.5rem", paddingLeft: i === 0 ? 0 : "1.5rem", borderLeft: i === 0 ? "none" : "1px solid var(--border)" }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              viewport={{ once: true }}
            >
              <div className="step-number">{s.n}</div>
              <h3 className="font-display" style={{ fontSize: "1.35rem", fontWeight: 400, marginBottom: "0.6rem", marginTop: "0.5rem" }}>
                {s.title}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.75 }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "8rem 2.5rem", textAlign: "center", position: "relative" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "600px", height: "300px",
          background: "radial-gradient(ellipse, rgba(127,168,200,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <span className="section-label">Pridruži se</span>
        <motion.h2
          className="font-display"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)", fontWeight: 300, lineHeight: 1.05, margin: "1.25rem auto 1.5rem", maxWidth: "760px", letterSpacing: "-0.01em" }}
        >
          Vaša naslednja ključna
          <br />
          <em style={{ fontStyle: "italic", color: "var(--accent)" }}>poslovna priložnost</em> čaka.
        </motion.h2>
        <p style={{ color: "var(--text-muted)", maxWidth: "420px", margin: "0 auto 2.5rem", lineHeight: 1.75, fontSize: "0.95rem" }}>
          Registrirajte se pred konferenco in Confera poskrbi za ostalo.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#" className="btn-primary">
            Registracija udeležencev
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a href="#" className="btn-ghost">Kontaktirajte nas</a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "2rem 2.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div className="pulse-dot" style={{ width: 6, height: 6 }} />
          <span className="font-display" style={{ fontSize: "1.1rem", fontWeight: 500, letterSpacing: "0.05em" }}>Confera</span>
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
          © 2026 Confera · Sistem za ciljno usmerjeno mreženje
        </p>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {["Zasebnost", "Pogoji", "Kontakt"].map((l) => (
            <a key={l} href="#" className="nav-link" style={{ fontSize: "0.72rem" }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}

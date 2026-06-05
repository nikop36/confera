"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type maplibreglType from "maplibre-gl";
import { useT } from "../lib/i18n";

gsap.registerPlugin(ScrollTrigger);

type Coord = [number, number];

const NODES: { id: string; name: string; coords: Coord; color: string }[] = [
  { id: "lj", name: "Ljubljana", coords: [14.5058, 46.0569], color: "#2b8fd4" },
  { id: "mb", name: "Maribor",   coords: [15.6458, 46.5547], color: "#1fa86a" },
  { id: "kp", name: "Koper",     coords: [13.7294, 45.5477], color: "#8455b8" },
  { id: "kr", name: "Kranj",     coords: [14.3561, 46.2395], color: "#c84030" },
  { id: "ce", name: "Celje",     coords: [15.2677, 46.2329], color: "#c47a20" },
];

const STAGGER = 0.1;

export default function HeroSection() {
  const t = useT();
  const sectionRef  = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<HTMLDivElement>(null);
  const svgRef      = useRef<SVGSVGElement>(null);
  const pathRefs    = useRef<(SVGPathElement | null)[]>([]);
  const convDotRef  = useRef<SVGCircleElement>(null);
  const convGlowRef = useRef<SVGCircleElement>(null);
  const triggerRef  = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    if (!sectionRef.current || !mapRef.current) return;

    let map: maplibreglType.Map | null = null;
    let mounted = true;

    (async () => {
      const { default: ML } = await import("maplibre-gl");
      if (!mounted || !mapRef.current) return;

      map = new ML.Map({
        container: mapRef.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [14.75, 45.85],
        zoom: 7.8,
        interactive: false,
        attributionControl: false,
        pitchWithRotate: false,
      });

      map.on("load", () => {
        if (!mounted) return;

        map!.addSource("cities", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: NODES.map((n) => ({
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: n.coords },
              properties: { color: n.color },
            })),
          },
        });

        map!.addLayer({
          id: "city-aura",
          type: "circle",
          source: "cities",
          paint: { "circle-radius": 18, "circle-color": ["get", "color"], "circle-opacity": 0.1 },
        });

        map!.addLayer({
          id: "city-ring",
          type: "circle",
          source: "cities",
          paint: {
            "circle-radius": 8,
            "circle-color": "transparent",
            "circle-stroke-width": 1.5,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-opacity": 0.7,
          },
        });

        map!.addLayer({
          id: "city-core",
          type: "circle",
          source: "cities",
          paint: { "circle-radius": 3.5, "circle-color": ["get", "color"], "circle-opacity": 1 },
        });

        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!mounted || !mapRef.current || !map) return;

          const W = mapRef.current.clientWidth;
          const H = mapRef.current.clientHeight;

          const convX = W / 2;
          const convY = H - 16;

          convDotRef.current?.setAttribute("cx", String(convX));
          convDotRef.current?.setAttribute("cy", String(convY));
          convGlowRef.current?.setAttribute("cx", String(convX));
          convGlowRef.current?.setAttribute("cy", String(convY));

          const lengths: number[] = [];

          NODES.forEach((node, i) => {
            const px = map!.project(node.coords as maplibreglType.LngLatLike);

            const dy = convY - px.y;
            const cp1x = px.x;
            const cp1y = px.y + dy * 0.55;
            const cp2x = px.x + (convX - px.x) * 0.85;
            const cp2y = convY - dy * 0.15;

            const d = `M ${px.x} ${px.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${convX} ${convY}`;

            const path = pathRefs.current[i];
            if (!path) return;

            path.setAttribute("d", d);
            const len = path.getTotalLength();
            lengths[i] = len;
            path.style.strokeDasharray  = `${len}`;
            path.style.strokeDashoffset = `${len}`;
          });

          triggerRef.current = ScrollTrigger.create({
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5,
            onUpdate: ({ progress: p }) => {
              const band = 1 - NODES.length * STAGGER;
              pathRefs.current.forEach((path, i) => {
                if (!path || !lengths[i]) return;
                const adj = Math.max(0, Math.min(1, (p - i * STAGGER) / band));
                path.style.strokeDashoffset = `${lengths[i] * (1 - adj)}`;
              });
            },
          });
        }));
      });
    })();

    return () => {
      mounted = false;
      triggerRef.current?.kill();
      map?.remove();
    };
  }, []);

  return (
    <section ref={sectionRef} style={{ height: "150vh", position: "relative", overflow: "hidden" }}>

      {/* Map fills the full 150vh */}
      <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />

      {/* Very subtle white veil for readability without hiding the map */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "rgba(255,255,255,0.18)",
      }} />

      {/* Top-left corner fade to white */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: "42%", height: "42%",
        background: "radial-gradient(ellipse at top left, rgba(255,255,255,0.9) 0%, transparent 65%)",
        zIndex: 6, pointerEvents: "none",
      }} />

      {/* Top-right corner fade to white */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "42%", height: "42%",
        background: "radial-gradient(ellipse at top right, rgba(255,255,255,0.9) 0%, transparent 65%)",
        zIndex: 6, pointerEvents: "none",
      }} />

      {/* Bottom fade to white */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "33.333%",
        background: "linear-gradient(to bottom, transparent, #ffffff)",
        zIndex: 5, pointerEvents: "none",
      }} />

      {/* SVG overlay for converging paths */}
      <svg
        ref={svgRef}
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          zIndex: 3, pointerEvents: "none",
        }}
      >
        <circle ref={convGlowRef} r={24} fill="#7fa8c8" fillOpacity={0.12} />
        <circle ref={convDotRef}  r={4.5} fill="#1d1d1f" fillOpacity={0.55} />

        {NODES.map((node, i) => (
          <path
            key={node.id}
            ref={(el) => { pathRefs.current[i] = el; }}
            stroke={node.color}
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeOpacity={0.75}
          />
        ))}
      </svg>

      {/* Hero content: first 100vh */}
      <div style={{
        position: "relative", zIndex: 10,
        height: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "8rem 2rem 4rem",
      }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
          style={{ display: "flex", gap: "0.5rem", marginBottom: "2.5rem", flexWrap: "wrap", justifyContent: "center" }}
        >
          {[t('hero.pill.academia', 'Academia'), t('hero.pill.industry', 'Industry'), t('hero.pill.public', 'Public sector')].map((s) => (
            <span
              key={s}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.35rem 0.9rem",
                border: "1px solid rgba(127,168,200,0.35)",
                borderRadius: 99,
                background: "rgba(255,255,255,0.7)",
                fontSize: "0.75rem", color: "#7fa8c8", letterSpacing: "0.04em",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7fa8c8", display: "inline-block" }} />
              {s}
            </span>
          ))}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          style={{ fontSize: "clamp(2.6rem, 7vw, 5.5rem)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.02em", maxWidth: "820px", marginBottom: "1.5rem", color: "#0d0d0d" }}
        >
          {t('hero.title.1', 'Networking that')}{" "}
          <span style={{ color: "#7fa8c8" }}>{t('hero.title.2', 'actually')}</span>
          <br />{t('hero.title.3', 'works.')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
          style={{ fontSize: "clamp(0.95rem, 2vw, 1.1rem)", color: "#6e6e73", maxWidth: "480px", lineHeight: 1.8, marginBottom: "2.5rem" }}
        >
          {t(
            'hero.subtitle',
            'Confera connects conference participants by selected tags — automated scheduling between academia, industry, and public sector.',
          )}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.38, ease: "easeOut" }}
          style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}
        >
          <a
            href="/register"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.75rem",
              background: "#0d0d0d", color: "#ffffff",
              borderRadius: 99, fontSize: "0.85rem", fontWeight: 600,
              letterSpacing: "0.04em", textDecoration: "none",
              transition: "opacity 0.2s",
            }}
          >
            {t('hero.cta.start', 'Start free')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/login"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.75rem",
              background: "transparent", color: "#3d3d3d",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 99, fontSize: "0.85rem", letterSpacing: "0.04em",
              textDecoration: "none",
              transition: "border-color 0.2s",
            }}
          >
            {t('auth.login.submit', 'Sign in')}
          </a>
        </motion.div>

        {/* Scroll hint */}
        <div style={{
          position: "absolute", bottom: "2rem", left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          color: "#8e8e93", pointerEvents: "none",
        }}>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            {t('hero.scroll', 'Scroll down')}
          </p>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>

    </section>
  );
}

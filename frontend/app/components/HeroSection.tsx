"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type maplibreglType from "maplibre-gl";

gsap.registerPlugin(ScrollTrigger);

type Coord = [number, number];

const NODES: { id: string; name: string; coords: Coord; color: string }[] = [
  { id: "lj", name: "Ljubljana", coords: [14.5058, 46.0569], color: "#4a9ed6" },
  { id: "mb", name: "Maribor",   coords: [15.6458, 46.5547], color: "#3db87a" },
  { id: "kp", name: "Koper",     coords: [13.7294, 45.5477], color: "#a17fc8" },
  { id: "kr", name: "Kranj",     coords: [14.3561, 46.2395], color: "#e05a45" },
  { id: "ce", name: "Celje",     coords: [15.2677, 46.2329], color: "#e09a4a" },
];

// How much of total scroll each line is staggered behind the previous
const STAGGER = 0.1;

export default function HeroSection() {
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
        style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        // Center slightly south so cities sit in the upper two-thirds of the 150vh map
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
          paint: { "circle-radius": 18, "circle-color": ["get", "color"], "circle-opacity": 0.08 },
        });

        map!.addLayer({
          id: "city-ring",
          type: "circle",
          source: "cities",
          paint: {
            "circle-radius": 8,
            "circle-color": "transparent",
            "circle-stroke-width": 1,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-opacity": 0.5,
          },
        });

        map!.addLayer({
          id: "city-core",
          type: "circle",
          source: "cities",
          paint: { "circle-radius": 3.5, "circle-color": ["get", "color"], "circle-opacity": 1 },
        });

        // Double RAF: one full paint cycle after map renders so clientHeight is accurate
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!mounted || !mapRef.current || !map) return;

          const W = mapRef.current.clientWidth;
          const H = mapRef.current.clientHeight; // 150vh in real pixels

          // Convergence at the bottom of the fade zone — where the map disappears
          const convX = W / 2;
          const convY = H - 16; // 16px from the very bottom edge

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

          // Progress 0→1 as section bottom approaches viewport bottom (50vh of scroll)
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
    // 150vh section — map fills it, bottom 50vh fades to bg
    <section ref={sectionRef} style={{ height: "150vh", position: "relative", overflow: "hidden" }}>

      {/* Map: fills the entire 150vh section */}
      <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />

      {/* Subtle readability veil over the whole map */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        background: "rgba(7,11,15,0.44)",
      }} />

      {/* Top-left corner fade */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: "42%", height: "42%",
        background: "radial-gradient(ellipse at top left, rgba(7,11,15,0.88) 0%, transparent 65%)",
        zIndex: 6, pointerEvents: "none",
      }} />

      {/* Top-right corner fade */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: "42%", height: "42%",
        background: "radial-gradient(ellipse at top right, rgba(7,11,15,0.88) 0%, transparent 65%)",
        zIndex: 6, pointerEvents: "none",
      }} />

      {/* Bottom fade: last 33.3% of 150vh = 50vh, from transparent to bg */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "33.333%",
        background: "linear-gradient(to bottom, transparent, var(--bg))",
        zIndex: 5, pointerEvents: "none",
      }} />

      {/* SVG overlay: covers full 150vh so paths can reach the convergence at the bottom */}
      <svg
        ref={svgRef}
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          zIndex: 3, pointerEvents: "none",
        }}
      >
        <circle ref={convGlowRef} r={22} fill="white" fillOpacity={0.04} />
        <circle ref={convDotRef}  r={5}  fill="white" fillOpacity={0.35} />

        {NODES.map((node, i) => (
          <path
            key={node.id}
            ref={(el) => { pathRefs.current[i] = el; }}
            stroke={node.color}
            strokeWidth={1.7}
            fill="none"
            strokeLinecap="round"
            strokeOpacity={0.85}
          />
        ))}
      </svg>

      {/* Hero content: occupies the visible first 100vh */}
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
          {["Akademija", "Industrija", "Javna uprava"].map((s) => (
            <span key={s} className="stat-chip">
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              {s}
            </span>
          ))}
        </motion.div>

        <motion.h1
          className="font-display"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          style={{ fontSize: "clamp(3rem, 8vw, 7rem)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.01em", maxWidth: "880px", marginBottom: "1.5rem", color: "var(--text)" }}
        >
          Mreženje, ki{" "}
          <em style={{ fontStyle: "italic", color: "var(--accent)" }}>resnično</em>
          <br />deluje.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
          style={{ fontSize: "clamp(0.95rem, 2vw, 1.1rem)", color: "var(--text-muted)", maxWidth: "480px", lineHeight: 1.8, marginBottom: "2.5rem" }}
        >
          Confera poveže udeležence konferenc na osnovi interesnih področij —
          avtomatizirano razporejanje srečanj med akademijo, industrijo in javno upravo.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.38, ease: "easeOut" }}
          style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}
        >
          <a href="#" className="btn-primary">
            Začni brezplačno
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a href="#" className="btn-ghost">Izvedi več</a>
        </motion.div>

        {/* Scroll hint anchored to bottom of the visible 100vh area */}
        <div style={{
          position: "absolute", bottom: "2rem", left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          color: "var(--text-muted)", pointerEvents: "none",
        }}>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            Pomikajte navzdol
          </p>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>

    </section>
  );
}

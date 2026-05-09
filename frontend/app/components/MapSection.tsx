"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type maplibreglType from "maplibre-gl";

gsap.registerPlugin(ScrollTrigger);

type Coord = [number, number];

const NODES = [
  { id: "lj", name: "Ljubljana", coords: [14.5058, 46.0569] as Coord },
  { id: "mb", name: "Maribor", coords: [15.6458, 46.5547] as Coord },
  { id: "kp", name: "Koper", coords: [13.7294, 45.5477] as Coord },
  { id: "kr", name: "Kranj", coords: [14.3561, 46.2395] as Coord },
  { id: "ce", name: "Celje", coords: [15.2677, 46.2329] as Coord },
  { id: "nm", name: "Novo Mesto", coords: [15.1693, 45.7996] as Coord },
];

// Draw order matters — edges reveal one by one as you scroll
const EDGES: [string, string][] = [
  ["lj", "kr"],
  ["lj", "kp"],
  ["lj", "ce"],
  ["lj", "mb"],
  ["mb", "ce"],
  ["ce", "nm"],
];

const STEPS = 80;

function interpolate(from: Coord, to: Coord): Coord[] {
  return Array.from({ length: STEPS }, (_, i) => {
    const t = i / (STEPS - 1);
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
  });
}

function buildNodesGeoJSON() {
  return {
    type: "FeatureCollection" as const,
    features: NODES.map((n) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: n.coords },
      properties: { name: n.name },
    })),
  };
}

export default function MapSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !sectionRef.current) return;

    let map: maplibreglType.Map;
    let trigger: ScrollTrigger;

    const init = async () => {
      const { default: ML } = await import("maplibre-gl");

      map = new ML.Map({
        container: mapContainerRef.current!,
        style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        center: [14.75, 46.15],
        zoom: 8.1,
        interactive: false,
        attributionControl: false,
        pitchWithRotate: false,
      });

      const edgeCoords = EDGES.map(([fromId, toId]) => {
        const from = NODES.find((n) => n.id === fromId)!.coords;
        const to = NODES.find((n) => n.id === toId)!.coords;
        return interpolate(from, to);
      });

      map.on("load", () => {
        // ── nodes ──────────────────────────────────────────────
        map.addSource("nodes", { type: "geojson", data: buildNodesGeoJSON() });

        map.addLayer({
          id: "nodes-aura",
          type: "circle",
          source: "nodes",
          paint: {
            "circle-radius": 22,
            "circle-color": "#7fa8c8",
            "circle-opacity": 0.06,
          },
        });

        map.addLayer({
          id: "nodes-ring",
          type: "circle",
          source: "nodes",
          paint: {
            "circle-radius": 9,
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#7fa8c8",
            "circle-stroke-opacity": 0.45,
          },
        });

        map.addLayer({
          id: "nodes-core",
          type: "circle",
          source: "nodes",
          paint: {
            "circle-radius": 4,
            "circle-color": "#7fa8c8",
            "circle-opacity": 0.95,
          },
        });

        map.addLayer({
          id: "nodes-label",
          type: "symbol",
          source: "nodes",
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 11,
            "text-anchor": "top",
            "text-offset": [0, 1.1],
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#7fa8c8",
            "text-opacity": 0.65,
            "text-halo-color": "rgba(7,11,15,0.9)",
            "text-halo-width": 2,
          },
        });

        // ── lines (empty until scroll) ──────────────────────────
        map.addSource("lines", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "lines-glow",
          type: "line",
          source: "lines",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#7fa8c8",
            "line-width": 8,
            "line-opacity": 0.1,
            "line-blur": 6,
          },
        });

        map.addLayer({
          id: "lines-core",
          type: "line",
          source: "lines",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#7fa8c8",
            "line-width": 1.5,
            "line-opacity": 0.75,
          },
        });

        // ── GSAP scroll scrub ───────────────────────────────────
        trigger = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          onUpdate: ({ progress: p }) => {
            const N = EDGES.length;
            const features = edgeCoords.flatMap((coords, i) => {
              // Each edge occupies 1/N of the total scroll range
              const ep = Math.max(0, Math.min(1, (p - i / N) / (1 / N)));
              if (ep === 0) return [];
              const count = Math.max(2, Math.round(ep * coords.length));
              return [
                {
                  type: "Feature" as const,
                  geometry: {
                    type: "LineString" as const,
                    coordinates: coords.slice(0, count),
                  },
                  properties: {},
                },
              ];
            });

            (map.getSource("lines") as maplibreglType.GeoJSONSource).setData({
              type: "FeatureCollection",
              features,
            });
          },
        });
      });
    };

    init();

    return () => {
      trigger?.kill();
      map?.remove();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{ height: "250vh", position: "relative" }}
      aria-label="Mreža konferenc"
    >
      {/* Sticky viewport — map + overlay live here */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          overflow: "hidden",
        }}
      >
        {/* MapLibre canvas */}
        <div
          ref={mapContainerRef}
          style={{ position: "absolute", inset: 0 }}
        />

        {/* Top gradient fade (blends map into page) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "120px",
            background: "linear-gradient(to bottom, var(--bg), transparent)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />

        {/* Bottom gradient fade */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "120px",
            background: "linear-gradient(to top, var(--bg), transparent)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />

        {/* Text overlay — bottom-left */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          viewport={{ once: true }}
          style={{
            position: "absolute",
            bottom: "4rem",
            left: "3rem",
            zIndex: 20,
            maxWidth: "360px",
            pointerEvents: "none",
          }}
        >
          <span className="section-label">Mreža udeležencev</span>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
              fontWeight: 300,
              lineHeight: 1.15,
              margin: "0.65rem 0 0.75rem",
              color: "var(--text)",
            }}
          >
            Confera deluje{" "}
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>
              povsod
            </em>{" "}
            <br />
            po Sloveniji.
          </h2>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              lineHeight: 1.75,
            }}
          >
            Pomikajte se navzdol in opazujte, kako sistem gradi mrežo med
            akademijo, industrijo in javno upravo.
          </p>
        </motion.div>

        {/* Scroll progress hint — bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: "4rem",
            right: "3rem",
            zIndex: 20,
            pointerEvents: "none",
            textAlign: "right",
          }}
        >
          <p
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Premikajte navzdol
          </p>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{
              marginTop: "0.4rem",
              marginLeft: "auto",
              color: "var(--text-muted)",
            }}
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
}

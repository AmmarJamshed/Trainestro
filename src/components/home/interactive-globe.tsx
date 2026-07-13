"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { useRouter } from "next/navigation";
import { SUPPORTED_COUNTRIES } from "@/lib/constants";
import { trackUsageEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { CountryDensity } from "@/components/home/training-world-map";

/** Accurate geographic centres (approx. capital / national midpoint). */
const GEO: Record<string, { lat: number; lng: number; short: string }> = {
  US: { lat: 38.9072, lng: -77.0369, short: "USA" }, // Washington, D.C.
  GB: { lat: 51.5074, lng: -0.1278, short: "UK" }, // London
  AE: { lat: 25.2048, lng: 55.2708, short: "UAE" }, // Dubai
  PK: { lat: 33.6844, lng: 73.0479, short: "PK" }, // Islamabad
};

type GlobePoint = {
  code: string;
  lat: number;
  lng: number;
  short: string;
  label: string;
  count: number;
  radius: number;
  color: string;
};

/** NASA Blue Marble — blue oceans + natural land colours (local for reliability). */
const EARTH_BLUE_MARBLE = "/globe/earth-blue-marble.jpg";
const EARTH_TOPOLOGY = "/globe/earth-topology.png";

function pointRadius(count: number, max: number) {
  if (max <= 0) return 0.55;
  return 0.45 + (count / max) * 1.15;
}

export function InteractiveGlobe({
  densities,
  hover,
  onHover,
}: {
  densities: CountryDensity[];
  hover: string | null;
  onHover: (code: string | null) => void;
}) {
  const router = useRouter();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 420 });
  const [ready, setReady] = useState(false);

  const max = Math.max(1, ...densities.map((d) => d.count));
  const byCode = useMemo(
    () => new Map(densities.map((d) => [d.code, d])),
    [densities]
  );

  const points = useMemo<GlobePoint[]>(() => {
    return SUPPORTED_COUNTRIES.map((c) => {
      const geo = GEO[c.code];
      const d = byCode.get(c.code);
      const count = d?.count ?? 0;
      const active = hover === c.code;
      return {
        code: c.code,
        lat: geo.lat,
        lng: geo.lng,
        short: geo.short,
        label: `${geo.short} · ${count}`,
        count,
        radius: pointRadius(count, max) * (active ? 1.25 : 1),
        // High-contrast pins so markers stay readable on blue oceans / green land
        color: active ? "#fbbf24" : count > 0 ? "#ef4444" : "#94a3b8",
      };
    });
  }, [byCode, hover, max]);

  const go = useCallback(
    (code: string) => {
      trackUsageEvent({
        event_type: "filter",
        country_code: code,
      });
      router.push(`/search?country=${encodeURIComponent(code)}`);
    },
    [router]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(280, Math.floor(rect.width));
      const h = Math.max(300, Math.min(520, Math.floor(w * 0.72)));
      setSize({ w, h });
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g || !ready) return;
    // Start facing South Asia / Middle East (between PK & AE)
    g.pointOfView({ lat: 28, lng: 55, altitude: 2.05 }, 0);
  }, [ready]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g || !hover) return;
    const geo = GEO[hover];
    if (!geo) return;
    g.pointOfView({ lat: geo.lat, lng: geo.lng, altitude: 1.65 }, 900);
  }, [hover]);

  // Gentle auto-rotate when idle
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !ready) return;
    const controls = g.controls();
    controls.autoRotate = !hover;
    controls.autoRotateSpeed = 0.45;
    controls.enableZoom = true;
    controls.minDistance = 140;
    controls.maxDistance = 420;
  }, [hover, ready]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full overflow-hidden rounded-xl"
      style={{ height: size.h }}
    >
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#070b16]/40">
          <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--portal)]/25" />
        </div>
      )}
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={EARTH_BLUE_MARBLE}
        bumpImageUrl={EARTH_TOPOLOGY}
        atmosphereColor="#7dd3fc"
        atmosphereAltitude={0.22}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.012}
        pointRadius="radius"
        pointColor="color"
        pointLabel={(d) => {
          const p = d as GlobePoint;
          return `<div style="padding:6px 10px;border-radius:10px;background:rgba(7,11,22,0.92);border:1px solid rgba(251,191,36,0.45);color:#fff;font:600 12px/1.3 Outfit,sans-serif">${p.short}<br/><span style="color:#94a3b8;font-weight:500">${p.count} live trainings</span></div>`;
        }}
        onPointHover={(d) => onHover(d ? (d as GlobePoint).code : null)}
        onPointClick={(d) => {
          if (!d) return;
          go((d as GlobePoint).code);
        }}
        labelsData={points}
        labelLat="lat"
        labelLng="lng"
        labelText={(d) => (d as GlobePoint).short}
        labelSize={1.5}
        labelDotRadius={0}
        labelColor={() => "rgba(255,255,255,0.95)"}
        labelAltitude={0.035}
        labelResolution={2}
        ringsData={points.filter((p) => p.count > 0)}
        ringLat="lat"
        ringLng="lng"
        ringColor={() => "rgba(239,68,68,0.5)"}
        ringMaxRadius={2.8}
        ringPropagationSpeed={2.2}
        ringRepeatPeriod={1400}
        onGlobeReady={() => setReady(true)}
      />
      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-slate-500">
        Drag to spin · pinch/scroll to zoom · tap a marker to browse
      </p>
    </div>
  );
}

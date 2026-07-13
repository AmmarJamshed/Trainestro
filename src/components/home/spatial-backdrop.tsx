"use client";

import { useEffect, useRef } from "react";

export function SpatialBackdrop({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    function onMove(e: PointerEvent) {
      if (!el) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 8;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`spatial-backdrop pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div className="spatial-aurora" />
      <div className="spatial-orb spatial-orb-a" />
      <div className="spatial-orb spatial-orb-b" />
      <div className="spatial-orb spatial-orb-c" />
      <div className="spatial-floor" />
      <div className="spatial-particles" />
    </div>
  );
}

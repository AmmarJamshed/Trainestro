"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_COUNTRIES } from "@/lib/constants";
import { trackUsageEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export type CountryDensity = {
  code: string;
  label: string;
  count: number;
};

const SHORT: Record<string, string> = {
  US: "USA",
  GB: "UK",
  AE: "UAE",
  PK: "PK",
  SA: "SA",
  BH: "BH",
  QA: "QA",
  OM: "OM",
  DE: "DE",
  FR: "FR",
  CZ: "CZ",
  NL: "NL",
  CA: "CA",
  JP: "JP",
  MY: "MY",
  SG: "SG",
};

const InteractiveGlobe = dynamic(
  () =>
    import("@/components/home/interactive-globe").then((m) => m.InteractiveGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center sm:h-[420px]">
        <div className="h-28 w-28 animate-pulse rounded-full bg-[var(--portal)]/15 ring-1 ring-[var(--portal)]/25" />
      </div>
    ),
  }
);

export function TrainingWorldMap({
  densities,
  className,
}: {
  densities: CountryDensity[];
  className?: string;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const byCode = new Map(densities.map((d) => [d.code, d]));

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

  return (
    <section
      className={cn("glass-panel overflow-hidden rounded-2xl", className)}
      aria-label="Interactive globe of training locations"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/8 px-4 py-4 sm:px-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-white sm:text-2xl">
            Explore by country
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Spin the globe and tap a marker to browse live trainings
          </p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {SUPPORTED_COUNTRIES.map((c) => {
            const d = byCode.get(c.code);
            const active = hover === c.code;
            return (
              <li key={c.code}>
                <button
                  type="button"
                  onMouseEnter={() => setHover(c.code)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(c.code)}
                  onBlur={() => setHover(null)}
                  onClick={() => go(c.code)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    active
                      ? "border-[var(--portal)]/50 bg-[var(--portal)]/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-[var(--portal)]/35 hover:text-white"
                  )}
                >
                  {SHORT[c.code] ?? c.code}
                  <span className="ml-1.5 tabular-nums text-slate-400">
                    {d?.count ?? 0}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.12),transparent_65%)] px-1 pb-2 pt-1 sm:px-2">
        <InteractiveGlobe
          densities={densities}
          hover={hover}
          onHover={setHover}
        />
      </div>
    </section>
  );
}

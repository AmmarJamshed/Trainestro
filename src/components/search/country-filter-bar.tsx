"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_COUNTRIES } from "@/lib/constants";
import { trackUsageEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const SHORT_LABELS: Record<string, string> = {
  PK: "Pakistan",
  AE: "UAE",
  US: "USA",
  GB: "UK",
};

export function CountryFilterBar({
  counts,
  className,
}: {
  counts?: Record<string, number>;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const selected = (params.get("country") ?? "").toUpperCase();

  const hrefFor = useCallback(
    (code: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!code) next.delete("country");
      else next.set("country", code);
      // Reset city when country changes
      next.delete("city");
      const qs = next.toString();
      const base = pathname.startsWith("/search") ? "/search" : "/search";
      return qs ? `${base}?${qs}` : base;
    },
    [params, pathname]
  );

  const select = useCallback(
    (code: string | null) => {
      trackUsageEvent({
        event_type: "filter",
        country_code: code,
        category: params.get("category"),
        delivery_mode: params.get("delivery"),
        query_text: params.get("q"),
      });
      startTransition(() => {
        router.push(hrefFor(code));
      });
    },
    [hrefFor, params, router]
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        pending && "opacity-70",
        className
      )}
      role="group"
      aria-label="Filter by country"
    >
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--portal)]">
        Country
      </span>
      <button
        type="button"
        onClick={() => select(null)}
        className={cn(
          "rounded-full border px-3 py-1.5 text-xs transition",
          !selected
            ? "border-[var(--portal)]/50 bg-[var(--portal)]/15 text-white"
            : "border-white/10 bg-white/5 text-slate-300 hover:border-[var(--portal)]/40 hover:text-white"
        )}
      >
        All
      </button>
      {SUPPORTED_COUNTRIES.map((c) => {
        const active = selected === c.code;
        const count = counts?.[c.code];
        return (
          <button
            key={c.code}
            type="button"
            onClick={() => select(c.code)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
              active
                ? "border-[var(--portal)]/50 bg-[var(--portal)]/15 text-white"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-[var(--portal)]/40 hover:text-white"
            )}
            aria-pressed={active}
          >
            <span>{SHORT_LABELS[c.code] ?? c.label}</span>
            {typeof count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  active ? "bg-white/15 text-white" : "bg-white/10 text-slate-400"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
      {/* Prefetch-friendly fallback links for no-JS */}
      <span className="sr-only">
        {SUPPORTED_COUNTRIES.map((c) => (
          <Link key={c.code} href={`/search?country=${c.code}`}>
            {c.label}
          </Link>
        ))}
      </span>
    </div>
  );
}

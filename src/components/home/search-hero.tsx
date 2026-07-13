"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trackUsageEvent } from "@/lib/analytics";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { TrainestroMark } from "@/components/brand/trainestro-logo";
import { SpatialBackdrop } from "@/components/home/spatial-backdrop";
import Link from "next/link";

const HERO_LOGOS = [
  { src: "/providers/nibaf.jpg", alt: "NIBAF" },
  { src: "/providers/iba-cee.svg", alt: "IBA CEE" },
  { src: "/providers/nust.png", alt: "NUST" },
  { src: "/providers/gdg.svg", alt: "GDG" },
  { src: "/providers/microsoft.svg", alt: "Microsoft" },
  { src: "/providers/ibm.svg", alt: "IBM" },
  { src: "/providers/oracle.svg", alt: "Oracle" },
  { src: "/providers/atomcamp.svg", alt: "atomcamp" },
  { src: "/providers/aidatayard.png", alt: "AI DataYard" },
  { src: "/providers/lrc.png", alt: "LRC" },
  { src: "/providers/pixelart.svg", alt: "PixelArt" },
];
export function SearchHero() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    const query = q.trim();
    if (query) params.set("q", query);
    trackUsageEvent({
      event_type: "search",
      query_text: query || null,
    });
    router.push(`/search?${params.toString()}`);
  }

  return (
    <section className="relative min-h-[88vh] overflow-hidden">
      <SpatialBackdrop />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-22 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="text-left">
          <div className="mb-6 inline-flex animate-in fade-in zoom-in-95 fill-mode-both items-center gap-3 duration-700">
            <div className="relative">
              <div className="portal-pulse absolute -inset-3 rounded-3xl bg-[var(--portal)]/20 blur-md" />
              <TrainestroMark className="relative h-14 w-14 sm:h-16 sm:w-16" />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--portal)]/30 bg-[var(--portal)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--portal)]">
              <Sparkles className="h-3.5 w-3.5" />
              Live training portal
            </span>
          </div>

          <h1 className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both font-[family-name:var(--font-display)] text-5xl tracking-tight text-white duration-700 sm:text-6xl lg:text-[4.4rem] lg:leading-[1.02]">
            {SITE_NAME}
          </h1>
          <p className="mt-4 max-w-lg animate-in fade-in slide-in-from-bottom-4 fill-mode-both text-lg text-slate-300 duration-700 delay-100">
            {SITE_TAGLINE}. Browse live sessions from banks, universities, and
            developer communities — then enroll on their official pages.
          </p>

          <form
            onSubmit={onSubmit}
            className={`glass-panel mt-9 flex w-full max-w-xl animate-in fade-in zoom-in-95 fill-mode-both items-center gap-2 rounded-2xl p-2 transition duration-300 delay-150 ${
              focused ? "portal-ring" : ""
            }`}
          >
            <Search className="ml-3 h-5 w-5 shrink-0 text-[var(--portal)]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Enter a skill, city, or institution…"
              className="h-12 border-0 bg-transparent text-base text-white shadow-none placeholder:text-slate-400 focus-visible:ring-0"
              aria-label="Search trainings"
            />
            <Button
              type="submit"
              size="lg"
              className="h-12 rounded-xl bg-gradient-to-r from-[var(--brand)] to-cyan-400 px-5 font-semibold text-white hover:opacity-95"
            >
              Enter
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            {(
              [
                { label: "Online", href: "/search?delivery=online", delivery: "online" as const },
                { label: "Onsite", href: "/search?delivery=onsite", delivery: "onsite" as const },
                { label: "AI & data", href: "/search?category=AI", category: "AI" },
                { label: "Free sessions", href: "/search?price=free" },
              ] as const
            ).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() =>
                  trackUsageEvent({
                    event_type: "filter",
                    delivery_mode: "delivery" in item ? item.delivery : null,
                    category: "category" in item ? item.category : null,
                  })
                }
                className="inline-flex items-center gap-1 transition hover:text-[var(--portal)]"
              >
                {item.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-right-4 fill-mode-both duration-700 delay-100 [perspective:1200px]">
          <div className="glass-panel relative overflow-hidden rounded-[1.75rem] p-5 transition duration-500 hover:rotate-y-2">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--portal)]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-[var(--brand)]/30 blur-3xl" />
            <p className="relative mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--portal)]">
              Institution portals
            </p>
            <div className="relative grid grid-cols-4 gap-3">
              {HERO_LOGOS.map((logo, i) => (
                <div
                  key={logo.alt}
                  className="logo-float flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-white/95 p-2 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.55)] transition hover:-translate-y-1 hover:border-[var(--portal)]/50 hover:shadow-[0_0_24px_-6px_var(--portal)]"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={64}
                    height={64}
                    unoptimized={logo.src.endsWith(".svg")}
                    className="h-full w-full rounded-xl object-contain p-1"
                  />
                </div>
              ))}
            </div>
            <p className="relative mt-4 text-center text-xs text-slate-400">
              Tap a partner below to jump into their live trainings
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

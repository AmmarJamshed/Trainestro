"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SITE_NAME, SITE_TAGLINE, QUICK_FILTERS, POPULAR_CATEGORIES } from "@/lib/constants";
import Link from "next/link";

export function SearchHero() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/search?${params.toString()}`);
  }

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in oklab, var(--brand) 18%, transparent), transparent 70%), linear-gradient(180deg, color-mix(in oklab, var(--brand-soft) 55%, transparent), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230b3d4a' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
        <p className="mb-4 animate-in fade-in slide-in-from-bottom-2 fill-mode-both text-xs font-medium uppercase tracking-[0.2em] text-[var(--brand)] duration-700">
          Pakistan · Live only
        </p>
        <h1 className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both font-[family-name:var(--font-display)] text-5xl tracking-tight text-foreground duration-700 sm:text-6xl">
          {SITE_NAME}
        </h1>
        <p className="mt-4 max-w-xl animate-in fade-in slide-in-from-bottom-4 fill-mode-both text-base text-muted-foreground duration-700 delay-100 sm:text-lg">
          {SITE_TAGLINE}
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-10 flex w-full animate-in fade-in zoom-in-95 fill-mode-both items-center gap-2 rounded-2xl border border-border/80 bg-background/90 p-2 shadow-[0_20px_60px_-30px_rgba(11,61,74,0.45)] backdrop-blur duration-700 delay-150"
        >
          <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search training, skill, provider, or city…"
            className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            aria-label="Search trainings"
          />
          <Button type="submit" size="lg" className="h-12 rounded-xl px-6 bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]">
            Search
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {QUICK_FILTERS.map((f) => (
            <Link
              key={f.id}
              href={`/search?${f.param}=${f.value}`}
              className="rounded-full border border-border/80 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-[var(--brand)]/40 hover:text-foreground"
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {POPULAR_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/search?category=${encodeURIComponent(cat)}`}
              className="rounded-md px-2.5 py-1 text-sm text-[var(--brand)] underline-offset-4 transition hover:underline"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

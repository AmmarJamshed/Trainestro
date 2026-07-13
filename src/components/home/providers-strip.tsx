"use client";

import Link from "next/link";
import type { Provider } from "@/lib/types";
import { ProviderLogo } from "@/components/providers/provider-logo";

export function ProvidersStrip({ providers }: { providers: Provider[] }) {
  const list = [...providers].sort((a, b) => b.reputation_score - a.reputation_score);

  return (
    <section className="relative py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--portal)]/40 to-transparent" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-7 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--portal)]">
              Training partners
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-white sm:text-2xl">
              Jump into institution portals
            </h2>
          </div>
          <p className="text-sm text-slate-400">
            {list.length} active providers · live sessions only
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {list.map((provider, i) => (
            <Link
              key={provider.id}
              href={`/search?provider=${encodeURIComponent(provider.slug)}`}
              className="group glass-panel flex flex-col items-center gap-2.5 rounded-2xl px-3 py-4 text-center transition duration-300 hover:-translate-y-1.5 hover:border-[var(--portal)]/40"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <ProviderLogo
                name={provider.name}
                logoUrl={provider.logo_url}
                slug={provider.slug}
                size={56}
                className="transition duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_-6px_var(--portal)]"
              />
              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-slate-400 transition group-hover:text-white">
                {provider.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

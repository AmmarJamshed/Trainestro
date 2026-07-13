import Link from "next/link";
import { Suspense } from "react";
import { SearchHero } from "@/components/home/search-hero";
import { ProvidersStrip } from "@/components/home/providers-strip";
import { TrainingWorldMap } from "@/components/home/training-world-map";
import { CountryFilterBar } from "@/components/search/country-filter-bar";
import { TrainingCard } from "@/components/training/training-card";
import { QUICK_FILTERS } from "@/lib/constants";
import {
  getAnalytics,
  getCountryDensity,
  getProviders,
  getTrainings,
} from "@/lib/data/trainings";

export default async function HomePage() {
  const [upcoming, analytics, providers, countries] = await Promise.all([
    getTrainings({ sort: "soonest" }),
    getAnalytics(),
    getProviders(),
    getCountryDensity(),
  ]);

  const counts = Object.fromEntries(countries.map((c) => [c.code, c.count]));

  return (
    <>
      <SearchHero />
      <ProvidersStrip providers={providers} />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <TrainingWorldMap
          densities={countries.map((c) => ({
            code: c.code,
            label: c.name,
            count: c.count,
          }))}
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
        <div className="glass-panel space-y-3 rounded-2xl p-4">
          <Suspense fallback={<div className="h-9 animate-pulse rounded-full bg-muted" />}>
            <CountryFilterBar counts={counts} />
          </Suspense>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
            <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Quick filters
            </span>
            {QUICK_FILTERS.map((f) => (
              <Link
                key={f.id}
                href={`/search?${f.param}=${f.value}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-[var(--portal)]/40 hover:bg-[var(--portal)]/10 hover:text-white"
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          <span className="font-semibold text-white">{analytics.liveTrainings}</span>{" "}
          live trainings from{" "}
          <span className="font-semibold text-white">{analytics.providers}</span>{" "}
          providers
          {analytics.cities[0]?.name
            ? ` · most listed in ${analytics.cities[0].name}`
            : ""}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-white sm:text-3xl">
              Upcoming in the portal
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Instructor-led sessions with public registration
            </p>
          </div>
          <Link
            href="/search"
            className="text-sm font-medium text-[var(--portal)] hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="glass-panel overflow-hidden rounded-2xl px-3 sm:px-6">
          {upcoming.slice(0, 8).map((t) => (
            <TrainingCard key={t.id} training={t} />
          ))}
          {!upcoming.length && (
            <p className="py-10 text-center text-sm text-slate-400">
              No upcoming trainings yet. Run scrapers to populate listings.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

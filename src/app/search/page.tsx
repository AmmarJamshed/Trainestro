import { Suspense } from "react";
import type { Metadata } from "next";
import { CountryFilterBar } from "@/components/search/country-filter-bar";
import { SearchFilters } from "@/components/search/search-filters";
import { TrainingCard } from "@/components/training/training-card";
import { getCountryDensity, getProviders, getTrainings } from "@/lib/data/trainings";
import type { DeliveryMode, SearchFilters as Filters } from "@/lib/types";

export const metadata: Metadata = {
  title: "Search live trainings",
  description:
    "Filter upcoming instructor-led trainings in Pakistan, UAE, USA, and UK by country, city, provider, category, price, and delivery mode.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filters: Filters = {
    q: first(sp.q),
    provider: first(sp.provider),
    country: first(sp.country),
    city: first(sp.city),
    province: first(sp.province),
    category: first(sp.category),
    delivery: (first(sp.delivery) as DeliveryMode | undefined) || "",
    price: (first(sp.price) as "free" | "paid" | undefined) || "",
    date:
      (first(sp.date) as "this_week" | "next_week" | "this_month" | undefined) ||
      "",
    sort: (first(sp.sort) as "soonest" | "latest" | "price_asc" | undefined) || "soonest",
  };

  const [trainings, providers, countries] = await Promise.all([
    getTrainings(filters),
    getProviders(),
    getCountryDensity(),
  ]);

  const counts = Object.fromEntries(countries.map((c) => [c.code, c.count]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-white sm:text-3xl">
          Browse the portal
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {trainings.length} upcoming live session{trainings.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
          <div className="glass-panel order-2 rounded-2xl p-1 lg:order-1 lg:sticky lg:top-20 lg:self-start">
            <SearchFilters providers={providers} />
          </div>
        </Suspense>

        <div className="order-1 space-y-4 lg:order-2">
          <div className="glass-panel rounded-2xl p-3 sm:p-4">
            <Suspense fallback={<div className="h-9 animate-pulse rounded-full bg-muted" />}>
              <CountryFilterBar counts={counts} />
            </Suspense>
          </div>

          <div className="glass-panel overflow-hidden rounded-2xl px-3 sm:px-6">
            {trainings.map((t) => (
              <TrainingCard key={t.id} training={t} />
            ))}
            {!trainings.length && (
              <p className="py-16 text-center text-sm text-slate-400">
                No trainings match these filters. Try clearing a filter or searching a
                different skill.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

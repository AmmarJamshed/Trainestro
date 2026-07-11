import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchFilters } from "@/components/search/search-filters";
import { TrainingCard } from "@/components/training/training-card";
import { getProviders, getTrainings } from "@/lib/data/trainings";
import type { DeliveryMode, SearchFilters as Filters } from "@/lib/types";

export const metadata: Metadata = {
  title: "Search live trainings",
  description:
    "Filter upcoming instructor-led trainings in Pakistan by city, provider, category, price, and delivery mode.",
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

  const [trainings, providers] = await Promise.all([
    getTrainings(filters),
    getProviders(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-foreground">
          Search trainings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {trainings.length} upcoming live session{trainings.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-muted" />}>
          <SearchFilters providers={providers} />
        </Suspense>

        <div className="rounded-2xl border border-border/70 bg-background/60 px-4 sm:px-6">
          {trainings.map((t) => (
            <TrainingCard key={t.id} training={t} />
          ))}
          {!trainings.length && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No trainings match these filters. Try clearing a filter or searching a
              different skill.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

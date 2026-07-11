import Link from "next/link";
import { SearchHero } from "@/components/home/search-hero";
import { TrainingCard } from "@/components/training/training-card";
import { getTrainings, getAnalytics } from "@/lib/data/trainings";

export default async function HomePage() {
  const [upcoming, analytics] = await Promise.all([
    getTrainings({ sort: "soonest" }),
    getAnalytics(),
  ]);

  return (
    <>
      <SearchHero />

      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Live trainings" value={analytics.liveTrainings} />
          <Stat label="Active providers" value={analytics.providers} />
          <Stat
            label="Top city"
            value={analytics.cities[0]?.name ?? "—"}
            isText
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
              Upcoming soon
            </h2>
            <p className="text-sm text-muted-foreground">
              Instructor-led sessions with public registration
            </p>
          </div>
          <Link
            href="/search"
            className="text-sm text-[var(--brand)] hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-border/70 rounded-2xl border border-border/70 bg-background/60 px-4 sm:px-6">
          {upcoming.slice(0, 8).map((t) => (
            <TrainingCard key={t.id} training={t} />
          ))}
          {!upcoming.length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No upcoming trainings yet. Run scrapers to populate listings.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  isText,
}: {
  label: string;
  value: string | number;
  isText?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-display)] ${isText ? "text-xl" : "text-3xl"} text-foreground`}
      >
        {value}
      </p>
    </div>
  );
}

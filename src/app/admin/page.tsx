import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/login-form";
import { AdminActions } from "@/components/admin/admin-actions";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAnalytics, getProviders, getScrapeLogs } from "@/lib/data/trainings";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) return <AdminLoginForm />;

  const [analytics, providers, logs] = await Promise.all([
    getAnalytics(),
    getProviders(),
    getScrapeLogs(40),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Admin dashboard
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage providers, scrapers, and live training analytics.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Live trainings" value={analytics.liveTrainings} />
        <Metric label="Providers" value={analytics.providers} />
        <Metric
          label="Top city"
          value={analytics.cities[0]?.name ?? "—"}
        />
        <Metric
          label="Top category"
          value={analytics.categories[0]?.name ?? "—"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Most active cities">
          {analytics.cities.map((c) => (
            <Row key={c.name} label={c.name} value={String(c.count)} />
          ))}
          {!analytics.cities.length && <Empty />}
        </Panel>
        <Panel title="Popular categories">
          {analytics.categories.map((c) => (
            <Row key={c.name} label={c.name} value={String(c.count)} />
          ))}
          {!analytics.categories.length && <Empty />}
        </Panel>
      </div>

      <div className="mt-8">
        <Panel title="Recently added">
          {analytics.recentlyAdded.map((t) => (
            <Row
              key={t.id}
              label={t.title}
              value={t.start_date}
            />
          ))}
          {!analytics.recentlyAdded.length && <Empty />}
        </Panel>
      </div>

      <div className="mt-10">
        <AdminActions providers={providers} logs={logs} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 p-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="truncate text-foreground">{label}</span>
      <span className="shrink-0 text-muted-foreground">{value}</span>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">No data yet.</p>;
}

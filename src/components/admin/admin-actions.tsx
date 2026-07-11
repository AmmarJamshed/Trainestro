"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Provider, ScrapeLog } from "@/lib/types";

export function AdminActions({
  providers,
  logs,
}: {
  providers: Provider[];
  logs: ScrapeLog[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshAll() {
    setBusy(true);
    setMessage("Running scrapers…");
    const res = await fetch("/api/admin/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Scrape failed");
      return;
    }
    setMessage(
      `Done: ${data.summaries?.length ?? 0} providers processed. Check logs below.`
    );
    router.refresh();
  }

  async function toggleProvider(id: string, enabled: boolean) {
    const res = await fetch("/api/admin/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, scraper_enabled: enabled }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "Update failed");
      return;
    }
    router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={refreshAll} disabled={busy}>
          {busy ? "Refreshing…" : "Manually refresh data"}
        </Button>
        <Button variant="outline" onClick={logout}>
          Sign out
        </Button>
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Providers
        </h2>
        <div className="mt-3 divide-y rounded-2xl border border-border/70">
          {providers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.scraper_key} · {p.city ?? "—"} ·{" "}
                  <a
                    href={p.website}
                    className="text-[var(--brand)] hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    site
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {p.scraper_enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={p.scraper_enabled}
                  onCheckedChange={(v) => toggleProvider(p.id, Boolean(v))}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Scraper logs
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border/70">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Scraper</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Found</th>
                <th className="px-3 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border/50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(log.started_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{log.scraper_key}</td>
                  <td className="px-3 py-2 capitalize">{log.status}</td>
                  <td className="px-3 py-2">{log.trainings_found}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {log.error_details || log.message}
                  </td>
                </tr>
              ))}
              {!logs.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No scrape logs yet. Run a manual refresh or weekly workflow.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {logs.some((l) => l.status === "failed") && (
          <p className="mt-2 text-sm text-destructive">
            Some scrapers failed — remaining providers still continue on each run.
          </p>
        )}
      </section>
    </div>
  );
}

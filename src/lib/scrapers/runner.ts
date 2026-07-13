import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { SEED_PROVIDERS, SEED_TRAININGS } from "@/lib/data/seed";
import { getScraper, getAllScrapers } from "@/lib/scrapers/registry";
import { makeSourceHash, makeTrainingSlug } from "@/lib/scrapers/utils";
import { createServiceRoleClient, hasSupabaseEnv } from "@/lib/supabase/admin";
import type { Provider, ScrapedTraining, ScrapeLog, Training } from "@/lib/types";

export interface RunSummary {
  scraperKey: string;
  status: "success" | "partial" | "failed";
  found: number;
  created: number;
  updated: number;
  archived: number;
  warnings: string[];
  error?: string;
}

function currencyForCountry(countryCode: string | null | undefined, fallback = "PKR") {
  switch ((countryCode || "").toUpperCase()) {
    case "AE":
      return "AED";
    case "US":
      return "USD";
    case "GB":
      return "GBP";
    case "PK":
      return "PKR";
    default:
      return fallback;
  }
}

function toTraining(
  provider: Provider,
  item: ScrapedTraining,
  existing?: Training
): Training {
  const now = new Date().toISOString();
  const source_hash = makeSourceHash(
    provider.id,
    item.title,
    item.start_date,
    item.registration_url
  );
  const country_code = item.country_code || provider.country_code || "PK";
  return {
    id: existing?.id ?? randomUUID(),
    provider_id: provider.id,
    slug: existing?.slug ?? makeTrainingSlug(item.title, item.start_date),
    title: item.title,
    description: item.description ?? null,
    instructor: item.instructor ?? null,
    category: item.category ?? null,
    skill_tags: item.skill_tags ?? [],
    city: item.city ?? provider.city,
    province: item.province ?? provider.province,
    venue: item.venue ?? null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    delivery_mode: item.delivery_mode,
    start_date: item.start_date,
    end_date: item.end_date ?? null,
    duration: item.duration ?? null,
    registration_deadline: item.registration_deadline ?? null,
    price: item.price ?? null,
    currency: item.currency ?? currencyForCountry(country_code),
    is_free: item.is_free ?? false,
    certificate_available: item.certificate_available ?? false,
    registration_url: item.registration_url,
    image_url: item.image_url ?? null,
    contact_info: item.contact_info ?? provider.contact_email,
    status: "upcoming",
    source_hash,
    country_code,
    last_scraped_at: now,
    last_updated_at: now,
    created_at: existing?.created_at ?? now,
  };
}

async function archiveExpired(trainings: Training[]): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  let archived = 0;
  for (const t of trainings) {
    const end = t.end_date ?? t.start_date;
    if (end < today && t.status === "upcoming") {
      t.status = "completed";
      t.last_updated_at = new Date().toISOString();
      archived += 1;
    }
  }
  return archived;
}

async function upsertLocal(
  provider: Provider,
  scraped: ScrapedTraining[]
): Promise<{ created: number; updated: number; archived: number; trainings: Training[] }> {
  const dataDir = path.join(process.cwd(), "data");
  await mkdir(dataDir, { recursive: true });

  let trainings: Training[] = [...SEED_TRAININGS];
  try {
    const { readFile } = await import("fs/promises");
    const raw = await readFile(path.join(dataDir, "trainings.json"), "utf8");
    trainings = JSON.parse(raw) as Training[];
  } catch {
    // seed fallback
  }

  let created = 0;
  let updated = 0;

  for (const item of scraped) {
    const hash = makeSourceHash(
      provider.id,
      item.title,
      item.start_date,
      item.registration_url
    );
    const existing = trainings.find(
      (t) => t.provider_id === provider.id && t.source_hash === hash
    );
    const next = toTraining(provider, item, existing);
    if (existing) {
      Object.assign(existing, next, { id: existing.id, slug: existing.slug, created_at: existing.created_at });
      updated += 1;
    } else {
      const slugConflict = trainings.some((t) => t.slug === next.slug);
      if (slugConflict) next.slug = `${next.slug}-${next.id.slice(0, 6)}`;
      trainings.push(next);
      created += 1;
    }
  }

  // Drop stale upcoming rows for this provider that were not in the latest scrape
  const keepHashes = new Set(
    scraped.map((item) =>
      makeSourceHash(provider.id, item.title, item.start_date, item.registration_url)
    )
  );
  const before = trainings.length;
  trainings = trainings.filter(
    (t) =>
      t.provider_id !== provider.id ||
      t.status !== "upcoming" ||
      keepHashes.has(t.source_hash)
  );
  const pruned = before - trainings.length;

  const archived = (await archiveExpired(trainings)) + pruned;
  await writeFile(
    path.join(dataDir, "trainings.json"),
    JSON.stringify(trainings, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(dataDir, "providers.json"),
    JSON.stringify(SEED_PROVIDERS, null, 2),
    "utf8"
  );

  return { created, updated, archived, trainings };
}

async function upsertSupabase(
  provider: Provider,
  scraped: ScrapedTraining[]
): Promise<{ created: number; updated: number; archived: number }> {
  const supabase = createServiceRoleClient();
  let created = 0;
  let updated = 0;

  for (const item of scraped) {
    const hash = makeSourceHash(
      provider.id,
      item.title,
      item.start_date,
      item.registration_url
    );
    const country_code = item.country_code || provider.country_code || "PK";
    const payload = {
      provider_id: provider.id,
      slug: makeTrainingSlug(item.title, item.start_date),
      title: item.title,
      description: item.description ?? null,
      instructor: item.instructor ?? null,
      category: item.category ?? null,
      skill_tags: item.skill_tags ?? [],
      city: item.city ?? provider.city,
      province: item.province ?? provider.province,
      venue: item.venue ?? null,
      delivery_mode: item.delivery_mode,
      start_date: item.start_date,
      end_date: item.end_date ?? null,
      duration: item.duration ?? null,
      registration_deadline: item.registration_deadline ?? null,
      price: item.price ?? null,
      currency: item.currency ?? currencyForCountry(country_code),
      is_free: item.is_free ?? false,
      certificate_available: item.certificate_available ?? false,
      registration_url: item.registration_url,
      image_url: item.image_url ?? null,
      contact_info: item.contact_info ?? provider.contact_email,
      status: "upcoming" as const,
      source_hash: hash,
      country_code,
      last_scraped_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("trainings")
      .select("id, slug")
      .eq("provider_id", provider.id)
      .eq("source_hash", hash)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("trainings")
        .update(payload)
        .eq("id", existing.id);
      if (!error) updated += 1;
    } else {
      const { error } = await supabase.from("trainings").insert(payload);
      if (error?.code === "23505") {
        payload.slug = `${payload.slug}-${hash.slice(0, 6)}`;
        const retry = await supabase.from("trainings").insert(payload);
        if (!retry.error) created += 1;
      } else if (!error) {
        created += 1;
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: expired } = await supabase
    .from("trainings")
    .select("id")
    .eq("status", "upcoming")
    .lt("end_date", today);

  let archived = 0;
  if (expired?.length) {
    const { error } = await supabase
      .from("trainings")
      .update({ status: "completed", last_updated_at: new Date().toISOString() })
      .in(
        "id",
        expired.map((e) => e.id)
      );
    if (!error) archived = expired.length;
  }

  await supabase
    .from("trainings")
    .update({ status: "completed", last_updated_at: new Date().toISOString() })
    .eq("status", "upcoming")
    .is("end_date", null)
    .lt("start_date", today);

  // Remove stale upcoming rows for this provider that were not in the latest scrape
  const keepHashes = scraped.map((item) =>
    makeSourceHash(provider.id, item.title, item.start_date, item.registration_url)
  );
  const { data: existingRows } = await supabase
    .from("trainings")
    .select("id, source_hash")
    .eq("provider_id", provider.id)
    .eq("status", "upcoming");
  const staleIds = (existingRows ?? [])
    .filter((row) => !keepHashes.includes(row.source_hash))
    .map((row) => row.id);
  if (staleIds.length) {
    const { error: delErr } = await supabase.from("trainings").delete().in("id", staleIds);
    if (!delErr) archived += staleIds.length;
  }

  return { created, updated, archived };
}

async function writeLog(log: Omit<ScrapeLog, "id"> & { id?: string }) {
  const entry: ScrapeLog = {
    id: log.id ?? randomUUID(),
    ...log,
  };

  if (hasSupabaseEnv() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createServiceRoleClient();
      await supabase.from("scrape_logs").insert(entry);
      return;
    } catch {
      // fall through to local
    }
  }

  const dataDir = path.join(process.cwd(), "data");
  await mkdir(dataDir, { recursive: true });
  const file = path.join(dataDir, "scrape-logs.json");
  let logs: ScrapeLog[] = [];
  try {
    const { readFile } = await import("fs/promises");
    logs = JSON.parse(await readFile(file, "utf8")) as ScrapeLog[];
  } catch {
    logs = [];
  }
  logs.unshift(entry);
  await writeFile(file, JSON.stringify(logs.slice(0, 200), null, 2), "utf8");
}

export async function runScraperForProvider(provider: Provider): Promise<RunSummary> {
  const scraper = getScraper(provider.scraper_key);
  const started = new Date().toISOString();

  if (!scraper) {
    const summary: RunSummary = {
      scraperKey: provider.scraper_key,
      status: "failed",
      found: 0,
      created: 0,
      updated: 0,
      archived: 0,
      warnings: [],
      error: `No scraper registered for key ${provider.scraper_key}`,
    };
    await writeLog({
      provider_id: provider.id,
      scraper_key: provider.scraper_key,
      status: "failed",
      message: summary.error!,
      trainings_found: 0,
      trainings_created: 0,
      trainings_updated: 0,
      trainings_archived: 0,
      error_details: summary.error!,
      started_at: started,
      finished_at: new Date().toISOString(),
    });
    return summary;
  }

  try {
    const result = await scraper.scrape(provider);
    const upsert =
      hasSupabaseEnv() && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? await upsertSupabase(provider, result.trainings)
        : await upsertLocal(provider, result.trainings);

    const status =
      result.warnings.length && result.trainings.length === 0
        ? "partial"
        : result.trainings.length
          ? "success"
          : "partial";

    const summary: RunSummary = {
      scraperKey: provider.scraper_key,
      status,
      found: result.trainings.length,
      created: upsert.created,
      updated: upsert.updated,
      archived: upsert.archived,
      warnings: result.warnings,
    };

    await writeLog({
      provider_id: provider.id,
      scraper_key: provider.scraper_key,
      status,
      message: result.warnings.join("; ") || "OK",
      trainings_found: summary.found,
      trainings_created: summary.created,
      trainings_updated: summary.updated,
      trainings_archived: summary.archived,
      error_details: null,
      started_at: started,
      finished_at: new Date().toISOString(),
    });

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeLog({
      provider_id: provider.id,
      scraper_key: provider.scraper_key,
      status: "failed",
      message,
      trainings_found: 0,
      trainings_created: 0,
      trainings_updated: 0,
      trainings_archived: 0,
      error_details: message,
      started_at: started,
      finished_at: new Date().toISOString(),
    });
    return {
      scraperKey: provider.scraper_key,
      status: "failed",
      found: 0,
      created: 0,
      updated: 0,
      archived: 0,
      warnings: [],
      error: message,
    };
  }
}

export async function runAllScrapers(providers?: Provider[]): Promise<RunSummary[]> {
  const list =
    providers ??
    SEED_PROVIDERS.filter((p) => p.scraper_enabled);

  // Ensure registry keys exist even if provider list is empty
  void getAllScrapers();

  const summaries: RunSummary[] = [];
  for (const provider of list) {
    if (!provider.scraper_enabled) continue;
    try {
      summaries.push(await runScraperForProvider(provider));
    } catch (error) {
      summaries.push({
        scraperKey: provider.scraper_key,
        status: "failed",
        found: 0,
        created: 0,
        updated: 0,
        archived: 0,
        warnings: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return summaries;
}

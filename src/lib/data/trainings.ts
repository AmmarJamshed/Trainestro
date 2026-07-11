import {
  addDays,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { readFile } from "fs/promises";
import path from "path";
import { SEED_PROVIDERS, SEED_TRAININGS } from "@/lib/data/seed";
import type {
  AnalyticsSummary,
  Provider,
  ScrapeLog,
  SearchFilters,
  Training,
} from "@/lib/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient, hasSupabase } from "@/lib/supabase/server";

function attachProviders(trainings: Training[], providers: Provider[]): Training[] {
  const map = new Map(providers.map((p) => [p.id, p]));
  return trainings.map((t) => ({ ...t, provider: map.get(t.provider_id) }));
}

function filterTrainings(trainings: Training[], filters: SearchFilters): Training[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let results = trainings.filter((t) => t.status === "upcoming");

  if (filters.q) {
    const q = filters.q.toLowerCase();
    results = results.filter((t) => {
      const haystack = [
        t.title,
        t.description,
        t.instructor,
        t.category,
        t.city,
        t.provider?.name,
        ...(t.skill_tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (filters.provider) {
    const providerFilter = filters.provider.toLowerCase();
    results = results.filter(
      (t) =>
        t.provider?.slug === filters.provider ||
        t.provider_id === filters.provider ||
        t.provider?.name.toLowerCase() === providerFilter
    );
  }

  if (filters.city) {
    results = results.filter(
      (t) => t.city?.toLowerCase() === filters.city!.toLowerCase()
    );
  }

  if (filters.province) {
    results = results.filter(
      (t) => t.province?.toLowerCase() === filters.province!.toLowerCase()
    );
  }

  if (filters.category) {
    results = results.filter(
      (t) => t.category?.toLowerCase() === filters.category!.toLowerCase()
    );
  }

  if (filters.delivery) {
    results = results.filter((t) => t.delivery_mode === filters.delivery);
  }

  if (filters.price === "free") {
    results = results.filter((t) => t.is_free || t.price === 0);
  } else if (filters.price === "paid") {
    results = results.filter((t) => !t.is_free && (t.price === null || t.price > 0));
  }

  if (filters.date === "this_week") {
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });
    results = results.filter((t) =>
      isWithinInterval(parseISO(t.start_date), { start, end })
    );
  } else if (filters.date === "next_week") {
    const start = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
    const end = addDays(endOfWeek(today, { weekStartsOn: 1 }), 7);
    results = results.filter((t) =>
      isWithinInterval(parseISO(t.start_date), { start, end })
    );
  } else if (filters.date === "this_month") {
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    results = results.filter((t) =>
      isWithinInterval(parseISO(t.start_date), { start, end })
    );
  }

  if (filters.from) {
    results = results.filter((t) => t.start_date >= filters.from!);
  }
  if (filters.to) {
    results = results.filter((t) => t.start_date <= filters.to!);
  }

  const sort = filters.sort ?? "soonest";
  results = [...results].sort((a, b) => {
    if (sort === "latest") {
      return b.created_at.localeCompare(a.created_at);
    }
    if (sort === "price_asc") {
      const ap = a.is_free ? 0 : (a.price ?? Number.POSITIVE_INFINITY);
      const bp = b.is_free ? 0 : (b.price ?? Number.POSITIVE_INFINITY);
      return ap - bp;
    }
    return a.start_date.localeCompare(b.start_date);
  });

  return results;
}

async function loadLocalTrainingsFile(): Promise<Training[] | null> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "data", "trainings.json"),
      "utf8"
    );
    return JSON.parse(raw) as Training[];
  } catch {
    return null;
  }
}

async function localProviders(): Promise<Provider[]> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "data", "providers.json"),
      "utf8"
    );
    return JSON.parse(raw) as Provider[];
  } catch {
    return SEED_PROVIDERS;
  }
}

async function localTrainings(): Promise<Training[]> {
  const providers = await localProviders();
  const fromFile = await loadLocalTrainingsFile();
  return attachProviders(fromFile ?? SEED_TRAININGS, providers);
}

export async function getProviders(): Promise<Provider[]> {
  if (!hasSupabase()) return localProviders();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .order("name");
    if (error || !data?.length) return localProviders();
    return data as Provider[];
  } catch {
    return localProviders();
  }
}

export async function getProviderBySlug(slug: string): Promise<Provider | null> {
  const providers = await getProviders();
  return providers.find((p) => p.slug === slug) ?? null;
}

export async function getTrainings(filters: SearchFilters = {}): Promise<Training[]> {
  if (!hasSupabase()) {
    return filterTrainings(await localTrainings(), filters);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("trainings")
      .select("*, provider:providers(*)")
      .eq("status", "upcoming")
      .order("start_date", { ascending: true });

    if (error || !data) return filterTrainings(await localTrainings(), filters);

    const mapped = (data as Training[]).map((t) => ({
      ...t,
      provider: Array.isArray(t.provider) ? t.provider[0] : t.provider,
    }));
    return filterTrainings(mapped, filters);
  } catch {
    return filterTrainings(await localTrainings(), filters);
  }
}

export async function getTrainingBySlug(slug: string): Promise<Training | null> {
  if (!hasSupabase()) {
    const all = await localTrainings();
    return all.find((t) => t.slug === slug) ?? null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("trainings")
      .select("*, provider:providers(*)")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      const all = await localTrainings();
      return all.find((t) => t.slug === slug) ?? null;
    }

    const training = data as Training;
    return {
      ...training,
      provider: Array.isArray(training.provider)
        ? training.provider[0]
        : training.provider,
    };
  } catch {
    const all = await localTrainings();
    return all.find((t) => t.slug === slug) ?? null;
  }
}

export async function getAnalytics(): Promise<AnalyticsSummary> {
  const [trainings, providers] = await Promise.all([
    getTrainings({ sort: "latest" }),
    getProviders(),
  ]);

  const cityCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const t of trainings) {
    if (t.city) cityCounts.set(t.city, (cityCounts.get(t.city) ?? 0) + 1);
    if (t.category)
      categoryCounts.set(t.category, (categoryCounts.get(t.category) ?? 0) + 1);
  }

  return {
    liveTrainings: trainings.length,
    providers: providers.filter((p) => p.scraper_enabled).length,
    cities: [...cityCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    categories: [...categoryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    recentlyAdded: trainings.slice(0, 8),
  };
}

export async function getScrapeLogs(limit = 50): Promise<ScrapeLog[]> {
  if (hasSupabase() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("scrape_logs")
        .select("*, provider:providers(*)")
        .order("started_at", { ascending: false })
        .limit(limit);

      if (!error && data) {
        return (data as ScrapeLog[]).map((log) => ({
          ...log,
          provider: Array.isArray(log.provider) ? log.provider[0] : log.provider,
        }));
      }
    } catch {
      // fall through
    }
  }

  try {
    const raw = await readFile(
      path.join(process.cwd(), "data", "scrape-logs.json"),
      "utf8"
    );
    return (JSON.parse(raw) as ScrapeLog[]).slice(0, limit);
  } catch {
    return [];
  }
}

export async function updateProviderEnabled(
  id: string,
  enabled: boolean
): Promise<boolean> {
  if (!hasSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("providers")
    .update({ scraper_enabled: enabled })
    .eq("id", id);
  return !error;
}

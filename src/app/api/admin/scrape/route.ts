import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { SEED_PROVIDERS } from "@/lib/data/seed";
import { runAllScrapers, runScraperForProvider } from "@/lib/scrapers/runner";
import { hasSupabase, createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    scraperKey?: string;
  };

  let providers = SEED_PROVIDERS;
  if (hasSupabase()) {
    try {
      const supabase = await createServiceClient();
      const { data } = await supabase.from("providers").select("*");
      if (data?.length) providers = data;
    } catch {
      // seed fallback
    }
  }

  if (body.scraperKey) {
    const provider = providers.find((p) => p.scraper_key === body.scraperKey);
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    const summary = await runScraperForProvider(provider);
    return NextResponse.json({ summaries: [summary] });
  }

  const summaries = await runAllScrapers(providers);
  return NextResponse.json({ summaries });
}

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { SEED_PROVIDERS } from "../src/lib/data/seed";
import { runScraperForProvider } from "../src/lib/scrapers/runner";

async function main() {
  const keys = process.argv.slice(2);
  const providers = SEED_PROVIDERS.filter(
    (p) => !keys.length || keys.includes(p.scraper_key)
  );
  console.log(
    "Supabase upsert:",
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
  for (const provider of providers) {
    const s = await runScraperForProvider(provider);
    console.log(
      `[${s.status}] ${s.scraperKey}: found=${s.found} created=${s.created} updated=${s.updated}`
    );
    if (s.warnings.length) console.log("  warnings:", s.warnings.join(" | "));
    if (s.error) console.log("  error:", s.error);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import "dotenv/config";
import { SEED_PROVIDERS } from "../src/lib/data/seed";
import { runAllScrapers } from "../src/lib/scrapers/runner";

async function main() {
  console.log("Starting Trainestro weekly scrape…");
  const summaries = await runAllScrapers(SEED_PROVIDERS);
  for (const s of summaries) {
    console.log(
      `[${s.status}] ${s.scraperKey}: found=${s.found} created=${s.created} updated=${s.updated} archived=${s.archived}`
    );
    if (s.warnings.length) console.log("  warnings:", s.warnings.join(" | "));
    if (s.error) console.log("  error:", s.error);
  }
  const failed = summaries.filter((s) => s.status === "failed").length;
  console.log(`Done. ${summaries.length - failed}/${summaries.length} providers OK.`);
  // Never fail the whole job solely because one provider failed
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

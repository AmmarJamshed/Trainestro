/**
 * Emit SQL for a single provider's trainings (for MCP sync).
 * Usage: npx tsx scripts/emit-provider-sql.ts gdg-community
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import type { Training } from "../src/lib/types";
import { SEED_PROVIDERS } from "../src/lib/data/seed";

function esc(v: string | null | undefined) {
  if (v == null) return "null";
  return `'${String(v)
    .replace(/[\u0000-\u001f\u007f-\uffff]/g, " ")
    .replace(/'/g, "''")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500)}'`;
}

function escArr(arr: string[] | null | undefined) {
  if (!arr?.length) return "'{}'::text[]";
  return `ARRAY[${arr.map((x) => esc(x)).join(",")}]::text[]`;
}

function rowSql(t: Training) {
  return `(${esc(t.id)}, ${esc(t.provider_id)}, ${esc(t.slug)}, ${esc(t.title)}, ${esc(t.description)},
  ${esc(t.instructor)}, ${esc(t.category)}, ${escArr(t.skill_tags)},
  ${esc(t.city)}, ${esc(t.province)}, ${esc(t.venue)},
  ${t.latitude ?? "null"}, ${t.longitude ?? "null"}, ${esc(t.delivery_mode)},
  ${esc(t.start_date)}::date, ${t.end_date ? `${esc(t.end_date)}::date` : "null"},
  ${esc(t.duration)}, ${t.registration_deadline ? `${esc(t.registration_deadline)}::date` : "null"},
  ${t.price ?? "null"}, ${esc(t.currency)}, ${t.is_free}, ${t.certificate_available},
  ${esc(t.registration_url)}, ${esc(t.image_url)}, ${esc(t.contact_info)}, ${esc(t.status)},
  ${esc(t.source_hash)}, ${esc(t.country_code)},
  ${t.last_scraped_at ? `${esc(t.last_scraped_at)}::timestamptz` : "now()"},
  ${esc(t.last_updated_at)}::timestamptz, ${esc(t.created_at)}::timestamptz)`;
}

const slugOrKey = process.argv[2] || "gdg-community";
const provider = SEED_PROVIDERS.find(
  (p) => p.slug === slugOrKey || p.scraper_key === slugOrKey
);
if (!provider) {
  console.error("Provider not found:", slugOrKey);
  process.exit(1);
}

const all = JSON.parse(
  readFileSync(path.join(process.cwd(), "data", "trainings.json"), "utf8")
) as Training[];
const trainings = all.filter((t) => t.provider_id === provider.id);

const dir = path.join(process.cwd(), "data", "sql-batches", "gdg-sync");
mkdirSync(dir, { recursive: true });
writeFileSync(
  path.join(dir, "00-delete.sql"),
  `delete from public.trainings where provider_id = '${provider.id}';\n`
);

const chunkSize = 5;
let batch = 1;
for (let i = 0; i < trainings.length; i += chunkSize) {
  const chunk = trainings.slice(i, i + chunkSize);
  const sql = `insert into public.trainings (
  id, provider_id, slug, title, description, instructor, category, skill_tags,
  city, province, venue, latitude, longitude, delivery_mode, start_date, end_date,
  duration, registration_deadline, price, currency, is_free, certificate_available,
  registration_url, image_url, contact_info, status, source_hash, country_code,
  last_scraped_at, last_updated_at, created_at
) values
${chunk.map(rowSql).join(",\n")};`;
  writeFileSync(path.join(dir, `${String(batch).padStart(2, "0")}.sql`), sql, "utf8");
  batch += 1;
}

console.log(
  `Wrote delete + ${batch - 1} insert batches for ${trainings.length} ${provider.slug} trainings`
);

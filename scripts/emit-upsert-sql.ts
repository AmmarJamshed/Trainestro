/**
 * Emit SQL upsert statements for scraped trainings (for Supabase MCP / psql).
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Training } from "../src/lib/types";

function esc(v: string | null | undefined) {
  if (v == null) return "null";
  return `'${v.replace(/'/g, "''")}'`;
}

function escArr(arr: string[] | null | undefined) {
  if (!arr?.length) return "'{}'::text[]";
  return `ARRAY[${arr.map((x) => esc(x)).join(",")}]::text[]`;
}

const trainings = JSON.parse(
  readFileSync(path.join(process.cwd(), "data", "trainings.json"), "utf8")
) as Training[];

const lines: string[] = [
  "-- Auto-generated from data/trainings.json",
  "begin;",
];

for (const t of trainings) {
  lines.push(`
insert into public.trainings (
  id, provider_id, slug, title, description, instructor, category, skill_tags,
  city, province, venue, latitude, longitude, delivery_mode, start_date, end_date,
  duration, registration_deadline, price, currency, is_free, certificate_available,
  registration_url, image_url, contact_info, status, source_hash, country_code,
  last_scraped_at, last_updated_at, created_at
) values (
  ${esc(t.id)}, ${esc(t.provider_id)}, ${esc(t.slug)}, ${esc(t.title)}, ${esc(t.description)},
  ${esc(t.instructor)}, ${esc(t.category)}, ${escArr(t.skill_tags)},
  ${esc(t.city)}, ${esc(t.province)}, ${esc(t.venue)},
  ${t.latitude ?? "null"}, ${t.longitude ?? "null"}, ${esc(t.delivery_mode)},
  ${esc(t.start_date)}::date, ${t.end_date ? `${esc(t.end_date)}::date` : "null"},
  ${esc(t.duration)}, ${t.registration_deadline ? `${esc(t.registration_deadline)}::date` : "null"},
  ${t.price ?? "null"}, ${esc(t.currency)}, ${t.is_free}, ${t.certificate_available},
  ${esc(t.registration_url)}, ${esc(t.image_url)}, ${esc(t.contact_info)}, ${esc(t.status)},
  ${esc(t.source_hash)}, ${esc(t.country_code)},
  ${t.last_scraped_at ? `${esc(t.last_scraped_at)}::timestamptz` : "now()"},
  ${esc(t.last_updated_at)}::timestamptz, ${esc(t.created_at)}::timestamptz
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  instructor = excluded.instructor,
  category = excluded.category,
  skill_tags = excluded.skill_tags,
  city = excluded.city,
  province = excluded.province,
  venue = excluded.venue,
  delivery_mode = excluded.delivery_mode,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  duration = excluded.duration,
  price = excluded.price,
  is_free = excluded.is_free,
  certificate_available = excluded.certificate_available,
  registration_url = excluded.registration_url,
  contact_info = excluded.contact_info,
  status = excluded.status,
  source_hash = excluded.source_hash,
  last_scraped_at = excluded.last_scraped_at,
  last_updated_at = excluded.last_updated_at,
  slug = excluded.slug;
`);
}

lines.push("commit;");
lines.push("select count(*) as upcoming from public.trainings where status = 'upcoming';");

const out = path.join(process.cwd(), "data", "upsert_trainings.sql");
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${trainings.length} upserts to ${out}`);

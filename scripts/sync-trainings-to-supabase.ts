/**
 * One-shot: push data/trainings.json into Supabase using service role.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import type { Training } from "../src/lib/types";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const raw = await readFile(path.join(process.cwd(), "data", "trainings.json"), "utf8");
  const trainings = JSON.parse(raw) as Training[];

  let upserted = 0;
  let errors = 0;

  for (const t of trainings) {
    const { provider: _p, ...row } = t as Training & { provider?: unknown };
    const { error } = await supabase.from("trainings").upsert(
      {
        ...row,
        skill_tags: row.skill_tags ?? [],
      },
      { onConflict: "id" }
    );
    if (error) {
      // try by source_hash
      const { data: existing } = await supabase
        .from("trainings")
        .select("id")
        .eq("provider_id", row.provider_id)
        .eq("source_hash", row.source_hash)
        .maybeSingle();

      if (existing) {
        const { error: upErr } = await supabase
          .from("trainings")
          .update({ ...row, id: existing.id })
          .eq("id", existing.id);
        if (upErr) {
          console.error("update fail", row.title, upErr.message);
          errors += 1;
        } else upserted += 1;
      } else {
        const { error: insErr } = await supabase.from("trainings").insert(row);
        if (insErr) {
          console.error("insert fail", row.title, insErr.message);
          errors += 1;
        } else upserted += 1;
      }
    } else {
      upserted += 1;
    }
  }

  const { count } = await supabase
    .from("trainings")
    .select("*", { count: "exact", head: true })
    .eq("status", "upcoming");

  console.log(`Upserted ${upserted}, errors ${errors}, upcoming in DB: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

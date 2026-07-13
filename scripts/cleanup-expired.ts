import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createServiceRoleClient, hasSupabaseEnv } from "../src/lib/supabase/admin";
import type { Training } from "../src/lib/types";

function completionDate(t: Pick<Training, "end_date" | "start_date">) {
  return t.end_date ?? t.start_date;
}

function isExpired(t: Pick<Training, "end_date" | "start_date">, today: string) {
  const done = completionDate(t);
  return Boolean(done && done <= today);
}

async function cleanupLocal(today: string) {
  const dataDir = path.join(process.cwd(), "data");
  const file = path.join(dataDir, "trainings.json");
  let trainings: Training[] = [];
  try {
    trainings = JSON.parse(await readFile(file, "utf8")) as Training[];
  } catch {
    return { removed: 0, kept: 0 };
  }

  const kept = trainings.filter((t) => !isExpired(t, today));
  const removed = trainings.length - kept.length;
  if (removed > 0) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(file, JSON.stringify(kept, null, 2), "utf8");
  }
  return { removed, kept: kept.length };
}

async function cleanupSupabase(today: string) {
  const supabase = createServiceRoleClient();

  // end_date set and on/before today
  const { data: withEnd, error: endErr } = await supabase
    .from("trainings")
    .select("id, title, start_date, end_date")
    .not("end_date", "is", null)
    .lte("end_date", today);

  if (endErr) throw new Error(`Supabase expired(end_date) query failed: ${endErr.message}`);

  // no end_date — treat start_date as completion
  const { data: noEnd, error: startErr } = await supabase
    .from("trainings")
    .select("id, title, start_date, end_date")
    .is("end_date", null)
    .lte("start_date", today);

  if (startErr) {
    throw new Error(`Supabase expired(start_date) query failed: ${startErr.message}`);
  }

  const rows = [...(withEnd ?? []), ...(noEnd ?? [])];
  const ids = [...new Set(rows.map((r) => r.id))];

  if (!ids.length) {
    return { removed: 0, titles: [] as string[] };
  }

  const { error: delErr } = await supabase.from("trainings").delete().in("id", ids);
  if (delErr) throw new Error(`Supabase delete failed: ${delErr.message}`);

  return {
    removed: ids.length,
    titles: rows.map((r) => `${r.title} (${completionDate(r as Training)})`),
  };
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`Cleaning trainings with completion date on/before ${today}…`);

  const local = await cleanupLocal(today);
  console.log(`Local JSON: removed=${local.removed} kept=${local.kept}`);

  if (hasSupabaseEnv() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const remote = await cleanupSupabase(today);
    console.log(`Supabase: removed=${remote.removed}`);
    for (const title of remote.titles.slice(0, 40)) {
      console.log(`  - ${title}`);
    }
    if (remote.titles.length > 40) {
      console.log(`  …and ${remote.titles.length - 40} more`);
    }
  } else {
    console.log("Supabase service role not configured — skipped remote delete.");
  }

  console.log("Cleanup done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

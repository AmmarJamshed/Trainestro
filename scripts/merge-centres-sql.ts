/**
 * Merge centre-sync SQL insert batches into fewer larger files for MCP sync.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

const src = path.join(process.cwd(), "data", "sql-batches", "centres-sync");
const out = path.join(process.cwd(), "data", "sql-batches", "centres-merged");
mkdirSync(out, { recursive: true });

const files = readdirSync(src)
  .filter((f) => /^\d+\.sql$/.test(f))
  .sort();

const maxChars = 12000;
let buf = "";
let n = 1;
const flush = () => {
  if (!buf) return;
  writeFileSync(path.join(out, `${String(n).padStart(2, "0")}.sql`), buf, "utf8");
  n += 1;
  buf = "";
};

for (const f of files) {
  const sql = readFileSync(path.join(src, f), "utf8").trim();
  if (buf.length + sql.length + 2 > maxChars) flush();
  buf += (buf ? "\n" : "") + sql;
}
flush();

const del = readFileSync(path.join(src, "00-delete.sql"), "utf8");
writeFileSync(path.join(out, "00-delete.sql"), del);
console.log(`Merged into ${n - 1} insert files (+ delete)`);

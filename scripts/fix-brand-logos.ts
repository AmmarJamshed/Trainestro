/**
 * Build clean square provider logos from official source assets.
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const dir = path.join(process.cwd(), "public", "providers");

async function squarePad(input: Buffer | string, size = 256, bg = "#ffffff") {
  return sharp(input)
    .ensureAlpha()
    .resize(size, size, {
      fit: "contain",
      background: bg,
    })
    .png()
    .toBuffer();
}

async function main() {
  // LUMS: official crest + wordmark (blue/white) on white square
  const lumsSrc = path.join(dir, "lums-white.png");
  // Flatten black to transparent-ish by treating near-black as alpha, then pad white
  const lumsRaw = await sharp(lumsSrc)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = lumsRaw;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // near-black background → transparent
    if (r < 28 && g < 28 && b < 28) data[i + 3] = 0;
  }
  const lumsTransparent = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  // Prefer crest-only crop (left ~38% of wide logo)
  const meta = await sharp(lumsTransparent).metadata();
  const w = meta.width ?? 400;
  const h = meta.height ?? 200;
  const crestW = Math.round(w * 0.38);
  const crest = await sharp(lumsTransparent)
    .extract({ left: 0, top: 0, width: crestW, height: h })
    .png()
    .toBuffer();
  await sharp(await squarePad(crest, 256, "#ffffff"))
    .toFile(path.join(dir, "lums.png"));

  // IBA: crop maroon mark from official horizontal logo
  const ibaSrc = path.join(dir, "iba-official.png");
  const ibaMeta = await sharp(ibaSrc).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < ibaMeta.data.length; i += 4) {
    const r = ibaMeta.data[i];
    const g = ibaMeta.data[i + 1];
    const b = ibaMeta.data[i + 2];
    if (r < 28 && g < 28 && b < 28) ibaMeta.data[i + 3] = 0;
  }
  const ibaTransparent = await sharp(ibaMeta.data, {
    raw: {
      width: ibaMeta.info.width,
      height: ibaMeta.info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
  const ibaW = ibaMeta.info.width;
  const ibaH = ibaMeta.info.height;
  // Left mark is roughly square; take left portion equal to height
  const markSize = Math.min(ibaH, Math.round(ibaW * 0.32));
  const ibaMark = await sharp(ibaTransparent)
    .extract({ left: 0, top: 0, width: markSize, height: ibaH })
    .resize(256, 256, { fit: "contain", background: "#ffffff" })
    .png()
    .toFile(path.join(dir, "iba.png"));
  void ibaMark;

  // Also copy for CEE
  await sharp(path.join(dir, "iba.png")).toFile(path.join(dir, "iba-cee.png"));

  // atomcamp: official wordmark — black bg works for strip; pad square
  const atomSrc = path.join(dir, "atomcamp-src.png");
  const atomMeta = await sharp(atomSrc).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Keep black background (brand), just square-pad
  await sharp(atomSrc)
    .resize(256, 256, { fit: "contain", background: "#0B0B0B" })
    .png()
    .toFile(path.join(dir, "atomcamp.png"));

  // Try to fetch a better atomcamp asset with icon if available
  const candidates = [
    "https://www.atomcamp.com/wp-content/uploads/2023/01/atomcamp-logo.png",
    "https://www.atomcamp.com/wp-content/uploads/2024/01/atomcamp-logo.png",
    "https://www.atomcamp.com/wp-content/uploads/2022/10/atomcamp-logo.png",
    "https://www.atomcamp.com/wp-content/themes/atomcamp/assets/images/logo.png",
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) continue;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("image")) continue;
      await sharp(buf)
        .resize(256, 256, { fit: "contain", background: "#ffffff" })
        .png()
        .toFile(path.join(dir, "atomcamp.png"));
      console.log("atomcamp upgraded from", url);
      break;
    } catch {
      /* try next */
    }
  }

  writeFileSync(
    path.join(dir, "_sources.json"),
    JSON.stringify(
      {
        ...JSON.parse(readFileSync(path.join(dir, "_sources.json"), "utf8")),
        lums: {
          file: "/providers/lums.png",
          source:
            "https://www.lums.edu.pk/sites/default/files/inline-images/LUMS%20Logo-white.png",
        },
        "iba-cee": {
          file: "/providers/iba-cee.png",
          source: "https://www.iba.edu.pk/images/logo.png",
        },
        atomcamp: {
          file: "/providers/atomcamp.png",
          source: "https://www.atomcamp.com/wp-content/uploads/2022/10/logo.atomcamp.png",
        },
      },
      null,
      2
    )
  );

  console.log("Wrote lums.png, iba.png, iba-cee.png, atomcamp.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

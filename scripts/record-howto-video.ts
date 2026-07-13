/**
 * Record a short how-to walkthrough of Trainestro for the promo video.
 *
 * Usage: npx playwright test scripts/record-howto-video.ts  (or tsx + chromium)
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "fs";
import path from "path";

const BASE = process.env.TRAINESTRO_URL || "https://trainestro.com";
const OUT = path.join(process.cwd(), "public", "promo");
const VIDEO_DIR = path.join(OUT, "raw");

async function caption(page: import("playwright").Page, text: string) {
  await page.evaluate((t) => {
    let el = document.getElementById("__howto_caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "__howto_caption";
      Object.assign(el.style, {
        position: "fixed",
        left: "50%",
        bottom: "28px",
        transform: "translateX(-50%)",
        zIndex: "2147483647",
        maxWidth: "90%",
        padding: "12px 20px",
        borderRadius: "999px",
        background: "rgba(7,11,22,0.88)",
        border: "1px solid rgba(34,211,238,0.45)",
        color: "#fff",
        font: "600 18px/1.35 Outfit, system-ui, sans-serif",
        textAlign: "center",
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        pointerEvents: "none",
      } as CSSStyleDeclaration);
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

async function titleCard(page: import("playwright").Page, title: string, subtitle: string) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    html,body{margin:0;height:100%;background:radial-gradient(ellipse at 30% 20%,#132448,#070b16 55%);
      color:#fff;font-family:Outfit,system-ui,sans-serif;display:grid;place-items:center;overflow:hidden}
    .wrap{text-align:center;padding:40px}
    .mark{width:72px;height:72px;border-radius:18px;background:linear-gradient(135deg,#3b82f6,#22d3ee);
      display:grid;place-items:center;margin:0 auto 22px;font-weight:800;font-size:34px}
    h1{font-size:54px;margin:0 0 12px;letter-spacing:-0.03em}
    p{font-size:22px;color:#94a3b8;margin:0;max-width:640px}
  </style></head><body>
  <div class="wrap"><div class="mark">T</div><h1>${title}</h1><p>${subtitle}</p></div>
  </body></html>`);
  await page.waitForTimeout(2200);
}

async function main() {
  mkdirSync(VIDEO_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  // Opening card
  await titleCard(
    page,
    "How to use Trainestro",
    "Find live trainings in Pakistan, UAE, USA & UK — in under a minute"
  );

  // Home hero
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1200);
  await caption(page, "1 · Land on Trainestro and search any skill");
  await page.waitForTimeout(1800);

  const search = page.locator('input[type="search"], input[name="q"], input[placeholder*="Search"]').first();
  if (await search.count()) {
    await search.click();
    await search.fill("AI");
    await page.waitForTimeout(900);
    await caption(page, "Type a skill — AI, cybersecurity, finance…");
    await page.waitForTimeout(1200);
    await Promise.all([
      page.waitForURL(/search/, { timeout: 15000 }).catch(() => null),
      search.press("Enter"),
    ]);
    await page.waitForTimeout(1500);
  }

  await page.goto(`${BASE}/search`, { waitUntil: "networkidle", timeout: 90000 });
  await caption(page, "2 · Filter by country right above the results");
  await page.waitForTimeout(1000);
  const countryBtn = page.getByRole("button", { name: /Pakistan|UAE|USA|UK|All/i }).first();
  if (await countryBtn.count()) {
    await countryBtn.hover().catch(() => null);
    await page.waitForTimeout(700);
  }
  const uae = page.getByRole("button", { name: /UAE/i }).first();
  if (await uae.count()) {
    await uae.click();
    await page.waitForTimeout(1600);
    await caption(page, "Pick UAE, USA, UK, or Pakistan in one tap");
    await page.waitForTimeout(1600);
  }

  // Back home for globe
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 90000 });
  await caption(page, "3 · Spin the globe and tap a country marker");
  const globe = page.locator("canvas").first();
  if (await globe.count()) {
    await globe.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const box = await globe.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
      for (let i = 0; i < 18; i++) {
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * (0.55 - i * 0.012), box.y + box.height * 0.45, {
          steps: 4,
        });
        await page.mouse.up();
        await page.waitForTimeout(80);
      }
    }
    await page.waitForTimeout(1400);
  }

  // Browse card + enroll
  await page.goto(`${BASE}/search?q=AI`, { waitUntil: "networkidle", timeout: 90000 });
  await caption(page, "4 · Open a training card to see dates, city & price");
  await page.waitForTimeout(1200);
  const card = page.locator("a[href*='/trainings/'], article a, [data-training]").first();
  if (await card.count()) {
    await card.scrollIntoViewIfNeeded().catch(() => null);
    await page.waitForTimeout(900);
    await card.click({ timeout: 8000 }).catch(() => null);
    await page.waitForTimeout(1800);
  }

  await caption(page, "5 · Tap Enroll to register on the provider’s site");
  const enroll = page.getByRole("link", { name: /enroll/i }).or(page.getByRole("button", { name: /enroll/i })).first();
  if (await enroll.count()) {
    await enroll.scrollIntoViewIfNeeded().catch(() => null);
    await page.waitForTimeout(1600);
  } else {
    await page.waitForTimeout(1400);
  }

  await titleCard(
    page,
    "That’s it — go find your next live training",
    "trainestro.com  ·  free to browse  ·  register with the provider"
  );

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const rawPath = await video.path();
    console.log("RAW_VIDEO=" + rawPath);
  } else {
    console.error("No video recorded");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

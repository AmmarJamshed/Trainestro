import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Lightweight scrape orchestrator trigger.
 * Prefer GitHub Actions for Playwright/Cheerio scraping; this function
 * can kick off an external scrape webhook or mark a run request.
 */
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("Authorization");
  const expected = Deno.env.get("SCRAPE_WEBHOOK_SECRET");
  if (expected && auth !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const hook = Deno.env.get("GITHUB_DISPATCH_URL");
  if (hook) {
    const token = Deno.env.get("GITHUB_PAT");
    await fetch(hook, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message:
        "Scrape trigger accepted. Heavy scraping runs in GitHub Actions / Node runners.",
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

# Trainestro

Live professional training aggregator for **Pakistan, UAE, Saudi Arabia, Bahrain, Qatar, Oman, USA, UK, Germany, France, Czech Republic, Netherlands, Canada, Japan, Malaysia, and Singapore**. Discover upcoming instructor-led sessions (classroom, hybrid, live online) and register on the provider's official page.

## Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **Data:** Supabase/PostgreSQL (optional) with local JSON/seed fallback
- **Scraping:** Cheerio + Axios modules per provider (Playwright available for JS-heavy sites)
- **Automation:** GitHub Actions weekly scrape → commit data → Vercel redeploy; monthly expired cleanup
- **Deploy:** Vercel

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin panel: `/admin` (default password `trainestro-admin` — change via `ADMIN_PASSWORD`).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js |
| `npm run build` | Production build |
| `npm run scrape` | Run all provider scrapers (upsert new/updated trainings) |
| `npm run scrape:one -- eventbrite-sg` | Run one scraper key (used by per-country Actions) |
| `npm run cleanup:expired` | Delete trainings whose completion date is today or earlier |
| `npm run lint` | ESLint |

## Providers (scrapers)

Pakistan institutes, university centres, and global community/catalog programs:

- NIBAF Pakistan, LRC, atomcamp, AI DataYard, PixelArt, IBA CEE, IBA-CICT, NUST PDC
- **LUMS REDC** & **LUMS CES** (Lahore executive / continuing education)
- **FAST NUCES CoEE** (professional tech programmes)
- Google Developer Groups (live events across **PK / AE / US / GB** cities)
- Microsoft Learn Students, IBM SkillsBuild, Oracle University
- **Stanford Continuing Studies** (US)
- **Flatiron School** (US cohorts)
- **Imperial Lifelong Learning** (UK)
- **Manchester Dubai Executive Education** (UAE)

Each scraper lives under `src/lib/scrapers/providers/` and is registered in `src/lib/scrapers/registry.ts`. Failures are isolated — one provider error does not stop the rest.

## Countries

Supported country filters: `PK`, `AE`, `SA`, `BH`, `QA`, `OM`, `US`, `GB`, `DE`, `FR`, `CZ`, `NL`, `CA`, `JP`, `MY`, `SG`.

Eventbrite markets use **one provider/scraper key per country** (`eventbrite-sa` … `eventbrite-sg`) so weekly jobs can run sequentially without pruning other countries.

## Supabase

1. Create a free Supabase project (pause an unused project if you hit the free-tier limit).
2. Run `supabase/migrations/20260711000000_init.sql` in the SQL editor.
3. Seed providers from `supabase/seed.sql`.
4. Set env vars from `.env.example`.

## GitHub Actions

| Workflow | Schedule | Purpose |
| --- | --- | --- |
| `.github/workflows/weekly-scrape.yml` | Mondays 03:00 UTC (45 min timeout) | Scrape core providers including multi-country GDG cities |
| `.github/workflows/trainings-eventbrite-*.yml` | Mondays 04:00–07:40 UTC (20 min apart) | One Eventbrite country per Action |
| `.github/workflows/weekly-eventbrite-all.yml` | Manual | Run all Eventbrite countries sequentially |
| `.github/workflows/monthly-cleanup.yml` | 1st of month 04:00 UTC | Delete trainings past completion (`end_date`, or `start_date` if no end) — all countries |

Both support **Run workflow** manually from the Actions tab.

Secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for DB writes/deletes)
- `VERCEL_DEPLOY_HOOK_URL` (optional redeploy after data changes)

## Vercel

1. Import the GitHub repo into Vercel.
2. Add the same environment variables.
3. Enable automatic deployments from `main`.
4. Create a Deploy Hook and store it as `VERCEL_DEPLOY_HOOK_URL`.

## Scope rules

**Included:** upcoming scheduled live instructor-led trainings with public registration.

**Excluded:** pre-recorded courses, self-paced learning, YouTube, recorded webinars, blogs, MOOCs, certifications without scheduled live sessions.

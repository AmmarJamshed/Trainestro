# Trainestro

Live professional training aggregator for Pakistan. Discover upcoming instructor-led sessions (classroom, hybrid, live online) and register on the provider's official page.

## Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **Data:** Supabase/PostgreSQL (optional) with local JSON/seed fallback
- **Scraping:** Cheerio + Axios modules per provider (Playwright available for JS-heavy sites)
- **Automation:** GitHub Actions weekly scrape → commit data → Vercel redeploy
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
| `npm run scrape` | Run all provider scrapers |
| `npm run lint` | ESLint |

## Providers (scrapers)

Initial + discovered Pakistani providers:

- NIBAF Pakistan
- Learning Resource Centre (LRC)
- atomcamp
- AI DataYard
- PixelArt Games Academy
- IBA Center for Executive Education
- IBA-CICT
- NUST IEDC / PDC

Each scraper lives under `src/lib/scrapers/providers/` and is registered in `src/lib/scrapers/registry.ts`. Failures are isolated — one provider error does not stop the rest.

## Supabase

1. Create a free Supabase project (pause an unused project if you hit the free-tier limit).
2. Run `supabase/migrations/20260711000000_init.sql` in the SQL editor.
3. Seed providers from `supabase/seed.sql`.
4. Set env vars from `.env.example`.

`country_code` on providers/trainings is ready for expansion beyond Pakistan.

## GitHub Actions

Workflow: `.github/workflows/weekly-scrape.yml`

Secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_DEPLOY_HOOK_URL` (optional)

## Vercel

1. Import the GitHub repo into Vercel.
2. Add the same environment variables.
3. Enable automatic deployments from `main`.
4. Create a Deploy Hook and store it as `VERCEL_DEPLOY_HOOK_URL`.

## Scope rules

**Included:** upcoming scheduled live instructor-led trainings with public registration.

**Excluded:** pre-recorded courses, self-paced learning, YouTube, recorded webinars, blogs, MOOCs, certifications without scheduled live sessions.

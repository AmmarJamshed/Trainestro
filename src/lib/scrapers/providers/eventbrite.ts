import { readFile } from "fs/promises";
import path from "path";
import * as cheerio from "cheerio";
import { BaseScraper, type ScraperResult } from "@/lib/scrapers/base";
import { fetchHtml } from "@/lib/scrapers/html";
import {
  inferDeliveryMode,
  normalizeScraped,
  openEnrollmentDates,
} from "@/lib/scrapers/utils";
import type { Provider, ScrapedTraining } from "@/lib/types";

export type EventbriteMarket = {
  code: string;
  key: string;
  slug: string;
  name: string;
  countryName: string;
  listingSlug: string;
  city: string;
  currency: string;
};

/** One Eventbrite provider/scraper key per country (keeps prune semantics safe). */
export const EVENTBRITE_MARKETS: EventbriteMarket[] = [
  {
    code: "SA",
    key: "eventbrite-sa",
    slug: "eventbrite-saudi-arabia",
    name: "Eventbrite Saudi Arabia",
    countryName: "Saudi Arabia",
    listingSlug: "saudi-arabia",
    city: "Riyadh",
    currency: "SAR",
  },
  {
    code: "BH",
    key: "eventbrite-bh",
    slug: "eventbrite-bahrain",
    name: "Eventbrite Bahrain",
    countryName: "Bahrain",
    listingSlug: "bahrain",
    city: "Manama",
    currency: "BHD",
  },
  {
    code: "QA",
    key: "eventbrite-qa",
    slug: "eventbrite-qatar",
    name: "Eventbrite Qatar",
    countryName: "Qatar",
    listingSlug: "qatar",
    city: "Doha",
    currency: "QAR",
  },
  {
    code: "OM",
    key: "eventbrite-om",
    slug: "eventbrite-oman",
    name: "Eventbrite Oman",
    countryName: "Oman",
    listingSlug: "oman",
    city: "Muscat",
    currency: "OMR",
  },
  {
    code: "DE",
    key: "eventbrite-de",
    slug: "eventbrite-germany",
    name: "Eventbrite Germany",
    countryName: "Germany",
    listingSlug: "germany--berlin",
    city: "Berlin",
    currency: "EUR",
  },
  {
    code: "FR",
    key: "eventbrite-fr",
    slug: "eventbrite-france",
    name: "Eventbrite France",
    countryName: "France",
    listingSlug: "france--paris",
    city: "Paris",
    currency: "EUR",
  },
  {
    code: "CZ",
    key: "eventbrite-cz",
    slug: "eventbrite-czech-republic",
    name: "Eventbrite Czech Republic",
    countryName: "Czech Republic",
    listingSlug: "czech-republic--prague",
    city: "Prague",
    currency: "CZK",
  },
  {
    code: "NL",
    key: "eventbrite-nl",
    slug: "eventbrite-netherlands",
    name: "Eventbrite Netherlands",
    countryName: "Netherlands",
    listingSlug: "netherlands--amsterdam",
    city: "Amsterdam",
    currency: "EUR",
  },
  {
    code: "CA",
    key: "eventbrite-ca",
    slug: "eventbrite-canada",
    name: "Eventbrite Canada",
    countryName: "Canada",
    listingSlug: "canada--toronto",
    city: "Toronto",
    currency: "CAD",
  },
  {
    code: "JP",
    key: "eventbrite-jp",
    slug: "eventbrite-japan",
    name: "Eventbrite Japan",
    countryName: "Japan",
    listingSlug: "japan--tokyo",
    city: "Tokyo",
    currency: "JPY",
  },
  {
    code: "MY",
    key: "eventbrite-my",
    slug: "eventbrite-malaysia",
    name: "Eventbrite Malaysia",
    countryName: "Malaysia",
    listingSlug: "malaysia--kuala-lumpur",
    city: "Kuala Lumpur",
    currency: "MYR",
  },
  {
    code: "SG",
    key: "eventbrite-sg",
    slug: "eventbrite-singapore",
    name: "Eventbrite Singapore",
    countryName: "Singapore",
    listingSlug: "singapore--singapore",
    city: "Singapore",
    currency: "SGD",
  },
];

const TRAINING_HINT =
  /\b(training|workshop|course|certificate|certification|seminar|masterclass|bootcamp|class|academy|summit|conference|exam prep|prep)\b/i;

const JUNK_HINT =
  /\b(usa only|join whatsapp|whatsapp group)\b/i;

type SeedRow = {
  title?: string;
  description?: string;
  country?: string;
  city?: string;
  location_name?: string;
  organizer?: string;
  start_date?: string | null;
  end_date?: string | null;
  register_url?: string;
};

function cleanUrl(url: string): string {
  try {
    const u = new URL(url, "https://www.eventbrite.com");
    u.search = "";
    u.hash = "";
    let p = u.pathname.replace(/\/tickets-?\d*$/i, "");
    if (!p.endsWith("/")) p += "/";
    u.pathname = p;
    return u.toString();
  } catch {
    return url.split("?")[0];
  }
}

function categoryFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/cyber|security|hack|pentest|aml|compliance|risk|governance|audit/.test(t)) {
    return "Compliance";
  }
  if (/\bai\b|machine learning|llm|agentic|generative/.test(t)) return "AI";
  if (/data|analytics|excel|bi\b/.test(t)) return "Data Science";
  if (/cloud|devops|software|coding|testing|istqb|salesforce/.test(t)) {
    return "Programming";
  }
  if (/leader|manage|coach|people|pmp|project/.test(t)) {
    return "Project Management";
  }
  if (/market|brand|social media/.test(t)) return "Marketing";
  return "Professional Development";
}

function toScraped(
  market: EventbriteMarket,
  row: {
    title: string;
    description?: string;
    city?: string;
    venue?: string;
    start_date?: string | null;
    end_date?: string | null;
    registration_url: string;
  }
): ScrapedTraining | null {
  const blob = `${row.title} ${row.description ?? ""}`;
  if (!TRAINING_HINT.test(blob) || JUNK_HINT.test(blob)) return null;
  if (!row.registration_url.includes("/e/")) return null;

  const dates = row.start_date
    ? { start_date: row.start_date.slice(0, 10), end_date: row.end_date?.slice(0, 10) ?? null }
    : openEnrollmentDates(4);

  return normalizeScraped(
    {
      title: row.title.trim(),
      description:
        (row.description || "").trim() ||
        `${row.title.trim()} — professional training listed for ${market.countryName}.`,
      category: categoryFromTitle(row.title),
      skill_tags: ["Eventbrite", market.countryName, "Live"],
      city: row.city || market.city,
      venue: row.venue || null,
      delivery_mode: inferDeliveryMode(blob),
      start_date: dates.start_date,
      end_date: dates.end_date,
      currency: market.currency,
      certificate_available: /certif|certificate|cmq|pmp|istqb|lean six/i.test(blob),
      registration_url: cleanUrl(row.registration_url),
      country_code: market.code,
      is_free: /\bfree\b/i.test(blob),
    },
    undefined,
    { allowCatalog: true }
  );
}

function parseListingHtml(html: string, market: EventbriteMarket): ScrapedTraining[] {
  const $ = cheerio.load(html);
  const found: ScrapedTraining[] = [];
  const seen = new Set<string>();

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim();
    if (!raw) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const nodes = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray((data as { "@graph"?: unknown[] })["@graph"])
        ? ((data as { "@graph": unknown[] })["@graph"] ?? [])
        : [data];

    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const obj = node as Record<string, unknown>;
      if (obj["@type"] === "ItemList" && Array.isArray(obj.itemListElement)) {
        for (const el of obj.itemListElement) {
          const item =
            el && typeof el === "object" && "item" in el
              ? ((el as { item: Record<string, unknown> }).item ?? el)
              : el;
          if (!item || typeof item !== "object") continue;
          const rec = item as Record<string, unknown>;
          const url = String(rec.url || rec["@id"] || "");
          const title = String(rec.name || "");
          const scraped = toScraped(market, {
            title,
            description: String(rec.description || ""),
            start_date: rec.startDate ? String(rec.startDate) : null,
            end_date: rec.endDate ? String(rec.endDate) : null,
            registration_url: url,
          });
          if (!scraped) continue;
          const key = scraped.registration_url;
          if (seen.has(key)) continue;
          seen.add(key);
          found.push(scraped);
        }
      }
      const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
      if (types.includes("Event")) {
        const url = String(obj.url || obj["@id"] || "");
        const scraped = toScraped(market, {
          title: String(obj.name || ""),
          description: String(obj.description || ""),
          start_date: obj.startDate ? String(obj.startDate) : null,
          end_date: obj.endDate ? String(obj.endDate) : null,
          registration_url: url,
        });
        if (!scraped) continue;
        const key = scraped.registration_url;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push(scraped);
      }
    }
  });

  if (!found.length) {
    $("a[href*='/e/']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const title = $(el).text().replace(/\s+/g, " ").trim();
      if (!href.includes("/e/") || title.length < 8) return;
      const scraped = toScraped(market, {
        title,
        registration_url: href.startsWith("http")
          ? href
          : `https://www.eventbrite.com${href}`,
      });
      if (!scraped) return;
      const key = scraped.registration_url;
      if (seen.has(key)) return;
      seen.add(key);
      found.push(scraped);
    });
  }

  return found;
}

async function loadSeedForCountry(countryName: string): Promise<SeedRow[]> {
  try {
    const file = path.join(process.cwd(), "data", "eventbrite-seed.json");
    const raw = await readFile(file, "utf8");
    const rows = JSON.parse(raw) as SeedRow[];
    return rows.filter((r) => (r.country || "").toLowerCase() === countryName.toLowerCase());
  } catch {
    return [];
  }
}

export class EventbriteCountryScraper extends BaseScraper {
  constructor(private readonly market: EventbriteMarket) {
    super();
  }

  get key() {
    return this.market.key;
  }

  get name() {
    return this.market.name;
  }

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const listing =
      provider.listing_url ||
      `https://www.eventbrite.com/d/${this.market.listingSlug}/all-events/?q=training`;
    const seen = new Set<string>();
    const trainings: ScrapedTraining[] = [];

    try {
      const html = await fetchHtml(listing);
      for (const item of parseListingHtml(html, this.market)) {
        if (seen.has(item.registration_url)) continue;
        seen.add(item.registration_url);
        trainings.push(item);
      }
    } catch (error) {
      warnings.push(
        `Eventbrite listing fetch failed (${this.market.code}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Curated seed keeps coverage when Eventbrite rate-limits runners
    const seedRows = await loadSeedForCountry(this.market.countryName);
    for (const row of seedRows) {
      const scraped = toScraped(this.market, {
        title: row.title || "",
        description: row.description,
        city: row.city || undefined,
        venue: row.location_name || undefined,
        start_date: row.start_date,
        end_date: row.end_date,
        registration_url: row.register_url || "",
      });
      if (!scraped) continue;
      if (seen.has(scraped.registration_url)) continue;
      seen.add(scraped.registration_url);
      trainings.push(scraped);
    }

    if (!trainings.length) {
      warnings.push(`No Eventbrite trainings found for ${this.market.countryName}`);
    }

    return { scraperKey: this.key, trainings, warnings };
  }
}

export const eventbriteScrapers = EVENTBRITE_MARKETS.map(
  (market) => new EventbriteCountryScraper(market)
);

export function eventbriteSeedProviders(now: string): Provider[] {
  return EVENTBRITE_MARKETS.map((market, index) => {
    const n = String(20 + index).padStart(3, "0");
    return {
      id: `11111111-1111-1111-1111-111111111${n}`,
      slug: market.slug,
      name: market.name,
      website: "https://www.eventbrite.com/",
      listing_url: `https://www.eventbrite.com/d/${market.listingSlug}/all-events/?q=training`,
      country_code: market.code,
      city: market.city,
      province: null,
      description: `Live professional trainings listed on Eventbrite in ${market.countryName}. Register on the official event page.`,
      logo_url: "/providers/eventbrite.svg",
      scraper_key: market.key,
      scraper_enabled: true,
      contact_email: null,
      contact_phone: null,
      reputation_score: 70,
      created_at: now,
      updated_at: now,
    };
  });
}

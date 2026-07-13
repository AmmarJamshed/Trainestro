import * as cheerio from "cheerio";
import axios from "axios";
import { BaseScraper, type ScraperResult } from "@/lib/scrapers/base";
import { inferDeliveryMode, normalizeScraped, parsePrice } from "@/lib/scrapers/utils";
import type { Provider, ScrapedTraining } from "@/lib/types";

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

export function parseFlexibleDate(input: string, fallbackYear = new Date().getFullYear()): string | null {
  const cleaned = input
    .replace(/(\d{1,2})(st|nd|rd|th)\b/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const iso = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = cleaned.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${month}-${day}`;
  }

  const named = cleaned.match(/(\d{1,2})\s*[-–]?\s*(\d{1,2})?\s*([A-Za-z]+)\s*,?\s*(\d{4})?/);
  if (named) {
    const month = MONTHS[named[3].toLowerCase()];
    if (month !== undefined) {
      const year = named[4] ? Number(named[4]) : fallbackYear;
      const day = Number(named[1]);
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const monthFirst = cleaned.match(/([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–]\s*\d{1,2})?,?\s*(\d{4})?/);
  if (monthFirst) {
    const month = MONTHS[monthFirst[1].toLowerCase()];
    if (month !== undefined) {
      const year = monthFirst[3] ? Number(monthFirst[3]) : fallbackYear;
      const day = Number(monthFirst[2]);
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return null;
}

export async function fetchHtml(url: string): Promise<string> {
  const { data } = await axios.get<string>(url, {
    timeout: 30000,
    headers: {
      "User-Agent":
        "TrainestroBot/1.0 (+https://trainestro.app; respectful public listing aggregator)",
      Accept: "text/html,application/xhtml+xml",
    },
    responseType: "text",
  });
  return data;
}

export function extractJsonLdEvents(html: string): ScrapedTraining[] {
  const $ = cheerio.load(html);
  const events: ScrapedTraining[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).contents().text();
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        const graph = node["@graph"] ? node["@graph"] : [node];
        for (const item of graph) {
          const type = item["@type"];
          const types = Array.isArray(type) ? type : [type];
          if (!types.some((t: string) => String(t).toLowerCase().includes("event"))) {
            continue;
          }
          const start = item.startDate?.slice?.(0, 10);
          if (!start || !item.name) continue;
          const location = item.location;
          const locName =
            typeof location === "string"
              ? location
              : location?.name || location?.address?.addressLocality || null;
          const modeText = `${item.eventAttendanceMode ?? ""} ${locName ?? ""}`;
          events.push({
            title: String(item.name),
            description: item.description ? String(item.description) : null,
            instructor: item.performer?.name ?? null,
            city: location?.address?.addressLocality ?? null,
            venue: locName,
            delivery_mode: inferDeliveryMode(modeText),
            start_date: start,
            end_date: item.endDate?.slice?.(0, 10) ?? null,
            registration_url: item.url || item.offers?.url || "",
            image_url: typeof item.image === "string" ? item.image : item.image?.[0] ?? null,
            price: item.offers?.price ? Number(item.offers.price) : null,
            is_free: item.offers?.price === 0 || item.isAccessibleForFree === true,
            certificate_available: false,
          });
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  });

  return events;
}

export class HtmlListingScraper extends BaseScraper {
  key: string;
  name: string;
  private url: string;
  private selectorHints: string[];
  private defaults: Partial<ScrapedTraining>;

  constructor(opts: {
    key: string;
    name: string;
    url: string;
    selectorHints?: string[];
    defaults?: Partial<ScrapedTraining>;
  }) {
    super();
    this.key = opts.key;
    this.name = opts.name;
    this.url = opts.url;
    this.selectorHints = opts.selectorHints ?? [
      "article",
      ".course",
      ".program",
      ".event",
      ".training",
      "li",
    ];
    this.defaults = opts.defaults ?? {};
  }

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const url = provider.listing_url || this.url;
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch (error) {
      return this.empty([
        `Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }

    const fromLd = extractJsonLdEvents(html)
      .map((item) =>
        normalizeScraped(
          {
            ...item,
            registration_url: item.registration_url || provider.website,
          },
          this.defaults
        )
      )
      .filter(Boolean) as ScrapedTraining[];

    if (fromLd.length) {
      return { scraperKey: this.key, trainings: fromLd, warnings };
    }

    const $ = cheerio.load(html);
    const found: ScrapedTraining[] = [];
    const seen = new Set<string>();

    for (const hint of this.selectorHints) {
      $(hint).each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (text.length < 20 || text.length > 800) return;

        const title =
          $(el).find("h1,h2,h3,h4,a").first().text().trim() ||
          text.slice(0, 120);
        const href = $(el).find("a[href]").first().attr("href");
        const dateMatch = text.match(
          /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/
        );
        if (!dateMatch) return;
        const start = parseFlexibleDate(dateMatch[1]);
        if (!start) return;

        const registration_url = href
          ? new URL(href, provider.website).toString()
          : provider.website;
        const key = `${title}|${start}`;
        if (seen.has(key)) return;
        seen.add(key);

        const { price, isFree } = parsePrice(text);
        const normalized = normalizeScraped(
          {
            title,
            description: text.slice(0, 500),
            delivery_mode: inferDeliveryMode(text),
            start_date: start,
            registration_url,
            price,
            is_free: isFree,
            city: this.defaults.city ?? provider.city,
            province: this.defaults.province ?? provider.province,
            category: this.defaults.category ?? null,
          },
          this.defaults
        );
        if (normalized) found.push(normalized);
      });
      if (found.length >= 5) break;
    }

    if (!found.length) {
      warnings.push(
        `No structured events found on ${url}. Provider may require a custom parser or calendar PDF.`
      );
    }

    return { scraperKey: this.key, trainings: found, warnings };
  }
}

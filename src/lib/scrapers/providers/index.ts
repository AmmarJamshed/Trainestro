import { HtmlListingScraper } from "@/lib/scrapers/html";
import { BaseScraper, type ScraperResult } from "@/lib/scrapers/base";
import { fetchHtml, parseFlexibleDate } from "@/lib/scrapers/html";
import {
  addDurationToDate,
  inferDeliveryMode,
  normalizeScraped,
  parsePrice,
} from "@/lib/scrapers/utils";
import type { Provider, ScrapedTraining } from "@/lib/types";
import * as cheerio from "cheerio";
import axios from "axios";
import { PDFParse } from "pdf-parse";

const LRC_CALENDAR_PDF =
  "https://learningresourcecentre.com/wp-content/uploads/2026/06/LRC-Training-Calendar-June-July-2026-V2.pdf";

const DATAYARD_BOOTCAMPS = [
  "https://aidatayard.com/bootcamp/applied-data-analytics/",
  "https://aidatayard.com/bootcamp/data-science-and-machine-learning/",
  "https://aidatayard.com/bootcamp/business-intelligence/",
  "https://aidatayard.com/bootcamp/ai-for-business-leaders/",
  "https://aidatayard.com/bootcamp/data-engineering/",
  "https://aidatayard.com/bootcamp/generative-ai/",
  "https://aidatayard.com/bootcamp/ai-automation/",
];

function categoryFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/cyber|pci|security|fraud/.test(t)) return "Cybersecurity";
  if (/governance|compliance|risk|capital adequacy|sbp/.test(t)) return "Compliance";
  if (/bank|finance|investment/.test(t)) return "Banking";
  if (/harassment|workplace|soft skill|behavior|acumen/.test(t)) return "HR";
  if (/data engineer/.test(t)) return "Data Science";
  if (/data|analytics|bi|business intelligence/.test(t)) return "Data Science";
  if (/agentic|generative|automation|ai\b|machine learning/.test(t)) return "AI";
  if (/python|coding|programming|github/.test(t)) return "Programming";
  return "Professional Development";
}

function cityFromVenue(venue: string): { city: string; province: string | null } {
  if (/islamabad/i.test(venue)) {
    return { city: "Islamabad", province: "Islamabad Capital Territory" };
  }
  if (/lahore/i.test(venue)) return { city: "Lahore", province: "Punjab" };
  if (/karachi|movenpick/i.test(venue)) return { city: "Karachi", province: "Sindh" };
  return { city: "Karachi", province: "Sindh" };
}

async function extractPdfText(url: string): Promise<string> {
  const { data } = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: 45000,
    headers: {
      "User-Agent":
        "TrainestroBot/1.0 (+https://trainestro.app; respectful public listing aggregator)",
      Accept: "application/pdf,*/*",
    },
  });
  const parser = new PDFParse({ data: Buffer.from(data) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy?.();
  }
}

function parseLrcCalendarText(text: string, registrationUrl: string): ScrapedTraining[] {
  const flat = text.replace(/\r/g, "\n");
  const dateRe =
    /(\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi;
  const matches = [...flat.matchAll(dateRe)];
  const trainings: ScrapedTraining[] = [];
  const year = new Date().getFullYear();

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = parseFlexibleDate(match[1], year);
    if (!start) continue;

    const from = (match.index ?? 0) + match[0].length;
    const to = i + 1 < matches.length ? matches[i + 1].index ?? flat.length : flat.length;
    const block = flat.slice(from, to);

    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter(
        (l) =>
          !/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.test(l) &&
          !/\d{1,2}:\d{2}\s*[AP]M(\s+to)?$/i.test(l) &&
          !/\d{1,2}:\d{2}\s*[AP]M\s+to/i.test(l) &&
          !/^\d+$/.test(l) &&
          !/Learning Resource Centre|Executive Training|S\.\s*No|For Any Queries|ali@|asif@|info@|0314|Contact Us|-- \d+ of|Speakers \/ Trainers|Workshop \//i.test(
            l
          )
      );

    const venueLine =
      lines.find((l) => /Hotel|Movenpick|Islamabad|Karachi|Lahore/i.test(l)) ?? "Karachi";
    const venueIdx = lines.findIndex((l) => l === venueLine);
    const beforeVenue = venueIdx >= 0 ? lines.slice(0, venueIdx) : lines;

    // Title is uppercase-ish workshop name lines before speaker bio lines
    const titleLines: string[] = [];
    let instructor: string | null = null;
    for (const line of beforeVenue) {
      if (
        titleLines.length >= 1 &&
        (/^[A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){1,3}$/.test(line) ||
          /Former |Director|Head of|CFE|CISM|Manager|Expert|Regional Head/i.test(line))
      ) {
        instructor = instructor ?? line;
        continue;
      }
      if (instructor) continue;
      titleLines.push(line);
    }

    const title = titleLines
      .join(" ")
      .replace(/^\d{1,2}:\d{2}\s*[AP]M\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || title.length < 8) continue;

    const loc = cityFromVenue(venueLine);
    const normalized = normalizeScraped({
      title,
      description: `${title} — one-day executive workshop by Learning Resource Centre. Venue: ${venueLine}. See calendar: ${registrationUrl}`,
      instructor,
      category: categoryFromTitle(title),
      skill_tags: ["Executive Training", "Workshop"],
      city: loc.city,
      province: loc.province,
      venue: venueLine,
      delivery_mode: "onsite",
      start_date: start,
      end_date: start,
      duration: "1 day",
      registration_url: "https://learningresourcecentre.com/",
      contact_info: "info@learningresourcecentre.com · 0314 2099884",
      certificate_available: true,
    });
    if (normalized) trainings.push(normalized);
  }

  return trainings;
}

export class NibafScraper extends HtmlListingScraper {
  constructor() {
    super({
      key: "nibaf",
      name: "NIBAF Pakistan",
      url: "https://nibaf.sbp.org.pk/",
      defaults: {
        category: "Banking",
        certificate_available: true,
        city: "Islamabad",
        province: "Islamabad Capital Territory",
      },
    });
  }
}

export class LrcScraper extends BaseScraper {
  key = "lrc";
  name = "Learning Resource Centre";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    let pdfUrl = LRC_CALENDAR_PDF;

    try {
      const html = await fetchHtml(provider.listing_url || provider.website);
      const $ = cheerio.load(html);
      const discovered: string[] = [];
      $('a[href*=".pdf"]').each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const abs = new URL(href, provider.website).toString();
        if (/training[-_ ]?calendar|lrc[-_ ]?training|june[-_]?july|executive[-_ ]?training/i.test(abs)) {
          discovered.unshift(abs);
        } else if (/calendar|workshop|training/i.test(abs) && !/framework|capital-adequacy|sbp-capital/i.test(abs)) {
          discovered.push(abs);
        }
      });
      if (discovered.length) pdfUrl = discovered[0];
    } catch (error) {
      warnings.push(
        `LRC homepage scan failed, using known calendar PDF: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    try {
      const text = await extractPdfText(pdfUrl);
      const trainings = parseLrcCalendarText(text, pdfUrl);
      if (!trainings.length) {
        warnings.push(`Parsed LRC PDF but found no upcoming workshops (${pdfUrl}).`);
      }
      return { scraperKey: this.key, trainings, warnings };
    } catch (error) {
      return this.empty([
        `LRC PDF scrape failed (${pdfUrl}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      ]);
    }
  }
}

export class AtomcampScraper extends BaseScraper {
  key = "atomcamp";
  name = "atomcamp";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const url = provider.listing_url || "https://www.atomcamp.com/course/";
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch (error) {
      return this.empty([
        `atomcamp fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }

    const $ = cheerio.load(html);
    const trainings: ScrapedTraining[] = [];
    const year = new Date().getFullYear();
    const seen = new Set<string>();

    $(".pp-tm").each((_, el) => {
      const title = $(el).find(".pp-tm-name").text().replace(/\s+/g, " ").trim();
      const href = $(el).find("a[href]").first().attr("href");
      const desc = $(el).find(".pp-tm-description").text().replace(/\s+/g, " ").trim();
      if (!title || !href || !desc) return;

      // Skip self-paced module packs without a calendar start date
      if (/modules?/i.test(desc) && !/\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+/i.test(desc)) {
        return;
      }

      const dateMatch = desc.match(/(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?)/i);
      if (!dateMatch) return;
      const start = parseFlexibleDate(dateMatch[1], year);
      if (!start) return;

      const durationMatch = desc.match(/(\d+\s*(?:Months?|weeks?|Days?))/i);
      const duration = durationMatch?.[1] ?? null;
      const end_date = addDurationToDate(start, duration);
      const { price, isFree } = parsePrice(desc);
      const registration_url = new URL(href, provider.website).toString();
      const key = `${title}|${start}`;
      if (seen.has(key)) return;
      seen.add(key);

      const normalized = normalizeScraped({
        title,
        description: `${title} — live instructor-led cohort at atomcamp. ${desc}`,
        category: categoryFromTitle(title),
        skill_tags: ["Bootcamp", "Live"],
        city: /nust|in-person|islamabad/i.test(desc) ? "Islamabad" : "Online",
        province: /nust|in-person|islamabad/i.test(desc)
          ? "Islamabad Capital Territory"
          : null,
        delivery_mode: inferDeliveryMode(desc),
        start_date: start,
        end_date,
        duration,
        price,
        is_free: isFree,
        certificate_available: true,
        registration_url,
      });
      if (normalized) trainings.push(normalized);
    });

    if (!trainings.length) {
      warnings.push("No dated live bootcamps parsed from atomcamp course listing.");
    }

    return { scraperKey: this.key, trainings, warnings };
  }
}

export class AiDatayardScraper extends BaseScraper {
  key = "aidatayard";
  name = "AI DataYard";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const urls = new Set<string>(DATAYARD_BOOTCAMPS);

    try {
      const indexHtml = await fetchHtml("https://aidatayard.com/bootcamp/");
      const $ = cheerio.load(indexHtml);
      $('a[href*="/bootcamp/"]').each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const abs = new URL(href, "https://aidatayard.com/").toString();
        if (/\/bootcamp\/[^/]+\/?$/.test(abs) && !abs.endsWith("/bootcamp/")) {
          urls.add(abs.replace(/\/$/, "/") === abs ? abs : `${abs.replace(/\/$/, "")}/`);
        }
      });
    } catch (error) {
      warnings.push(
        `Bootcamp index scan failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const trainings: ScrapedTraining[] = [];
    const seen = new Set<string>();

    for (const url of urls) {
      try {
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);
        const title =
          $("h1").first().text().replace(/\s+/g, " ").trim() ||
          $("title").text().split("|")[0].trim();
        const text = $("body").text().replace(/\s+/g, " ");

        const startMatch =
          text.match(/Start Date[:\s]*([0-9]{1,2}\s+[A-Za-z]+,?\s+[0-9]{4})/i) ??
          text.match(/([0-9]{1,2}\s+[A-Za-z]+,?\s+[0-9]{4})/);
        if (!startMatch) {
          warnings.push(`No start date on ${url}`);
          continue;
        }
        const start = parseFlexibleDate(startMatch[1]);
        if (!start) continue;

        const durationMatch =
          text.match(/Duration[:\s]*([0-9]+\s*Months?)/i) ??
          text.match(/([0-9]+)\s*Months?\s+long/i);
        const duration = durationMatch
          ? durationMatch[1].includes("Month")
            ? durationMatch[1]
            : `${durationMatch[1]} Months`
          : "3 Months";
        const end_date = addDurationToDate(start, duration);
        const schedule =
          text.match(/Schedule[:\s]*([A-Za-z,\s]+?)(?:Time|Start|Mode|Language)/i)?.[1]?.trim() ??
          null;
        const modeText =
          text.match(/Mode[:\s]*([A-Za-z &\-]+?)(?:Language|Duration|Schedule)/i)?.[1] ??
          "Online";
        const { price, isFree } = parsePrice(text);
        const instructor =
          text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s+(?:Global Data|Data Consultant|Instructor)/)?.[1] ??
          null;

        const description = `${title} — live interactive bootcamp at AI DataYard.${
          schedule ? ` Schedule: ${schedule}.` : ""
        } ${$("h1")
          .first()
          .parent()
          .text()
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 420)}`;

        const key = `${title}|${start}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const normalized = normalizeScraped({
          title,
          description,
          instructor,
          category: categoryFromTitle(title),
          skill_tags: ["Bootcamp", "Live", "Interactive"],
          city: "Online",
          delivery_mode: inferDeliveryMode(modeText),
          start_date: start,
          end_date,
          duration,
          price: price ?? 40000,
          is_free: isFree,
          certificate_available: true,
          registration_url: url,
        });
        if (normalized) trainings.push(normalized);
      } catch (error) {
        warnings.push(
          `Failed ${url}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (!trainings.length) {
      warnings.push("No AI DataYard bootcamps with valid live dates were found.");
    }

    return { scraperKey: this.key, trainings, warnings };
  }
}

export class PixelArtScraper extends HtmlListingScraper {
  constructor() {
    super({
      key: "pixelart",
      name: "PixelArt Games Academy",
      url: "https://pixelartga.com/gamelab/",
      defaults: {
        category: "Design",
        city: "Islamabad",
        province: "Islamabad Capital Territory",
        delivery_mode: "hybrid",
        certificate_available: true,
      },
    });
  }
}

export class IbaCeeScraper extends HtmlListingScraper {
  constructor() {
    super({
      key: "iba-cee",
      name: "IBA CEE",
      url: "https://cee.iba.edu.pk/program-calendar.php",
      selectorHints: [".program", "article", ".card", "li", "tr", "td"],
      defaults: {
        city: "Karachi",
        province: "Sindh",
        certificate_available: true,
      },
    });
  }
}

export class IbaCictScraper extends HtmlListingScraper {
  constructor() {
    super({
      key: "iba-cict",
      name: "IBA-CICT",
      url: "https://cict.iba.edu.pk/",
      defaults: {
        city: "Karachi",
        province: "Sindh",
        certificate_available: true,
      },
    });
  }
}

export class NustPdcScraper extends HtmlListingScraper {
  constructor() {
    super({
      key: "nust-pdc",
      name: "NUST IEDC/PDC",
      url: "https://pdc.nust.edu.pk/",
      defaults: {
        city: "Islamabad",
        province: "Islamabad Capital Territory",
        certificate_available: true,
      },
    });
  }
}

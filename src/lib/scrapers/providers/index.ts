import { HtmlListingScraper } from "@/lib/scrapers/html";
import { BaseScraper, type ScraperResult } from "@/lib/scrapers/base";
import { fetchHtml, parseFlexibleDate } from "@/lib/scrapers/html";
import { inferDeliveryMode, normalizeScraped } from "@/lib/scrapers/utils";
import type { Provider, ScrapedTraining } from "@/lib/types";
import * as cheerio from "cheerio";

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

export class LrcScraper extends HtmlListingScraper {
  constructor() {
    super({
      key: "lrc",
      name: "Learning Resource Centre",
      url: "https://learningresourcecentre.com/",
      defaults: {
        category: "HR",
        city: "Karachi",
        province: "Sindh",
      },
    });
  }
}

export class AtomcampScraper extends BaseScraper {
  key = "atomcamp";
  name = "atomcamp";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    let html = "";
    try {
      html = await fetchHtml(provider.listing_url || "https://www.atomcamp.com/");
    } catch (error) {
      return this.empty([
        `atomcamp fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }

    const $ = cheerio.load(html);
    const trainings: ScrapedTraining[] = [];
    const year = new Date().getFullYear();

    $("h1,h2,h3,h4").each((_, el) => {
      const title = $(el).text().replace(/\s+/g, " ").trim();
      if (!/bootcamp|program|course/i.test(title)) return;

      const block = $(el).parent().text().replace(/\s+/g, " ").trim();
      const startMatch = block.match(/Starting\s+([A-Za-z0-9 ,\-–]+)/i)
        ?? block.match(/(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+)/);
      if (!startMatch) return;
      const start = parseFlexibleDate(startMatch[1], year);
      if (!start) return;

      const normalized = normalizeScraped({
        title,
        description: block.slice(0, 600),
        category: /data/i.test(title) ? "Data Science" : "AI",
        skill_tags: ["AI", "Bootcamp"],
        city: "Islamabad",
        province: "Islamabad Capital Territory",
        delivery_mode: inferDeliveryMode(block),
        start_date: start,
        registration_url: provider.website,
        certificate_available: true,
      });
      if (normalized) trainings.push(normalized);
    });

    if (!trainings.length) {
      warnings.push("No bootcamp start dates parsed from atomcamp homepage.");
    }

    return { scraperKey: this.key, trainings, warnings };
  }
}

export class AiDatayardScraper extends BaseScraper {
  key = "aidatayard";
  name = "AI DataYard";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const url =
      provider.listing_url || "https://aidatayard.com/bootcamp/generative-ai/";
    const warnings: string[] = [];
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch (error) {
      return this.empty([
        `AI DataYard fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }

    const $ = cheerio.load(html);
    const text = $("body").text().replace(/\s+/g, " ");
    const title =
      $("h1").first().text().trim() || "Generative AI Bootcamp";
    const dateMatch = text.match(/(\d{1,2}\s+[A-Za-z]+,?\s+\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
    const start = dateMatch ? parseFlexibleDate(dateMatch[1]) : null;
    const priceMatch = text.match(/PKR\s*([\d,]+)/i);
    const instructor =
      text.match(/Ehtisham[^\.]{0,40}/)?.[0] ?? "Ehtisham";

    const trainings: ScrapedTraining[] = [];
    if (start) {
      const normalized = normalizeScraped({
        title,
        description:
          "Live interactive Generative AI bootcamp covering LangChain, HuggingFace, agents, and product workflows.",
        instructor,
        category: "AI",
        skill_tags: ["Generative AI", "LangChain", "Agents"],
        city: "Online",
        delivery_mode: "online",
        start_date: start,
        duration: "3 months",
        price: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : 40000,
        is_free: false,
        certificate_available: true,
        registration_url: url,
      });
      if (normalized) trainings.push(normalized);
    } else {
      warnings.push("Could not parse start date from AI DataYard page.");
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
      selectorHints: [".program", "article", ".card", "li", "tr"],
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

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

const UA =
  "TrainestroBot/1.0 (+https://trainestro.app; respectful public listing aggregator)";

function categoryFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/cyber|security|blockchain|fintech/.test(t)) return "Cybersecurity";
  if (/data|analytics|bi\b|machine learning/.test(t)) return "Data Science";
  if (/cloud|azure|devops/.test(t)) return "Cloud";
  if (/\bai\b|agentic|generative|llm|copilot/.test(t)) return "AI";
  if (/python|coding|software|programming|web/.test(t)) return "Programming";
  if (/leader|board|management|executive|project/.test(t)) {
    return "Professional Development";
  }
  if (/market|sales|brand/.test(t)) return "Marketing";
  if (/finance|wealth|banking|accounting/.test(t)) return "Finance";
  return "Professional Development";
}

function parseGbp(text: string): number | null {
  const m = text.replace(/,/g, "").match(/£\s*([\d]+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function parseDateRange(text: string): { start: string | null; end: string | null } {
  const year = new Date().getFullYear();
  const range = text.match(
    /([A-Za-z]+|\d{1,2})\s*(\d{1,2})?\s*[-–]\s*(\d{1,2})?,?\s*([A-Za-z]+)?\s*,?\s*(\d{4})?/
  );
  // Prefer explicit "Mon D, YYYY - Mon D, YYYY" or "Mon D - D, YYYY"
  const dual = text.match(
    /([A-Za-z]{3,9}\.?\s+\d{1,2}(?:,?\s*\d{4})?)\s*[-–]\s*([A-Za-z]{3,9}\.?\s+\d{1,2}(?:,?\s*\d{4})?)/i
  );
  if (dual) {
    let start = parseFlexibleDate(dual[1], year);
    let end = parseFlexibleDate(dual[2], year);
    if (start && !dual[1].match(/\d{4}/) && end?.slice(0, 4)) {
      start = parseFlexibleDate(`${dual[1]}, ${end.slice(0, 4)}`, year) ?? start;
    }
    if (end && !dual[2].match(/\d{4}/) && start?.slice(0, 4)) {
      end = parseFlexibleDate(`${dual[2]}, ${start.slice(0, 4)}`, year) ?? end;
    }
    return { start, end };
  }
  const single = text.match(
    /([A-Za-z]{3,9}\.?\s+\d{1,2}(?:\s*[-–]\s*\d{1,2})?,?\s*\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i
  );
  if (single) {
    const start = parseFlexibleDate(single[1], year);
    return { start, end: start };
  }
  void range;
  const start = parseFlexibleDate(text, year);
  return { start, end: start };
}

/** LUMS Rausing Executive Development Centre */
export class LumsRedcScraper extends BaseScraper {
  key = "lums-redc";
  name = "LUMS REDC";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const url = provider.listing_url || "https://redc.lums.edu.pk/program-calendar";
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch (error) {
      return this.empty([
        `LUMS REDC fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }

    const $ = cheerio.load(html);
    const trainings: ScrapedTraining[] = [];
    const seen = new Set<string>();

    $("a[href*='/open-programs/']").each((_, el) => {
      const href = $(el).attr("href");
      const dateText = $(el).text().replace(/\s+/g, " ").trim();
      if (!href || !/\d{4}/.test(dateText)) return;

      const parentMenu = $(el).closest("li.dropdown-submenu").children("a").first();
      let title = parentMenu.text().replace(/\s+/g, " ").trim();
      title = title.replace(/\s*<.*$/, "").replace(/\s*-\s*New\s*$/i, "").trim();
      if (!title || title.length < 4) {
        title = href
          .split("/open-programs/")[1]
          ?.split("?")[0]
          ?.replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";
      }
      if (!title) return;

      const { start, end } = parseDateRange(dateText);
      if (!start) return;
      const registration_url = new URL(href, "https://redc.lums.edu.pk").toString();
      const key = `${title}|${start}`;
      if (seen.has(key)) return;
      seen.add(key);

      const normalized = normalizeScraped({
        title,
        description: `${title} — live executive programme at LUMS REDC. Session: ${dateText}.`,
        category: categoryFromTitle(title),
        skill_tags: ["LUMS", "Executive", "Live"],
        city: "Lahore",
        province: "Punjab",
        delivery_mode: "onsite",
        start_date: start,
        end_date: end,
        price: null,
        is_free: false,
        currency: "PKR",
        certificate_available: true,
        registration_url,
        country_code: "PK",
      });
      if (normalized) trainings.push(normalized);
    });

    if (!trainings.length) warnings.push("No dated LUMS REDC programmes parsed.");
    return { scraperKey: this.key, trainings: trainings.slice(0, 60), warnings };
  }
}

/** LUMS Centre for Continuing Education Studies */
export class LumsCesScraper extends BaseScraper {
  key = "lums-ces";
  name = "LUMS CES";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const url =
      provider.listing_url || "https://ces.lums.edu.pk/programme-calendar.php";
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch (error) {
      return this.empty([
        `LUMS CES fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }

    const $ = cheerio.load(html);
    const trainings: ScrapedTraining[] = [];
    const seen = new Set<string>();

    $(".calendar-items .row").each((_, el) => {
      const dateText = $(el).find(".date").text().replace(/\s+/g, " ").trim();
      const a = $(el).find("a").first();
      const title = a.text().replace(/\s+/g, " ").trim();
      const href = a.attr("href");
      if (!title || !dateText || !href) return;
      // Skip kids/O-level summer camps
      if (/session\s*\d|years\)|o-level|a-level|8 - 10/i.test(title)) return;

      const { start, end } = parseDateRange(dateText);
      if (!start) return;
      const registration_url = new URL(href, "https://ces.lums.edu.pk/").toString();
      const key = `${title}|${start}`;
      if (seen.has(key)) return;
      seen.add(key);

      const normalized = normalizeScraped({
        title,
        description: `${title} — live short course at LUMS Centre for Continuing Education Studies. ${dateText}.`,
        category: categoryFromTitle(title),
        skill_tags: ["LUMS", "CES", "Live"],
        city: "Lahore",
        province: "Punjab",
        delivery_mode: "onsite",
        start_date: start,
        end_date: end,
        price: null,
        is_free: false,
        currency: "PKR",
        certificate_available: true,
        registration_url,
        country_code: "PK",
      });
      if (normalized) trainings.push(normalized);
    });

    if (!trainings.length) warnings.push("No dated LUMS CES programmes parsed.");
    return { scraperKey: this.key, trainings: trainings.slice(0, 60), warnings };
  }
}

/** FAST NUCES Centre of Excellence in Entrepreneurship */
export class FastCoeeScraper extends BaseScraper {
  key = "fast-coee";
  name = "FAST NUCES CoEE";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const url = provider.listing_url || "https://nu.edu.pk/CoEE/TDevProg";
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch (error) {
      return this.empty([
        `FAST CoEE fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }

    const $ = cheerio.load(html);
    const trainings: ScrapedTraining[] = [];
    const rows = $("table tr").toArray();
    const year = new Date().getFullYear();

    type Pending = { title: string; meta: string; city: string };
    let pending: Pending | null = null;

    const cityFrom = (text: string): string => {
      if (/karachi/i.test(text)) return "Karachi";
      if (/lahore/i.test(text)) return "Lahore";
      return "Islamabad";
    };

    const emit = (
      p: Pending,
      dateText: string,
      enrollHref: string | undefined
    ) => {
      const dates = [
        ...dateText.matchAll(
          /([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/g
        ),
      ].map((m) => m[1]);
      const start = dates[0] ? parseFlexibleDate(dates[0], year) : null;
      const end = dates[1]
        ? parseFlexibleDate(dates[1], year)
        : start
          ? addDurationToDate(start, "5 days")
          : null;
      if (!start) return;

      const { price } = parsePrice(p.meta);
      const city = p.city;
      const title = /karachi|lahore|islamabad/i.test(p.title)
        ? p.title
        : `${p.title} (${city})`;

      const normalized = normalizeScraped({
        title,
        description: `${p.title} — live professional training at FAST NUCES Centre of Excellence. ${p.meta.slice(0, 280)}`,
        category: categoryFromTitle(p.title),
        skill_tags: ["FAST", "CoEE", "Live"],
        city,
        province:
          city === "Karachi"
            ? "Sindh"
            : city === "Lahore"
              ? "Punjab"
              : "Islamabad Capital Territory",
        delivery_mode: inferDeliveryMode(p.meta),
        start_date: start,
        end_date: end,
        price: price ?? null,
        is_free: false,
        currency: "PKR",
        certificate_available: true,
        registration_url: new URL(enrollHref || url, "https://nu.edu.pk").toString(),
        country_code: "PK",
      });
      if (normalized) trainings.push(normalized);
    };

    for (let i = 0; i < rows.length; i++) {
      const cells = $(rows[i])
        .find("td")
        .map((_, td) => $(td).text().replace(/\s+/g, " ").trim())
        .get();
      if (!cells.length) continue;
      const joined = cells.join(" ");
      const enrollHref = $(rows[i]).find("a[href]").last().attr("href");

      const titleCell = cells.find((c) =>
        /program|workshop|certified|blockchain|ai\b|fintech|leadership|management|literature|smart pls|cryptocurrency/i.test(
          c
        )
      );
      const dateOnly =
        cells.length <= 3 &&
        cells.every((c) =>
          /^[A-Za-z]+\s+\d{1,2},?\s+\d{4}$|^\d{1,2}\s+[A-Za-z]+\s+\d{4}$/.test(c)
        );

      if (titleCell && cells.length >= 3 && !dateOnly) {
        pending = {
          title: titleCell.replace(/\( Detail \)/i, "").trim(),
          meta: joined,
          city: cityFrom(joined),
        };
        if (/[A-Za-z]+\s+\d{1,2},?\s+\d{4}/.test(joined)) {
          emit(pending, joined, enrollHref);
          pending = null;
        }
        continue;
      }

      if (
        !titleCell &&
        !dateOnly &&
        pending !== null &&
        /karachi|lahore|islamabad|on-premises|on campus/i.test(joined)
      ) {
        pending = {
          title: pending.title,
          meta: `${pending.meta} ${joined}`,
          city: cityFrom(joined),
        };
        continue;
      }

      if (pending !== null && dateOnly) {
        emit(pending, joined, enrollHref);
      }
    }

    if (!trainings.length) warnings.push("No dated FAST CoEE programmes parsed.");
    return { scraperKey: this.key, trainings: trainings.slice(0, 40), warnings };
  }
}

/** Stanford Continuing Studies */
export class StanfordCsScraper extends BaseScraper {
  key = "stanford-cs";
  name = "Stanford Continuing Studies";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const url =
      provider.listing_url ||
      "https://continuingstudies.stanford.edu/courses/courses-by-start-date";
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch (error) {
      return this.empty([
        `Stanford CS fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }

    const $ = cheerio.load(html);
    const trainings: ScrapedTraining[] = [];
    const seen = new Set<string>();
    let currentStart: string | null = null;
    const year = new Date().getFullYear();

    $("h2, h3, table tr").each((_, el) => {
      const tagName = String((el as { name?: string }).name || "").toLowerCase();
      if (tagName === "h2" || tagName === "h3") {
        const heading = $(el).text().replace(/\s+/g, " ").trim();
        currentStart = parseFlexibleDate(heading, year);
        return;
      }

      const cells = $(el)
        .find("td")
        .map((_, td) => $(td).text().replace(/\s+/g, " ").trim())
        .get();
      if (cells.length < 2 || !currentStart) return;

      const status = cells.join(" ");
      if (/closed/i.test(status) && !/open/i.test(status)) return;

      const code = cells[0];
      const title = cells[1];
      if (!title || title.length < 4 || /course title/i.test(title)) return;
      // Prefer professional / tech / business
      if (
        !/ai|data|business|python|machine|coding|product|management|finance|cyber|software|analytics|leadership|design/i.test(
          `${code} ${title}`
        )
      ) {
        return;
      }

      const format = cells.find((c) => /online|on-campus|hybrid/i.test(c)) ?? "Online";
      const key = `${title}|${currentStart}`;
      if (seen.has(key)) return;
      seen.add(key);

      const link =
        $(el).find("a[href]").first().attr("href") ||
        "https://continuingstudies.stanford.edu/courses/courses-by-start-date";

      const normalized = normalizeScraped({
        title,
        description: `${title} (${code}) — Stanford Continuing Studies. Format: ${format}. Live instructor-led session.`,
        category: categoryFromTitle(title),
        skill_tags: ["Stanford", "Continuing Studies", "Live"],
        city: /online/i.test(format) ? "Online" : "Stanford",
        province: "California",
        delivery_mode: inferDeliveryMode(format),
        start_date: currentStart,
        end_date: addDurationToDate(currentStart, "8 weeks"),
        duration: "Course term",
        price: null,
        is_free: false,
        currency: "USD",
        certificate_available: true,
        registration_url: new URL(link, "https://continuingstudies.stanford.edu").toString(),
        country_code: "US",
      });
      if (normalized) trainings.push(normalized);
    });

    if (!trainings.length) warnings.push("No open Stanford Continuing Studies courses parsed.");
    return { scraperKey: this.key, trainings: trainings.slice(0, 50), warnings };
  }
}

/** Flatiron School certificate cohorts */
export class FlatironScraper extends BaseScraper {
  key = "flatiron";
  name = "Flatiron School";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const url =
      provider.listing_url || "https://flatironschool.com/courses/certificate-programs/";
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch (error) {
      return this.empty([
        `Flatiron fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }

    const $ = cheerio.load(html);
    const trainings: ScrapedTraining[] = [];
    const year = new Date().getFullYear();

    // Cohort calendar uses <th scope="row"> for the start date cell.
    $("table").each((_, table) => {
      $(table)
        .find("tr")
        .each((__, el) => {
          const cells = $(el)
            .find("td, th")
            .map((_, td) => $(td).text().replace(/\s+/g, " ").trim())
            .get()
            .map((c) => c.replace(/\s+/g, " ").trim())
            .filter(Boolean);
          if (cells.length < 2) return;
          const joined = cells.join(" | ");
          if (/start date|cookie|duration|description/i.test(joined)) return;

          const startMatch = joined.match(
            /([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/
          );
          if (!startMatch) return;
          const start = parseFlexibleDate(startMatch[1], year);
          if (!start) return;

          const location =
            cells.find((c) => /online|new york|nyc|remote|hybrid/i.test(c)) ?? "Online";
          const discipline =
            cells.find((c) =>
              /artificial intelligence|software|cyber|data science|ux|product|ai\b/i.test(c)
            ) ??
            (/artificial intelligence/i.test(joined)
              ? "Artificial Intelligence"
              : "Certificate Program");

          const normalized = normalizeScraped({
            title: `${discipline} Certificate`,
            description: `${discipline} certificate cohort at Flatiron School. Location: ${location}. Live instructor-led program.`,
            category: categoryFromTitle(discipline),
            skill_tags: ["Flatiron", "Bootcamp", "Live"],
            city: /online/i.test(location) ? "Online" : location,
            delivery_mode: inferDeliveryMode(location),
            start_date: start,
            end_date: addDurationToDate(start, "15 weeks"),
            duration: "Cohort",
            price: null,
            is_free: false,
            currency: "USD",
            certificate_available: true,
            registration_url: url,
            country_code: "US",
          });
          if (normalized) trainings.push(normalized);
        });
    });

    if (!trainings.length) warnings.push("No Flatiron cohort start dates parsed.");
    return { scraperKey: this.key, trainings, warnings };
  }
}

/** Imperial College Lifelong Learning */
export class ImperialLllScraper extends BaseScraper {
  key = "imperial-lll";
  name = "Imperial Lifelong Learning";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const trainings: ScrapedTraining[] = [];
    const seen = new Set<string>();
    const base =
      provider.listing_url || "https://www.imperial.ac.uk/lifelong-learning/courses/";

    for (let page = 1; page <= 5; page++) {
      const url = page === 1 ? base : `${base}?page=${page}`;
      let html = "";
      try {
        html = await fetchHtml(url);
      } catch (error) {
        warnings.push(
          `Imperial page ${page} failed: ${error instanceof Error ? error.message : String(error)}`
        );
        break;
      }

      const $ = cheerio.load(html);
      const cards = $("a.listing-item");
      if (!cards.length) break;

      cards.each((_, el) => {
        const title = $(el).find(".listing-item__title").text().replace(/\s+/g, " ").trim();
        const href = $(el).attr("href");
        const desc = $(el).find("p.step--1").first().text().replace(/\s+/g, " ").trim();
        if (/applications for this .* are now closed/i.test(desc)) return;
        const meta = $(el).find(".listing-item__meta").text().replace(/\s+/g, " ");
        const startLabel =
          $(el).find("[aria-label^='Start date']").attr("aria-label")?.replace(/^Start date:\s*/i, "") ||
          meta.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/)?.[1];
        if (!title || !href || !startLabel) return;
        const start = parseFlexibleDate(startLabel);
        if (!start) return;

        const costLabel =
          $(el).find("[aria-label^='Course cost']").attr("aria-label") || meta;
        const price = parseGbp(costLabel);
        const type = $(el).find(".tag").text().replace(/\s+/g, " ").trim();
        const registration_url = new URL(href, "https://www.imperial.ac.uk").toString();
        const key = `${title}|${start}`;
        if (seen.has(key)) return;
        seen.add(key);

        const normalized = normalizeScraped({
          title,
          description: `${title} — ${type || "Imperial Lifelong Learning"}. ${desc.slice(0, 280)} Live instructor-led programme.`,
          category: categoryFromTitle(title),
          skill_tags: ["Imperial", "Lifelong Learning", "Live"],
          city: "London",
          province: "England",
          delivery_mode: /online/i.test(`${type} ${desc}`) ? "online" : "onsite",
          start_date: start,
          end_date: addDurationToDate(start, "1 weeks"),
          price,
          is_free: price === 0,
          currency: "GBP",
          certificate_available: true,
          registration_url,
          country_code: "GB",
        });
        if (normalized) trainings.push(normalized);
      });
    }

    if (!trainings.length) warnings.push("No Imperial Lifelong Learning courses parsed.");
    return { scraperKey: this.key, trainings: trainings.slice(0, 50), warnings };
  }
}

/** University of Manchester Dubai — short executive courses */
export class ManchesterDubaiScraper extends BaseScraper {
  key = "manchester-dubai";
  name = "Manchester Dubai Executive Education";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const url =
      provider.listing_url ||
      "https://www.manchester.ac.ae/executive-education/short-business-courses";
    let html = "";
    try {
      const { data } = await axios.get<string>(url, {
        timeout: 35000,
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      html = data;
    } catch (error) {
      return this.empty([
        `Manchester Dubai fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }

    const $ = cheerio.load(html);
    const trainings: ScrapedTraining[] = [];
    const seen = new Set<string>();
    const year = new Date().getFullYear();

    // Webflow cards: look for headings near upcoming session text
    $("h1,h2,h3,h4").each((_, el) => {
      const title = $(el).text().replace(/\s+/g, " ").trim();
      if (!title || title.length < 8 || title.length > 120) return;
      if (/why manchester|short business|navigation|footer/i.test(title)) return;

      const block = $(el).parent().text().replace(/\s+/g, " ");
      const session =
        block.match(/Upcoming session[:\s]*([A-Za-z0-9,\s–-]+?\d{4})/i)?.[1] ||
        block.match(/(\d{1,2}\s*[–-]\s*\d{1,2}\s+[A-Za-z]+\s+\d{4})/i)?.[1] ||
        block.match(/([A-Za-z]+\s+\d{1,2}\s*[–-]\s*\d{1,2},?\s+\d{4})/i)?.[1];
      if (!session) return;

      const { start, end } = parseDateRange(session);
      if (!start) {
        const s2 = parseFlexibleDate(session, year);
        if (!s2) return;
      }
      const startDate = start || parseFlexibleDate(session, year);
      if (!startDate) return;

      const href =
        $(el).closest("a").attr("href") ||
        $(el).parent().find("a[href]").first().attr("href") ||
        url;

      const key = `${title}|${startDate}`;
      if (seen.has(key)) return;
      seen.add(key);

      const normalized = normalizeScraped({
        title,
        description: `${title} — University of Manchester short executive course (Dubai centre). Upcoming session: ${session}. Live instructor-led.`,
        category: categoryFromTitle(title),
        skill_tags: ["Manchester", "Executive", "Live", "UAE"],
        city: /manchester/i.test(block) && !/dubai/i.test(block) ? "Manchester" : "Dubai",
        province: /manchester/i.test(block) && !/dubai/i.test(block) ? "England" : "Dubai",
        delivery_mode: "onsite",
        start_date: startDate,
        end_date: end || addDurationToDate(startDate, "4 days"),
        price: null,
        is_free: false,
        currency: "AED",
        certificate_available: true,
        registration_url: new URL(href, "https://www.manchester.ac.ae").toString(),
        country_code: /manchester campus|uk\b/i.test(block) ? "GB" : "AE",
      });
      if (normalized) trainings.push(normalized);
    });

    if (!trainings.length) {
      warnings.push("No Manchester Dubai short courses with session dates parsed.");
    }
    return { scraperKey: this.key, trainings: trainings.slice(0, 30), warnings };
  }
}

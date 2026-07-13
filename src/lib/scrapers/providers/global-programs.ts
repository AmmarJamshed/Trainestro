import { BaseScraper, type ScraperResult } from "@/lib/scrapers/base";
import {
  inferDeliveryMode,
  normalizeScraped,
  openEnrollmentDates,
} from "@/lib/scrapers/utils";
import type { Provider, ScrapedTraining } from "@/lib/types";
import axios from "axios";
import * as cheerio from "cheerio";

const UA =
  "TrainestroBot/1.0 (+https://trainestro.app; respectful public listing aggregator)";

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/cyber|security|ctf/.test(t)) return "Cybersecurity";
  if (/data|analytics|bi\b/.test(t)) return "Data Science";
  if (/cloud|azure|oci|aws/.test(t)) return "Cloud";
  if (/flutter|android|mobile|kotlin/.test(t)) return "Mobile";
  if (/web|asp\.net|javascript|frontend/.test(t)) return "Programming";
  if (/ai|gemini|ml|machine learning|genai|agent/.test(t)) return "AI";
  return "Professional Development";
}

function provinceForCity(
  country: string | null | undefined,
  city: string | null | undefined
): string | null {
  if (!city) return null;
  const c = city.toLowerCase();
  const code = (country || "").toUpperCase();

  if (code === "PK") {
    if (c.includes("karachi")) return "Sindh";
    if (c.includes("lahore") || c.includes("faisalabad") || c.includes("multan")) {
      return "Punjab";
    }
    if (c.includes("islamabad") || c.includes("rawalpindi")) {
      return "Islamabad Capital Territory";
    }
    if (c.includes("peshawar")) return "Khyber Pakhtunkhwa";
    if (c.includes("quetta")) return "Balochistan";
    return null;
  }

  if (code === "AE") {
    if (c.includes("dubai")) return "Dubai";
    if (c.includes("abu dhabi")) return "Abu Dhabi";
    if (c.includes("sharjah")) return "Sharjah";
    if (c.includes("ajman")) return "Ajman";
    if (c.includes("ras al") || c.includes("rak")) return "Ras Al Khaimah";
    if (c.includes("al ain")) return "Abu Dhabi";
    return null;
  }

  if (code === "GB") {
    if (c.includes("edinburgh") || c.includes("glasgow")) return "Scotland";
    if (c.includes("cardiff") || c.includes("swansea")) return "Wales";
    if (c.includes("belfast")) return "Northern Ireland";
    return "England";
  }

  return null;
}

function currencyForGdgCountry(country: string | null | undefined) {
  switch ((country || "").toUpperCase()) {
    case "AE":
      return "AED";
    case "GB":
      return "GBP";
    case "PK":
      return "PKR";
    case "US":
    default:
      return "USD";
  }
}

function countryLabel(code: string) {
  switch (code) {
    case "PK":
      return "Pakistan";
    case "AE":
      return "UAE";
    case "US":
      return "USA";
    case "GB":
      return "UK";
    default:
      return code;
  }
}

const GDG_TARGET_COUNTRIES: {
  code: string;
  query: string;
  chapterLimit: number;
  eventCap: number;
}[] = [
  { code: "PK", query: "Pakistan", chapterLimit: 80, eventCap: 80 },
  { code: "AE", query: "United Arab Emirates", chapterLimit: 40, eventCap: 80 },
  { code: "US", query: "United States", chapterLimit: 40, eventCap: 80 },
  { code: "GB", query: "United Kingdom", chapterLimit: 40, eventCap: 80 },
];

/** Chapter search is geo-biased; curated slugs cover major AE/US/GB cities reliably. */
const GDG_CURATED_CHAPTER_SLUGS = [
  // UAE
  "gdg-dubai",
  "gdg-abu-dhabi",
  "gdg-sharjah",
  "gdg-ajman",
  "gdg-al-ain",
  "gdg-ras-al-khaimah",
  // UK
  "gdg-london",
  "gdg-cloud-london",
  "gdg-manchester",
  "gdg-birmingham",
  "gdg-edinburgh",
  "gdg-glasgow",
  "gdg-bristol",
  "gdg-leeds",
  "gdg-cambridge",
  "gdg-oxford",
  "gdg-liverpool",
  "gdg-brighton",
  "gdg-belfast",
  "gdg-cardiff",
  // USA
  "gdg-nyc",
  "gdg-cloud-nyc",
  "gdg-san-francisco",
  "gdg-silicon-valley",
  "gdg-los-angeles",
  "gdg-chicago",
  "gdg-seattle",
  "gdg-austin",
  "gdg-boston",
  "gdg-washington-dc",
  "gdg-atlanta",
  "gdg-dallas",
  "gdg-denver",
  "gdg-miami",
  "gdg-philadelphia",
  "gdg-portland",
  "gdg-san-diego",
  "gdg-minneapolis",
  "gdg-detroit",
  "gdg-houston",
];

const TARGET_COUNTRY_SET = new Set(GDG_TARGET_COUNTRIES.map((c) => c.code));

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GdgSearchEvent = {
  title?: string;
  description_short?: string;
  start_date?: string;
  end_date?: string;
  url?: string;
  picture?: { url?: string } | null;
  chapter?: {
    title?: string;
    city?: string;
    country?: string;
    url?: string;
  } | null;
};

type GdgSlimEvent = {
  title?: string;
  description_short?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  static_url?: string;
  picture?: string | null;
  audience_type?: string;
  is_virtual_event?: boolean;
  chapter_title?: string;
};

function mapGdgEvent(
  e: {
    title: string;
    description?: string | null;
    start_date: string;
    end_date?: string | null;
    registration_url: string;
    city?: string | null;
    country?: string | null;
    chapterTitle?: string | null;
    image_url?: string | null;
    audience?: string | null;
  }
): ScrapedTraining | null {
  const country = (e.country || "").toUpperCase() || null;
  const city = e.city || "Online";
  const virtual =
    /virtual|online/i.test(e.audience ?? "") ||
    city.toLowerCase() === "online" ||
    Boolean(e.audience?.toUpperCase() === "VIRTUAL");
  const venue = e.chapterTitle
    ? `${e.chapterTitle}${virtual ? " (Virtual)" : ""}`
    : virtual
      ? "Live Online Community Event"
      : city;

  const tag =
    country && TARGET_COUNTRY_SET.has(country) ? countryLabel(country) : null;

  return normalizeScraped({
    title: e.title,
    description:
      e.description ||
      `Live Google Developer Groups community event${
        e.chapterTitle ? ` by ${e.chapterTitle}` : ""
      }.`,
    category: categoryFromTitle(e.title),
    skill_tags: ["GDG", "Community", "Live", ...(tag ? [tag] : [])],
    city: virtual ? "Online" : city,
    province: virtual ? null : provinceForCity(country, city),
    venue,
    delivery_mode: virtual ? "online" : inferDeliveryMode(venue),
    start_date: e.start_date.slice(0, 10),
    end_date: e.end_date ? e.end_date.slice(0, 10) : e.start_date.slice(0, 10),
    duration: "1 day",
    price: 0,
    is_free: true,
    currency: currencyForGdgCountry(country),
    certificate_available: false,
    registration_url: e.registration_url,
    image_url: e.image_url ?? null,
    country_code: country,
  });
}

export class GdgScraper extends BaseScraper {
  key = "gdg";
  name = "Google Developer Groups";

  private async fetchChapterEvents(
    chapterId: number,
    meta: { city?: string | null; country: string; title?: string | null },
    push: (item: ScrapedTraining | null) => void
  ) {
    const { data: events } = await axios.get<{ results?: GdgSlimEvent[] }>(
      `https://gdg.community.dev/api/event_slim/for_chapter/${chapterId}/`,
      {
        params: { page_size: 50 },
        timeout: 15000,
        headers: { Accept: "application/json", "User-Agent": UA },
      }
    );
    for (const e of events.results ?? []) {
      if (!e.title || !e.start_date || !e.static_url) continue;
      const desc = stripHtml(e.description_short || e.description || "");
      push(
        mapGdgEvent({
          title: e.title,
          description: desc
            ? `${e.title} — live GDG community session. ${desc.slice(0, 420)}`
            : null,
          start_date: e.start_date,
          end_date: e.end_date ?? e.start_date,
          registration_url: e.static_url,
          city: meta.city ?? null,
          country: meta.country,
          chapterTitle: e.chapter_title || meta.title || null,
          image_url: e.picture ?? null,
          audience: e.audience_type ?? null,
        })
      );
    }
  }

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const trainings: ScrapedTraining[] = [];
    const seen = new Set<string>();

    const push = (item: ScrapedTraining | null) => {
      if (!item) return;
      const key = `${item.title.toLowerCase()}|${item.start_date}|${item.country_code ?? ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      trainings.push(item);
    };

    // Deep upcoming feed — primary source for US/GB/AE/PK when chapter search is geo-biased
    try {
      for (let page = 1; page <= 30; page++) {
        try {
          const { data } = await axios.get<{ results?: GdgSearchEvent[] }>(
            "https://gdg.community.dev/api/search/",
            {
              params: {
                result_types: "upcoming_event",
                page_size: 50,
                page,
              },
              timeout: 25000,
              headers: { Accept: "application/json", "User-Agent": UA },
            }
          );
          const results = data.results ?? [];
          if (!results.length) break;

          for (const e of results) {
            if (!e.title || !e.start_date || !e.url) continue;
            const country = (e.chapter?.country ?? "").toUpperCase();
            if (!TARGET_COUNTRY_SET.has(country)) continue;
            push(
              mapGdgEvent({
                title: e.title,
                description: e.description_short
                  ? `${e.title} — live GDG community session. ${e.description_short}`
                  : null,
                start_date: e.start_date,
                end_date: e.end_date ?? e.start_date,
                registration_url: e.url,
                city: e.chapter?.city ?? null,
                country,
                chapterTitle: e.chapter?.title ?? null,
                image_url: e.picture?.url ?? null,
              })
            );
          }
          await sleep(120);
        } catch (error) {
          const status = axios.isAxiosError(error) ? error.response?.status : null;
          if (status === 429) {
            warnings.push(`GDG upcoming rate-limited at page ${page}; backing off.`);
            await sleep(2500);
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      warnings.push(
        `GDG search API failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Pakistan chapter search works from regional IPs; filter strictly to PK
    try {
      const { data: chapterSearch } = await axios.get<{
        results?: {
          relative_url?: string;
          title?: string;
          city?: string;
          country?: string;
        }[];
      }>("https://gdg.community.dev/api/search/", {
        params: { result_types: "chapter", query: "Pakistan", page_size: 100 },
        timeout: 25000,
        headers: { Accept: "application/json", "User-Agent": UA },
      });

      const chapters = (chapterSearch.results ?? []).filter(
        (c) => (c.country || "").toUpperCase() === "PK"
      );

      for (const ch of chapters.slice(0, 80)) {
        const slug = (ch.relative_url ?? "").replace(/^\/|\/$/g, "");
        if (!slug) continue;
        try {
          await sleep(80);
          const { data: slim } = await axios.get<{ id?: number }>(
            `https://gdg.community.dev/api/chapter_slim/${slug}/`,
            {
              timeout: 12000,
              headers: { Accept: "application/json", "User-Agent": UA },
              validateStatus: () => true,
            }
          );
          if (!slim?.id) continue;
          await this.fetchChapterEvents(
            slim.id,
            { city: ch.city, country: "PK", title: ch.title },
            push
          );
        } catch {
          // skip flaky chapter
        }
      }
    } catch (error) {
      warnings.push(
        `GDG Pakistan chapters scan failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Curated AE/US/GB city chapters (search API is geo-biased away from these)
    let curatedOk = 0;
    for (const slug of GDG_CURATED_CHAPTER_SLUGS) {
      try {
        await sleep(100);
        const { data: slim } = await axios.get<{
          id?: number;
          city?: string;
          country?: string;
          title?: string;
        }>(`https://gdg.community.dev/api/chapter_slim/${slug}/`, {
          timeout: 12000,
          headers: { Accept: "application/json", "User-Agent": UA },
          validateStatus: () => true,
        });
        if (!slim?.id || !slim.country) continue;
        const country = slim.country.toUpperCase();
        if (!TARGET_COUNTRY_SET.has(country) || country === "PK") continue;
        curatedOk += 1;
        await this.fetchChapterEvents(
          slim.id,
          { city: slim.city, country, title: slim.title },
          push
        );
      } catch {
        // skip missing slug
      }
    }
    warnings.push(`GDG curated city chapters resolved: ${curatedOk}`);

    // Per-country caps (keep soonest first within each country)
    trainings.sort((a, b) => a.start_date.localeCompare(b.start_date));
    const capped: ScrapedTraining[] = [];
    const counts = new Map<string, number>();
    for (const t of trainings) {
      const code = (t.country_code || "XX").toUpperCase();
      const limit =
        GDG_TARGET_COUNTRIES.find((c) => c.code === code)?.eventCap ?? 40;
      const used = counts.get(code) ?? 0;
      if (used >= limit) continue;
      counts.set(code, used + 1);
      capped.push(t);
    }

    if (!capped.length) {
      warnings.push("No upcoming GDG community events found for PK/AE/US/GB.");
    } else {
      const summary = [...counts.entries()]
        .map(([code, n]) => `${code}=${n}`)
        .join(", ");
      warnings.push(`GDG country counts: ${summary}`);
    }

    return { scraperKey: this.key, trainings: capped, warnings };
  }
}

type MsLearningPath = {
  title?: string;
  summary?: string;
  url?: string;
  roles?: string[];
  products?: string[];
  subjects?: string[];
  duration_in_minutes?: number;
  popularity?: number;
  icon_url?: string;
};

const MS_PRIORITY =
  /azure|ai|copilot|python|data|security|web|asp\.net|\.net|cloud|devops|power platform|github|student/i;

export class MicrosoftStudentsScraper extends BaseScraper {
  key = "microsoft-students";
  name = "Microsoft Learn Students";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const trainings: ScrapedTraining[] = [];
    const { start_date, end_date } = openEnrollmentDates(8);

    const curated: ScrapedTraining[] = [
      {
        title: "Microsoft Learn Student Hub",
        description:
          "Official Microsoft Learn Student Hub — curated guided learning tracks, certifications, and student community programs for campus developers.",
        category: "Professional Development",
        skill_tags: ["Microsoft", "Students", "Community"],
        city: "Online",
        delivery_mode: "online",
        start_date,
        end_date,
        duration: "Open enrollment",
        price: 0,
        is_free: true,
        currency: "USD",
        certificate_available: true,
        registration_url: "https://learn.microsoft.com/en-us/training/student-hub/",
      },
      {
        title: "Microsoft Student Ambassadors",
        description:
          "Join the Microsoft Student Ambassadors community — campus leadership, live workshops, and peer-led learning programs for student developers.",
        category: "Professional Development",
        skill_tags: ["Microsoft", "Ambassadors", "Students", "Community"],
        city: "Online",
        delivery_mode: "online",
        start_date,
        end_date,
        duration: "Open enrollment",
        price: 0,
        is_free: true,
        currency: "USD",
        certificate_available: true,
        registration_url: "https://mvp.microsoft.com/studentambassadors",
      },
    ];

    for (const item of curated) {
      const n = normalizeScraped(item, undefined, { allowCatalog: true });
      if (n) trainings.push(n);
    }

    try {
      const { data } = await axios.get<{ learningPaths?: MsLearningPath[] }>(
        "https://learn.microsoft.com/api/catalog/?locale=en-us",
        { timeout: 90000, headers: { "User-Agent": UA, Accept: "application/json" } }
      );
      const paths = (data.learningPaths ?? [])
        .filter((p) => (p.roles ?? []).includes("student") && p.title && p.url)
        .filter((p) => MS_PRIORITY.test(`${p.title} ${p.summary ?? ""} ${(p.products ?? []).join(" ")}`))
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, 18);

      for (const p of paths) {
        const hours = p.duration_in_minutes
          ? `${Math.max(1, Math.round(p.duration_in_minutes / 60))} hours`
          : null;
        const n = normalizeScraped(
          {
            title: p.title!,
            description: `Microsoft Learn student training path. ${stripHtml(
              p.summary ?? ""
            )} Guided modules with progress tracking and community support.`.slice(0, 500),
            category: categoryFromTitle(p.title!),
            skill_tags: ["Microsoft Learn", "Students", ...(p.products ?? []).slice(0, 3)],
            city: "Online",
            delivery_mode: "online",
            start_date,
            end_date,
            duration: hours,
            price: 0,
            is_free: true,
            currency: "USD",
            certificate_available: true,
            registration_url: p.url!,
            image_url: p.icon_url ?? null,
          },
          undefined,
          { allowCatalog: true }
        );
        if (n) trainings.push(n);
      }
    } catch (error) {
      warnings.push(
        `Microsoft catalog API failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (trainings.length <= 2) {
      warnings.push("Limited Microsoft student programs scraped from catalog.");
    }

    return { scraperKey: this.key, trainings, warnings };
  }
}

const IBM_STUDENT_CATEGORIES = [
  {
    title: "IBM SkillsBuild — Artificial Intelligence",
    href: "/students/course-catalog/artificial-intelligence",
    category: "AI",
  },
  {
    title: "IBM SkillsBuild — Cloud Computing",
    href: "/students/course-catalog/cloud-computing",
    category: "Cloud",
  },
  {
    title: "IBM SkillsBuild — Cybersecurity",
    href: "/students/course-catalog/cybersecurity",
    category: "Cybersecurity",
  },
  {
    title: "IBM SkillsBuild — Data Science",
    href: "/students/course-catalog/data-science",
    category: "Data Science",
  },
  {
    title: "IBM SkillsBuild — Emerging Technologies",
    href: "/students/course-catalog/emerging-tech-intro",
    category: "Professional Development",
  },
  {
    title: "IBM SkillsBuild — Enterprise Computing",
    href: "/students/course-catalog/enterprise-computing",
    category: "Cloud",
  },
  {
    title: "IBM SkillsBuild — Web Development",
    href: "/students/course-catalog/web-development",
    category: "Programming",
  },
  {
    title: "IBM SkillsBuild — UX Design",
    href: "/students/course-catalog/ux-design",
    category: "Design",
  },
  {
    title: "IBM SkillsBuild — Professional Skills",
    href: "/students/course-catalog/professional-skills",
    category: "Professional Development",
  },
  {
    title: "IBM SkillsBuild — Quantum Computing",
    href: "/students/course-catalog/quantum-computing",
    category: "Professional Development",
  },
  {
    title: "IBM SkillsBuild College Hackathons",
    href: "/college-students/hackathons",
    category: "Professional Development",
  },
];

export class IbmSkillsbuildScraper extends BaseScraper {
  key = "ibm-skillsbuild";
  name = "IBM SkillsBuild";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const trainings: ScrapedTraining[] = [];
    const { start_date, end_date } = openEnrollmentDates(8);
    const base = "https://skillsbuild.org";

    // Discover categories from live catalog when possible
    const discovered = new Map(
      IBM_STUDENT_CATEGORIES.map((c) => [c.href, c] as const)
    );
    try {
      const { data: html } = await axios.get(`${base}/students/course-catalog`, {
        timeout: 25000,
        headers: { "User-Agent": UA },
      });
      const $ = cheerio.load(html);
      $('a[href*="/students/course-catalog/"]').each((_, el) => {
        const href = ($(el).attr("href") || "").split("?")[0];
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (!href || href.endsWith("/course-catalog") || href.endsWith("/course-catalog/")) {
          return;
        }
        if (!discovered.has(href) && text.length > 2) {
          discovered.set(href, {
            title: `IBM SkillsBuild — ${text}`,
            href,
            category: categoryFromTitle(text),
          });
        }
      });
    } catch (error) {
      warnings.push(
        `IBM catalog index scan failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    for (const item of discovered.values()) {
      const url = new URL(item.href, base).toString();
      const n = normalizeScraped(
        {
          title: item.title,
          description: `${item.title} — free IBM SkillsBuild student training catalog with digital credentials. Open enrollment for learners and campus communities.`,
          category: item.category,
          skill_tags: ["IBM", "SkillsBuild", "Students", "Free"],
          city: "Online",
          delivery_mode: "online",
          start_date,
          end_date,
          duration: "Open enrollment",
          price: 0,
          is_free: true,
          currency: "USD",
          certificate_available: true,
          registration_url: url,
        },
        undefined,
        { allowCatalog: true }
      );
      if (n) trainings.push(n);
    }

    if (!trainings.length) {
      warnings.push("No IBM SkillsBuild catalog programs found.");
    }

    return { scraperKey: this.key, trainings, warnings };
  }
}

const ORACLE_PROGRAMS = [
  {
    title: "Oracle AI Training and Certification",
    url: "https://www.oracle.com/education/training/ai/",
    category: "AI",
    description:
      "Oracle University AI training tracks and certification paths for implementers, developers, and administrators via Oracle MyLearn.",
  },
  {
    title: "Oracle Fusion Cloud Applications Process Essentials",
    url: "https://www.oracle.com/education/training/applications-process-essentials/",
    category: "Professional Development",
    description:
      "Oracle Fusion Cloud Applications Process Essentials training and certification from Oracle University.",
  },
  {
    title: "Oracle Cloud Infrastructure Training",
    url: "https://www.oracle.com/education/training/oracle-cloud-infrastructure/",
    category: "Cloud",
    description:
      "Oracle Cloud Infrastructure (OCI) training programs covering architecture, operations, and cloud skills.",
  },
  {
    title: "Oracle Database Training",
    url: "https://www.oracle.com/education/training/database/",
    category: "Data Science",
    description:
      "Oracle Database training paths for DBAs and developers through Oracle University.",
  },
  {
    title: "Oracle Applications Foundations Training",
    url: "https://www.oracle.com/education/training/applications-foundations/",
    category: "Professional Development",
    description:
      "Foundational Oracle Applications training for enterprise implementers and business users.",
  },
  {
    title: "Oracle Guided Learning",
    url: "https://www.oracle.com/education/guided-learning/",
    category: "Professional Development",
    description:
      "Oracle Guided Learning — in-app guided training experiences to adopt Oracle Cloud applications faster.",
  },
  {
    title: "Oracle University Certification",
    url: "https://www.oracle.com/education/certification/",
    category: "Professional Development",
    description:
      "Official Oracle University certification programs to validate cloud, database, and applications skills.",
  },
  {
    title: "Oracle MyLearn — AI Learning Path",
    url: "https://mylearn.oracle.com/ou/story/35644-ai-1",
    category: "AI",
    description:
      "Oracle MyLearn AI story path — structured digital learning for Oracle AI skills with progress tracking.",
  },
  {
    title: "Oracle Learning Explorer / Free Training",
    url: "https://www.oracle.com/education/training/",
    category: "Cloud",
    description:
      "Explore Oracle University free and paid training catalog, learning paths, and MyLearn digital courses.",
  },
];

export class OracleUniversityScraper extends BaseScraper {
  key = "oracle-university";
  name = "Oracle University";

  async scrape(provider: Provider): Promise<ScraperResult> {
    const warnings: string[] = [];
    const trainings: ScrapedTraining[] = [];
    const { start_date, end_date } = openEnrollmentDates(8);
    const seen = new Set<string>();

    const programs = [...ORACLE_PROGRAMS];

    try {
      const { data: html } = await axios.get("https://www.oracle.com/education/training/", {
        timeout: 25000,
        headers: { "User-Agent": UA },
      });
      const $ = cheerio.load(html);
      $('a[href*="/education/training/"]').each((_, el) => {
        const href = ($(el).attr("href") || "").split("?")[0];
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (!href || !text || text.length < 12 || text.length > 120) return;
        if (!/training|certification|cloud|ai|database|fusion|learn/i.test(text + href)) {
          return;
        }
        const abs = new URL(href, "https://www.oracle.com").toString();
        if (programs.some((p) => p.url === abs)) return;
        programs.push({
          title: text,
          url: abs,
          category: categoryFromTitle(text),
          description: `${text} — Oracle University training program with open enrollment via Oracle Education.`,
        });
      });
    } catch (error) {
      warnings.push(
        `Oracle training page scan failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    for (const p of programs.slice(0, 20)) {
      if (seen.has(p.url)) continue;
      seen.add(p.url);
      const n = normalizeScraped(
        {
          title: p.title,
          description: p.description,
          category: p.category,
          skill_tags: ["Oracle", "Oracle University", "Certification"],
          city: "Online",
          delivery_mode: "online",
          start_date,
          end_date,
          duration: "Open enrollment",
          price: 0,
          is_free: true,
          currency: "USD",
          certificate_available: true,
          registration_url: p.url,
        },
        undefined,
        { allowCatalog: true }
      );
      if (n) trainings.push(n);
    }

    if (!trainings.length) {
      warnings.push("No Oracle University programs found.");
    }

    return { scraperKey: this.key, trainings, warnings };
  }
}

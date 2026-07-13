import { createHash } from "crypto";
import slugify from "slugify";
import type { DeliveryMode, ScrapedTraining } from "@/lib/types";

export function makeSourceHash(
  providerId: string,
  title: string,
  startDate: string,
  registrationUrl: string
) {
  return createHash("sha256")
    .update(`${providerId}|${title.trim().toLowerCase()}|${startDate}|${registrationUrl}`)
    .digest("hex")
    .slice(0, 40);
}

export function makeTrainingSlug(title: string, startDate: string) {
  const base = slugify(title, { lower: true, strict: true }).slice(0, 70);
  return `${base}-${startDate}`;
}

export function inferDeliveryMode(text: string): DeliveryMode {
  const t = text.toLowerCase();
  if (t.includes("hybrid") || t.includes("blended")) return "hybrid";
  if (
    t.includes("online") ||
    t.includes("virtual") ||
    t.includes("live stream") ||
    t.includes("zoom") ||
    t.includes("interactive")
  ) {
    return "online";
  }
  return "onsite";
}

export function addDurationToDate(startDate: string, duration?: string | null): string | null {
  if (!duration) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;

  const text = duration.toLowerCase();
  const months = text.match(/(\d+)\s*months?/);
  const weeks = text.match(/(\d+)\s*weeks?/);
  const days = text.match(/(\d+)\s*days?/);

  if (months) start.setUTCMonth(start.getUTCMonth() + Number(months[1]));
  else if (weeks) start.setUTCDate(start.getUTCDate() + Number(weeks[1]) * 7);
  else if (days) start.setUTCDate(start.getUTCDate() + Number(days[1]));
  else return null;

  return start.toISOString().slice(0, 10);
}

export function parsePrice(text: string): { price: number | null; isFree: boolean } {
  const lower = text.toLowerCase();
  if (/\bfree\b/.test(lower)) return { price: 0, isFree: true };
  const match =
    text.replace(/,/g, "").match(/(?:pkr|rs\.?)\s*([\d]{3,})/i) ??
    text.replace(/,/g, "").match(/\$\s*([\d]+(?:\.\d+)?)/i);
  if (!match) return { price: null, isFree: false };
  const price = Number(match[1]);
  if (!Number.isFinite(price) || price < 100) return { price: null, isFree: false };
  return { price, isFree: false };
}

export function isLiveInstructorLed(text: string): boolean {
  const t = text.toLowerCase();
  const excluded = [
    "pre-recorded",
    "prerecorded",
    "self-paced",
    "self paced",
    "on-demand",
    "youtube",
    "recorded webinar",
    "mooc",
    "blog",
    "article",
  ];
  if (excluded.some((x) => t.includes(x))) return false;
  return true;
}

export function openEnrollmentDates(monthsOpen = 6): {
  start_date: string;
  end_date: string;
} {
  const start = new Date();
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + monthsOpen);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

export function normalizeScraped(
  item: ScrapedTraining,
  defaults?: Partial<ScrapedTraining>,
  options?: { allowCatalog?: boolean }
): ScrapedTraining | null {
  const merged = { ...defaults, ...item };
  if (!merged.title?.trim() || !merged.registration_url || !merged.start_date) {
    return null;
  }
  if (
    !options?.allowCatalog &&
    !isLiveInstructorLed(`${merged.title} ${merged.description ?? ""}`)
  ) {
    return null;
  }

  const start = new Date(merged.start_date);
  if (Number.isNaN(start.getTime())) return null;

  const end = merged.end_date ? new Date(merged.end_date) : null;
  if (end && end < new Date()) return null;
  if (!end && start < new Date(Date.now() - 24 * 60 * 60 * 1000)) return null;

  return {
    ...merged,
    title: merged.title.trim(),
    skill_tags: merged.skill_tags ?? [],
    currency: merged.currency ?? "PKR",
    is_free: merged.is_free ?? merged.price === 0,
    certificate_available: merged.certificate_available ?? false,
  };
}

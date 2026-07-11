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
    t.includes("zoom")
  ) {
    return "online";
  }
  return "onsite";
}

export function parsePrice(text: string): { price: number | null; isFree: boolean } {
  const lower = text.toLowerCase();
  if (/\bfree\b/.test(lower)) return { price: 0, isFree: true };
  const match = text.replace(/,/g, "").match(/(?:pkr|rs\.?|usd|\$)\s*([\d]+(?:\.\d+)?)/i)
    ?? text.replace(/,/g, "").match(/([\d]{4,})/);
  if (!match) return { price: null, isFree: false };
  return { price: Number(match[1]), isFree: false };
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

export function normalizeScraped(
  item: ScrapedTraining,
  defaults?: Partial<ScrapedTraining>
): ScrapedTraining | null {
  const merged = { ...defaults, ...item };
  if (!merged.title?.trim() || !merged.registration_url || !merged.start_date) {
    return null;
  }
  if (!isLiveInstructorLed(`${merged.title} ${merged.description ?? ""}`)) {
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

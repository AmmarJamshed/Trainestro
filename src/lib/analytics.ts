import { z } from "zod";

export const USAGE_EVENT_TYPES = ["search", "filter", "click", "enroll"] as const;
export type UsageEventType = (typeof USAGE_EVENT_TYPES)[number];

export const DEVICE_CLASSES = ["mobile", "tablet", "desktop", "unknown"] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

export const usageEventSchema = z.object({
  event_type: z.enum(USAGE_EVENT_TYPES),
  country_code: z.string().trim().max(8).nullish(),
  query_text: z.string().trim().max(120).nullish(),
  category: z.string().trim().max(80).nullish(),
  delivery_mode: z.string().trim().max(32).nullish(),
  training_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  training_slug: z.string().trim().max(200).nullish(),
  device_class: z.enum(DEVICE_CLASSES).nullish(),
});

export type UsageEventInput = {
  event_type: UsageEventType;
  country_code?: string | null;
  query_text?: string | null;
  category?: string | null;
  delivery_mode?: string | null;
  training_id?: string | null;
  training_slug?: string | null;
  device_class?: DeviceClass | null;
};

export function deviceClassFromUserAgent(ua: string | null | undefined): DeviceClass {
  if (!ua) return "unknown";
  const lower = ua.toLowerCase();
  if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/.test(lower)) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(lower)) {
    return "mobile";
  }
  return "desktop";
}

/** Fire-and-forget client tracker — never blocks UI. */
export function trackUsageEvent(payload: UsageEventInput): void {
  if (typeof window === "undefined") return;

  const body: UsageEventInput = {
    ...payload,
    device_class: payload.device_class ?? deviceClassFromUserAgent(navigator.userAgent),
    query_text: payload.query_text?.slice(0, 120) ?? null,
    training_id: payload.training_id || null,
  };

  const json = JSON.stringify(body);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([json], { type: "application/json" });
      if (navigator.sendBeacon("/api/analytics", blob)) return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json,
    keepalive: true,
  }).catch(() => {
    // intentionally silent
  });
}

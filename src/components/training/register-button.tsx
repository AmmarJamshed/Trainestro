"use client";

import { ExternalLink } from "lucide-react";
import { trackUsageEvent } from "@/lib/analytics";

export function RegisterButton({
  href,
  className,
  trainingId,
  trainingSlug,
  category,
  countryCode,
  deliveryMode,
}: {
  href: string;
  className?: string;
  trainingId?: string;
  trainingSlug?: string;
  category?: string | null;
  countryCode?: string | null;
  deliveryMode?: string | null;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        trackUsageEvent({
          event_type: "enroll",
          training_id: trainingId,
          training_slug: trainingSlug,
          category: category ?? null,
          country_code: countryCode ?? null,
          delivery_mode: deliveryMode ?? null,
        });
      }}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--brand)] to-cyan-400 px-6 text-sm font-semibold uppercase tracking-wide text-white transition hover:opacity-95 hover:shadow-[0_0_28px_-8px_var(--portal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal)] ${className ?? ""}`}
    >
      Enroll Now
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}

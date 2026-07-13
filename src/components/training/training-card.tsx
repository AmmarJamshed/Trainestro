"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { MapPin, Calendar, Monitor, Building2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProviderLogo } from "@/components/providers/provider-logo";
import { trackUsageEvent } from "@/lib/analytics";
import type { Training } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatPrice(t: Training) {
  if (t.is_free || t.price === 0) return "Free";
  if (t.price == null) return "See provider";
  return `${t.currency} ${t.price.toLocaleString()}`;
}

const modeIcon = {
  online: Monitor,
  onsite: Building2,
  hybrid: Monitor,
};

export function TrainingCard({
  training,
  className,
}: {
  training: Training;
  className?: string;
}) {
  const Icon = modeIcon[training.delivery_mode];
  const provider = training.provider;

  function trackClick() {
    trackUsageEvent({
      event_type: "click",
      training_id: training.id,
      training_slug: training.slug,
      category: training.category,
      country_code: training.country_code,
      delivery_mode: training.delivery_mode,
    });
  }

  function trackEnroll() {
    trackUsageEvent({
      event_type: "enroll",
      training_id: training.id,
      training_slug: training.slug,
      category: training.category,
      country_code: training.country_code,
      delivery_mode: training.delivery_mode,
    });
  }

  return (
    <article
      className={cn(
        "group relative border-b border-white/8 py-5 transition last:border-b-0 hover:bg-white/[0.04]",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
          <ProviderLogo
            name={provider?.name ?? "Provider"}
            logoUrl={provider?.logo_url}
            slug={provider?.slug}
            size={56}
            className="mt-0.5 shrink-0 transition duration-300 group-hover:scale-[1.04] group-hover:shadow-[0_0_22px_-8px_var(--portal)]"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              {provider?.slug ? (
                <Link
                  href={`/search?provider=${encodeURIComponent(provider.slug)}`}
                  className="font-medium text-slate-200 transition hover:text-[var(--portal)]"
                >
                  {provider.name}
                </Link>
              ) : (
                <span>{provider?.name ?? "Provider"}</span>
              )}
              {training.category && (
                <>
                  <span aria-hidden>·</span>
                  <span>{training.category}</span>
                </>
              )}
              {training.country_code && (
                <>
                  <span aria-hidden>·</span>
                  <span className="uppercase tracking-wide text-slate-500">
                    {training.country_code}
                  </span>
                </>
              )}
            </div>
            <Link href={`/trainings/${training.slug}`} onClick={trackClick}>
              <h3 className="font-[family-name:var(--font-display)] text-base leading-snug text-white transition group-hover:text-[var(--portal)] sm:text-lg">
                {training.title}
              </h3>
            </Link>
            {training.description && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                {training.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-[var(--portal)]" />
                {format(parseISO(training.start_date), "MMM d, yyyy")}
                {training.end_date &&
                  training.end_date !== training.start_date &&
                  ` – ${format(parseISO(training.end_date), "MMM d, yyyy")}`}
              </span>
              {training.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {training.city}
                </span>
              )}
              <span className="inline-flex items-center gap-1 capitalize">
                <Icon className="h-3.5 w-3.5" />
                {training.delivery_mode}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <Badge
            variant="secondary"
            className="border-white/10 bg-white/10 font-semibold text-white"
          >
            {formatPrice(training)}
          </Badge>
          {training.certificate_available && (
            <Badge variant="outline" className="border-white/15 text-slate-300">
              Certificate
            </Badge>
          )}
          <a
            href={training.registration_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackEnroll}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--brand)] to-cyan-400 px-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-95 hover:shadow-[0_0_24px_-8px_var(--portal)]"
          >
            Enroll
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { MapPin, Calendar, Monitor, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Link
      href={`/trainings/${training.slug}`}
      className={cn(
        "group block border-b border-border/70 py-5 transition hover:bg-muted/40",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{training.provider?.name ?? "Provider"}</span>
            {training.category && (
              <>
                <span aria-hidden>·</span>
                <span>{training.category}</span>
              </>
            )}
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-lg leading-snug text-foreground transition group-hover:text-[var(--brand)]">
            {training.title}
          </h3>
          {training.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {training.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
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
        <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
          <Badge variant="secondary" className="font-medium">
            {formatPrice(training)}
          </Badge>
          {training.certificate_available && (
            <Badge variant="outline">Certificate</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

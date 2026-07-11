import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  MapPin,
  Monitor,
  Building2,
  Award,
  User,
  Phone,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RegisterButton } from "@/components/training/register-button";
import { EventJsonLd } from "@/components/training/event-json-ld";
import { getTrainingBySlug, getTrainings } from "@/lib/data/trainings";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const trainings = await getTrainings();
  return trainings.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const training = await getTrainingBySlug(slug);
  if (!training) return { title: "Training not found" };

  const title = training.title;
  const description =
    training.description?.slice(0, 160) ||
    `Live training by ${training.provider?.name ?? "provider"} in ${training.city ?? "Pakistan"}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: training.image_url ? [{ url: training.image_url }] : undefined,
    },
  };
}

export default async function TrainingDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const training = await getTrainingBySlug(slug);
  if (!training) notFound();

  const ModeIcon = training.delivery_mode === "onsite" ? Building2 : Monitor;
  const mapQuery = encodeURIComponent(
    [training.venue, training.city, training.province, "Pakistan"]
      .filter(Boolean)
      .join(", ")
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <EventJsonLd training={training} />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge variant="secondary" className="capitalize">
          {training.delivery_mode}
        </Badge>
        {training.category && <Badge variant="outline">{training.category}</Badge>}
        {training.is_free && <Badge>Free</Badge>}
        {training.certificate_available && (
          <Badge variant="outline">
            <Award className="mr-1 h-3 w-3" />
            Certificate
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {training.provider?.name}
      </p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight text-foreground sm:text-4xl">
        {training.title}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <RegisterButton href={training.registration_url} />
        <p className="text-sm text-muted-foreground">
          Opens the official provider registration page
        </p>
      </div>

      <dl className="mt-10 grid gap-4 sm:grid-cols-2">
        <Detail
          icon={Calendar}
          label="Dates"
          value={`${format(parseISO(training.start_date), "MMM d, yyyy")}${
            training.end_date && training.end_date !== training.start_date
              ? ` – ${format(parseISO(training.end_date), "MMM d, yyyy")}`
              : ""
          }`}
        />
        {training.duration && (
          <Detail icon={Clock} label="Duration" value={training.duration} />
        )}
        {training.city && (
          <Detail
            icon={MapPin}
            label="Location"
            value={[training.venue, training.city, training.province]
              .filter(Boolean)
              .join(" · ")}
          />
        )}
        <Detail
          icon={ModeIcon}
          label="Delivery"
          value={training.delivery_mode}
        />
        {training.instructor && (
          <Detail icon={User} label="Instructor" value={training.instructor} />
        )}
        {(training.contact_info || training.provider?.contact_email) && (
          <Detail
            icon={Phone}
            label="Contact"
            value={
              training.contact_info ||
              training.provider?.contact_email ||
              training.provider?.contact_phone ||
              ""
            }
          />
        )}
        <Detail
          icon={Award}
          label="Price"
          value={
            training.is_free || training.price === 0
              ? "Free"
              : training.price != null
                ? `${training.currency} ${training.price.toLocaleString()}`
                : "See provider"
          }
        />
      </dl>

      {training.description && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-foreground">
            About this training
          </h2>
          <p className="mt-3 whitespace-pre-line text-muted-foreground leading-relaxed">
            {training.description}
          </p>
        </section>
      )}

      {!!training.skill_tags?.length && (
        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-foreground">
            Skills
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {training.skill_tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {training.delivery_mode !== "online" && training.city && (
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-foreground">
            Map
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-border/70">
            <iframe
              title="Training location map"
              src={`https://maps.google.com/maps?q=${mapQuery}&z=14&output=embed`}
              className="h-72 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      )}

      <div className="mt-12 rounded-2xl border border-[var(--brand)]/20 bg-[var(--brand-soft)]/40 p-6 dark:bg-[var(--brand-soft)]/30">
        <h2 className="font-[family-name:var(--font-display)] text-xl">
          Ready to join?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Trainestro does not process payments. Registration happens on the
          provider&apos;s official site.
        </p>
        <div className="mt-4">
          <RegisterButton href={training.registration_url} />
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1 capitalize text-foreground">{value}</dd>
    </div>
  );
}

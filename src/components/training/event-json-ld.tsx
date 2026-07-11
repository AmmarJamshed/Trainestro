import type { Training } from "@/lib/types";

export function EventJsonLd({ training }: { training: Training }) {
  const attendance =
    training.delivery_mode === "online"
      ? "https://schema.org/OnlineEventAttendanceMode"
      : training.delivery_mode === "hybrid"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode";

  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: training.title,
    description: training.description,
    startDate: training.start_date,
    endDate: training.end_date ?? training.start_date,
    eventAttendanceMode: attendance,
    eventStatus: "https://schema.org/EventScheduled",
    location:
      training.delivery_mode === "online"
        ? {
            "@type": "VirtualLocation",
            url: training.registration_url,
          }
        : {
            "@type": "Place",
            name: training.venue ?? training.city,
            address: {
              "@type": "PostalAddress",
              addressLocality: training.city,
              addressRegion: training.province,
              addressCountry: training.country_code,
            },
          },
    organizer: training.provider
      ? {
          "@type": "Organization",
          name: training.provider.name,
          url: training.provider.website,
        }
      : undefined,
    offers: {
      "@type": "Offer",
      url: training.registration_url,
      price: training.is_free ? 0 : training.price,
      priceCurrency: training.currency,
      availability: "https://schema.org/InStock",
    },
    image: training.image_url ? [training.image_url] : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

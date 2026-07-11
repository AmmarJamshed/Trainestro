import type { MetadataRoute } from "next";
import { getTrainings } from "@/lib/data/trainings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const trainings = await getTrainings();

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...trainings.map((t) => ({
      url: `${base}/trainings/${t.slug}`,
      lastModified: t.last_updated_at ? new Date(t.last_updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}

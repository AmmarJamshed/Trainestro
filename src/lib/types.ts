export type DeliveryMode = "online" | "onsite" | "hybrid";
export type TrainingStatus = "upcoming" | "completed" | "archived";
export type PriceType = "free" | "paid" | "unknown";
export type ScrapeRunStatus = "success" | "partial" | "failed" | "running";

export interface Provider {
  id: string;
  slug: string;
  name: string;
  website: string;
  listing_url: string;
  country_code: string;
  city: string | null;
  province: string | null;
  description: string | null;
  logo_url: string | null;
  scraper_key: string;
  scraper_enabled: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  reputation_score: number;
  created_at: string;
  updated_at: string;
}

export interface Training {
  id: string;
  provider_id: string;
  slug: string;
  title: string;
  description: string | null;
  instructor: string | null;
  category: string | null;
  skill_tags: string[];
  city: string | null;
  province: string | null;
  venue: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery_mode: DeliveryMode;
  start_date: string;
  end_date: string | null;
  duration: string | null;
  registration_deadline: string | null;
  price: number | null;
  currency: string;
  is_free: boolean;
  certificate_available: boolean;
  registration_url: string;
  image_url: string | null;
  contact_info: string | null;
  status: TrainingStatus;
  source_hash: string;
  country_code: string;
  last_scraped_at: string | null;
  last_updated_at: string;
  created_at: string;
  provider?: Provider;
}

export interface ScrapeLog {
  id: string;
  provider_id: string | null;
  scraper_key: string;
  status: ScrapeRunStatus;
  message: string | null;
  trainings_found: number;
  trainings_created: number;
  trainings_updated: number;
  trainings_archived: number;
  error_details: string | null;
  started_at: string;
  finished_at: string | null;
  provider?: Provider;
}

export interface SearchFilters {
  q?: string;
  provider?: string;
  city?: string;
  province?: string;
  category?: string;
  delivery?: DeliveryMode | "";
  price?: "free" | "paid" | "";
  date?: "this_week" | "next_week" | "this_month" | "";
  sort?: "soonest" | "latest" | "price_asc";
  from?: string;
  to?: string;
}

export interface AnalyticsSummary {
  liveTrainings: number;
  providers: number;
  cities: { name: string; count: number }[];
  categories: { name: string; count: number }[];
  recentlyAdded: Training[];
}

export interface ScrapedTraining {
  title: string;
  description?: string | null;
  instructor?: string | null;
  category?: string | null;
  skill_tags?: string[];
  city?: string | null;
  province?: string | null;
  venue?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  delivery_mode: DeliveryMode;
  start_date: string;
  end_date?: string | null;
  duration?: string | null;
  registration_deadline?: string | null;
  price?: number | null;
  currency?: string;
  is_free?: boolean;
  certificate_available?: boolean;
  registration_url: string;
  image_url?: string | null;
  contact_info?: string | null;
}

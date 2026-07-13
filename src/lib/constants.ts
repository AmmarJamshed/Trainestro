export const SITE_NAME = "Trainestro";
export const SITE_TAGLINE =
  "Find live professional trainings in Pakistan, UAE, USA, and UK";
export const SITE_DESCRIPTION =
  "Search upcoming instructor-led trainings across Pakistan, the UAE, the United States, and the United Kingdom. Discover live classroom, hybrid, and online sessions — then register on the provider's official page.";
export const DEFAULT_COUNTRY = "PK";
export const DEFAULT_CURRENCY = "PKR";

export const SUPPORTED_COUNTRIES = [
  { code: "PK", label: "Pakistan" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
] as const;

export const POPULAR_CATEGORIES = [
  "AI",
  "Data Science",
  "Cybersecurity",
  "Compliance",
  "AML",
  "Banking",
  "Finance",
  "Project Management",
  "Cloud",
  "Programming",
  "HR",
  "Marketing",
  "Design",
] as const;

export const QUICK_FILTERS = [
  { id: "online", label: "Online", param: "delivery", value: "online" },
  { id: "onsite", label: "Onsite", param: "delivery", value: "onsite" },
  { id: "hybrid", label: "Hybrid", param: "delivery", value: "hybrid" },
  { id: "free", label: "Free", param: "price", value: "free" },
  { id: "paid", label: "Paid", param: "price", value: "paid" },
  { id: "this_week", label: "This Week", param: "date", value: "this_week" },
  { id: "next_week", label: "Next Week", param: "date", value: "next_week" },
  { id: "this_month", label: "This Month", param: "date", value: "this_month" },
] as const;

export const PAKISTAN_PROVINCES = [
  "Islamabad Capital Territory",
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Gilgit-Baltistan",
  "Azad Jammu and Kashmir",
] as const;

export const CITIES_BY_COUNTRY: Record<string, readonly string[]> = {
  PK: [
    "Islamabad",
    "Karachi",
    "Lahore",
    "Rawalpindi",
    "Peshawar",
    "Quetta",
    "Faisalabad",
    "Multan",
    "Hyderabad",
    "Gujranwala",
  ],
  AE: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Al Ain"],
  US: [
    "New York",
    "San Francisco",
    "Los Angeles",
    "Chicago",
    "Austin",
    "Seattle",
    "Boston",
    "Washington",
    "Atlanta",
    "Dallas",
    "Denver",
    "Miami",
  ],
  GB: [
    "London",
    "Manchester",
    "Birmingham",
    "Edinburgh",
    "Glasgow",
    "Bristol",
    "Leeds",
    "Cambridge",
    "Oxford",
    "Liverpool",
  ],
};

/** Flat city list for filters (all supported countries). */
export const MAJOR_CITIES = [
  ...new Set(Object.values(CITIES_BY_COUNTRY).flat()),
] as string[];

export function citiesForCountry(countryCode?: string | null): string[] {
  if (!countryCode) return [...MAJOR_CITIES];
  return [...(CITIES_BY_COUNTRY[countryCode.toUpperCase()] ?? [])];
}

export function currencyForCountryCode(countryCode?: string | null): string {
  switch ((countryCode || "").toUpperCase()) {
    case "AE":
      return "AED";
    case "US":
      return "USD";
    case "GB":
      return "GBP";
    case "PK":
      return "PKR";
    default:
      return DEFAULT_CURRENCY;
  }
}

export const SITE_NAME = "Trainestro";
export const SITE_TAGLINE = "Find live professional trainings in Pakistan";
export const SITE_DESCRIPTION =
  "Search upcoming instructor-led trainings across Pakistan. Discover live classroom, hybrid, and online sessions — then register on the provider's official page.";
export const DEFAULT_COUNTRY = "PK";
export const DEFAULT_CURRENCY = "PKR";

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

export const MAJOR_CITIES = [
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
] as const;

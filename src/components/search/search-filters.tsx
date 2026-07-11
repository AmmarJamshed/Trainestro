"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAJOR_CITIES, PAKISTAN_PROVINCES, POPULAR_CATEGORIES } from "@/lib/constants";
import type { Provider } from "@/lib/types";

export function SearchFilters({ providers }: { providers: Provider[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      startTransition(() => {
        router.push(`/search?${next.toString()}`);
      });
    },
    [params, router]
  );

  return (
    <aside
      className={`space-y-5 rounded-2xl border border-border/70 bg-muted/20 p-4 ${pending ? "opacity-70" : ""}`}
    >
      <div>
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="Training, skill, provider…"
          className="mt-1.5"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              update("q", (e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>

      <FilterSelect
        label="Provider"
        value={params.get("provider") ?? "all"}
        onChange={(v) => update("provider", v)}
        options={[
          { value: "all", label: "All providers" },
          ...providers.map((p) => ({ value: p.slug, label: p.name })),
        ]}
      />

      <FilterSelect
        label="City"
        value={params.get("city") ?? "all"}
        onChange={(v) => update("city", v)}
        options={[
          { value: "all", label: "All cities" },
          { value: "Online", label: "Online" },
          ...MAJOR_CITIES.map((c) => ({ value: c, label: c })),
        ]}
      />

      <FilterSelect
        label="Province"
        value={params.get("province") ?? "all"}
        onChange={(v) => update("province", v)}
        options={[
          { value: "all", label: "All provinces" },
          ...PAKISTAN_PROVINCES.map((p) => ({ value: p, label: p })),
        ]}
      />

      <FilterSelect
        label="Category"
        value={params.get("category") ?? "all"}
        onChange={(v) => update("category", v)}
        options={[
          { value: "all", label: "All categories" },
          ...POPULAR_CATEGORIES.map((c) => ({ value: c, label: c })),
        ]}
      />

      <FilterSelect
        label="Delivery"
        value={params.get("delivery") ?? "all"}
        onChange={(v) => update("delivery", v)}
        options={[
          { value: "all", label: "Any mode" },
          { value: "online", label: "Online" },
          { value: "onsite", label: "Onsite" },
          { value: "hybrid", label: "Hybrid" },
        ]}
      />

      <FilterSelect
        label="Price"
        value={params.get("price") ?? "all"}
        onChange={(v) => update("price", v)}
        options={[
          { value: "all", label: "Any price" },
          { value: "free", label: "Free" },
          { value: "paid", label: "Paid" },
        ]}
      />

      <FilterSelect
        label="Date"
        value={params.get("date") ?? "all"}
        onChange={(v) => update("date", v)}
        options={[
          { value: "all", label: "Any date" },
          { value: "this_week", label: "This week" },
          { value: "next_week", label: "Next week" },
          { value: "this_month", label: "This month" },
        ]}
      />

      <FilterSelect
        label="Sort by"
        value={params.get("sort") ?? "soonest"}
        onChange={(v) => update("sort", v)}
        options={[
          { value: "soonest", label: "Soonest" },
          { value: "latest", label: "Latest added" },
          { value: "price_asc", label: "Lowest price" },
        ]}
      />
    </aside>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? "all")}>
        <SelectTrigger className="mt-1.5 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

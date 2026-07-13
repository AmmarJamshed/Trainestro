import Image from "next/image";
import { cn } from "@/lib/utils";

export const PROVIDER_LOGOS: Record<string, string> = {
  "nibaf-pakistan": "/providers/nibaf.jpg",
  "learning-resource-centre": "/providers/lrc.png",
  atomcamp: "/providers/atomcamp.png",
  "ai-datayard": "/providers/aidatayard.png",
  "pixelart-games-academy": "/providers/pixelart.svg",
  "iba-cee": "/providers/iba-cee.png",
  "iba-cict": "/providers/iba-cict.png",
  "nust-iedc": "/providers/nust.png",
  "gdg-community": "/providers/gdg.svg",
  "microsoft-students": "/providers/microsoft.svg",
  "ibm-skillsbuild": "/providers/ibm.svg",
  "oracle-university": "/providers/oracle.svg",
  "lums-redc": "/providers/lums.png",
  "lums-ces": "/providers/lums.png",
  "fast-coee": "/providers/fast.svg",
  "stanford-continuing-studies": "/providers/stanford.svg",
  "flatiron-school": "/providers/flatiron.svg",
  "imperial-lifelong-learning": "/providers/imperial.svg",
  "manchester-dubai": "/providers/manchester.svg",
};

export function resolveProviderLogo(
  logoUrl: string | null | undefined,
  slug?: string | null
) {
  if (slug && PROVIDER_LOGOS[slug]) return PROVIDER_LOGOS[slug];
  if (logoUrl) return logoUrl;
  return null;
}

export function ProviderLogo({
  name,
  logoUrl,
  slug,
  size = 48,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  slug?: string | null;
  size?: number;
  className?: string;
}) {
  const src = resolveProviderLogo(logoUrl, slug);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (!src) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] font-semibold text-white",
          className
        )}
        style={{ width: size, height: size, fontSize: Math.max(11, size * 0.28) }}
        aria-hidden
      >
        {initials || "T"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-white p-1.5 shadow-sm",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={`${name} logo`}
        width={size}
        height={size}
        unoptimized={src.endsWith(".svg")}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

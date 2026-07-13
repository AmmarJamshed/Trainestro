import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="128" height="128" rx="28" fill="var(--brand, #0056D2)" />
      <path fill="#FFFFFF" d="M20 30c0-2.2 1.8-4 4-4h30c1.6 0 3.1.9 3.8 2.4L72 54H36c-8.8 0-16-7.2-16-16V30z" />
      <path fill="#FFFFFF" d="M108 30c0-2.2-1.8-4-4-4H74c-1.6 0-3.1.9-3.8 2.4L56 54h36c8.8 0 16-7.2 16-16V30z" />
      <rect fill="#FFFFFF" x="58" y="48" width="12" height="44" rx="2" />
      <path fill="#FFFFFF" d="M64 108l-9-14h18z" />
    </svg>
  );
}

export function TrainestroLogo({
  href = "/",
  showWordmark = true,
  inverted = false,
  className,
  markClassName,
}: {
  href?: string | null;
  showWordmark?: boolean;
  inverted?: boolean;
  className?: string;
  markClassName?: string;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark
        className={cn(
          "h-9 w-9 drop-shadow-[0_8px_18px_-10px_rgba(0,86,210,0.95)] transition group-hover:scale-105",
          markClassName
        )}
      />
      {showWordmark && (
        <span
          className={cn(
            "font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight",
            inverted ? "text-white" : "text-foreground"
          )}
        >
          {SITE_NAME}
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="group inline-flex" aria-label={SITE_NAME}>
      {content}
    </Link>
  );
}

export function TrainestroMark({ className }: { className?: string }) {
  return <LogoMark className={className} />;
}

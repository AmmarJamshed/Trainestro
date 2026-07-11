import { ExternalLink } from "lucide-react";

export function RegisterButton({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-6 text-sm font-medium text-white transition hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${className ?? ""}`}
    >
      Register Now
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}

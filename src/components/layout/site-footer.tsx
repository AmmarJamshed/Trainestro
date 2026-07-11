import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-[family-name:var(--font-display)] text-base text-foreground">
            {SITE_NAME}
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {SITE_TAGLINE}. We do not host or sell trainings — we help you find
            live sessions and register with the original provider.
          </p>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/search" className="hover:text-foreground">
            Browse
          </Link>
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
          <a
            href="https://github.com"
            className="hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

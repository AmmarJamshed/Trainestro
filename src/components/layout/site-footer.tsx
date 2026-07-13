import Link from "next/link";
import { TrainestroLogo } from "@/components/brand/trainestro-logo";
import { SITE_TAGLINE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="relative mt-auto border-t border-white/10 bg-[#050814] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--portal)]/50 to-transparent" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <TrainestroLogo
            inverted
            markClassName="h-10 w-10 drop-shadow-none"
          />
          <p className="mt-3 max-w-md text-sm text-slate-400">
            {SITE_TAGLINE}. We do not host or sell trainings — we help you find
            live sessions and register with the original provider.
          </p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-slate-400">
          <Link href="/search" className="transition hover:text-[var(--portal)]">
            Browse trainings
          </Link>
        </div>
      </div>
    </footer>
  );
}

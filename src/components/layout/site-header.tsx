"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { TrainestroLogo } from "@/components/brand/trainestro-logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Browse" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070b16]/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <TrainestroLogo inverted />

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:text-white",
                pathname === link.href &&
                  "bg-[var(--portal)]/15 text-[var(--portal)] portal-ring"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search trainings"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-slate-300 transition hover:border-white/15 hover:bg-white/5 hover:text-white"
          >
            <Search className="h-4 w-4" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            className="text-slate-300 hover:bg-white/5 hover:text-white"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
          </Button>
        </div>
      </div>
    </header>
  );
}

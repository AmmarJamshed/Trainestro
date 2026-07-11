import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl">
        Training not found
      </h1>
      <p className="mt-2 text-muted-foreground">
        This listing may have expired or the link is incorrect.
      </p>
      <Link
        href="/search"
        className="mt-6 text-[var(--brand)] hover:underline"
      >
        Browse upcoming trainings
      </Link>
    </div>
  );
}

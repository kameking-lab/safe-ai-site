import Link from "next/link";

export function UsageNotesLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/about/usage-notes"
      prefetch={false}
      className={`inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4 ${className}`}
    >
      注意事項
    </Link>
  );
}

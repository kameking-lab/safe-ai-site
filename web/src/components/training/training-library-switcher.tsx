import Link from "next/link";

const libraries = [
  {
    id: "safety",
    label: "安全研修",
    description: "安全・法令・災害防止を学ぶ",
    href: "/training/safety-seminars",
  },
  {
    id: "ai",
    label: "AI実務研修",
    description: "生成AIを仕事で安全に使う",
    href: "/training/ai-seminars",
  },
] as const;

export function TrainingLibrarySwitcher({
  current,
}: {
  current: (typeof libraries)[number]["id"];
}) {
  return (
    <nav aria-label="研修カテゴリー" className="grid gap-2 sm:grid-cols-2">
      {libraries.map((library) => {
        const active = library.id === current;
        return (
          <Link
            key={library.id}
            href={library.href}
            aria-current={active ? "page" : undefined}
            className={`min-h-16 rounded-2xl border-2 p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30 ${
              active
                ? "border-slate-950 bg-slate-950 text-white dark:border-emerald-300"
                : "border-slate-300 bg-white text-slate-950 hover:border-emerald-700 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            }`}
          >
            <span className="block font-black">{library.label}</span>
            <span className={`mt-1 block text-xs ${active ? "text-slate-200" : "text-slate-600 dark:text-slate-300"}`}>
              {library.description}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

type LawHubNavProps = {
  current: "laws" | "law-search" | "law-hierarchy" | "circulars" | "glossary" | "chatbot";
};

const NAV_ITEMS = [
  { id: "laws" as const, href: "/laws", label: "法改正一覧" },
  { id: "law-search" as const, href: "/law-search", label: "条文検索" },
  { id: "law-hierarchy" as const, href: "/law-hierarchy", label: "法令体系" },
  { id: "circulars" as const, href: "/circulars", label: "通達DB" },
  { id: "glossary" as const, href: "/glossary", label: "用語集" },
  { id: "chatbot" as const, href: "/chatbot", label: "AIチャット" },
];

export function LawHubNav({ current }: LawHubNavProps) {
  return (
    <nav
      aria-label="法令ツールナビ"
      className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
    >
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <span className="self-center mr-1 text-[11px] font-bold text-slate-500">法令まわり：</span>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.href}
            aria-current={item.id === current ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              item.id === current
                ? "bg-blue-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

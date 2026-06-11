import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarClock,
  FileText,
  MessageSquare,
  Network,
  Search,
} from "lucide-react";

type LawHubNavProps = {
  current: "laws" | "law-search" | "law-hierarchy" | "circulars" | "glossary" | "chatbot";
};

// P1-H: 各タブが何のためにあるか初見で分からない問題を、tooltip と現在タブ下の
// 説明文で解消する。説明はホバー時の title 属性と、アクティブタブ直下の
// 補助テキストで二重に提供する。
// 柱0: アイコンファースト＝ラベルを読まなくても絵で行き先が分かる。タップ対象44px。
const NAV_ITEMS: {
  id: LawHubNavProps["current"];
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}[] = [
  { id: "laws", href: "/laws", label: "法改正一覧", icon: CalendarClock, description: "施行日カウントダウン付きの改正カレンダー（時系列ビュー）" },
  { id: "law-search", href: "/law-search", label: "条文検索", icon: Search, description: "条文番号・キーワードで安衛法・安衛則を全文検索" },
  { id: "law-hierarchy", href: "/law-hierarchy", label: "法令体系", icon: Network, description: "法→政令→省令→告示の階層構造を俯瞰" },
  { id: "circulars", href: "/circulars", label: "通達DB", icon: FileText, description: "厚労省 通達・告示・指針 1,069 件をキーワード+期間+種別で検索" },
  { id: "glossary", href: "/glossary", label: "用語集", icon: BookOpen, description: "労働安全衛生の用語を辞書形式で解説" },
  { id: "chatbot", href: "/chatbot", label: "AIチャット", icon: MessageSquare, description: "条文番号と出典付きで自然文の質問に回答" },
];

export function LawHubNav({ current }: LawHubNavProps) {
  const active = NAV_ITEMS.find((it) => it.id === current);
  return (
    <nav
      aria-label="法令ツールナビ"
      className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap gap-2">
          <span className="self-center mr-1 text-[11px] font-bold text-slate-500">法令まわり：</span>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={item.id === current ? "page" : undefined}
                title={`${item.label} — ${item.description}`}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ${
                  item.id === current
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </a>
            );
          })}
        </div>
        {active && (
          <p className="mt-2 text-[11px] leading-snug text-slate-600">
            <span className="font-semibold text-slate-700">{active.label}：</span>
            {active.description}
          </p>
        )}
      </div>
    </nav>
  );
}

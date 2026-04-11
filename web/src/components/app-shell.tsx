"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  ClipboardList,
  Monitor,
  GraduationCap,
  BookOpen,
  Database,
  Scale,
  Brain,
  MessageSquare,
  ShoppingBag,
  Bell,
  Search,
  MapPin,
  Mail,
  CloudRain,
  FileText,
  TestTube2,
  RefreshCw,
} from "lucide-react";
import { Footer } from "@/components/footer";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

type NavCategory = {
  label: string;
  items: NavItem[];
};

const NAV_CATEGORIES: NavCategory[] = [
  {
    label: "",
    items: [{ id: "home", label: "ホーム", href: "/", icon: Home }],
  },
  {
    label: "マップ",
    items: [
      { id: "signage", label: "サイネージ", href: "/signage", icon: Monitor },
      { id: "bear-map", label: "クマ出没マップ", href: "/bear-map", icon: MapPin },
      { id: "weather-risk", label: "気象リスク", href: "/risk", icon: CloudRain },
    ],
  },
  {
    label: "学習",
    items: [
      { id: "elearning", label: "Eラーニング", href: "/e-learning", icon: GraduationCap },
      { id: "exam-quiz", label: "過去問", href: "/exam-quiz", icon: BookOpen },
    ],
  },
  {
    label: "法律",
    items: [
      { id: "laws", label: "法改正", href: "/laws", icon: Scale },
      { id: "law-search", label: "法令検索", href: "/law-search", icon: Search },
      { id: "chatbot", label: "法令チャット", href: "/chatbot", icon: MessageSquare, badge: "AI" },
    ],
  },
  {
    label: "現場ツール",
    items: [
      { id: "ky-sheet", label: "KY用紙", href: "/ky", icon: ClipboardList },
      { id: "risk-prediction", label: "リスク予測", href: "/risk-prediction", icon: Brain, badge: "AI" },
      { id: "safety-diary", label: "安全衛生日誌", href: "/safety-diary", icon: FileText, badge: "soon" },
    ],
  },
  {
    label: "事例・データ",
    items: [
      { id: "accidents", label: "事故データベース", href: "/accidents", icon: Database },
      { id: "chemical-ra", label: "化学物質RA", href: "/chemical-ra", icon: TestTube2, badge: "soon" },
    ],
  },
  {
    label: "ショップ",
    items: [
      { id: "goods", label: "安全グッズ", href: "/goods", icon: ShoppingBag },
      { id: "notifications", label: "通知/配信", href: "/notifications", icon: Bell, badge: "soon" },
      { id: "contact", label: "お問い合わせ", href: "/contact", icon: Mail },
    ],
  },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const linkClass = (item: NavItem) => {
    const active = navActive(pathname, item.href);
    const base = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm";
    if (active) return `${base} bg-emerald-100/80 font-semibold text-emerald-900`;
    if (item.badge) return `${base} font-semibold text-blue-700 hover:bg-blue-50`;
    return `${base} text-slate-700 hover:bg-emerald-50`;
  };

  const renderNavItems = (items: NavItem[], onClickLink?: () => void) =>
    items.map((item) => {
      const active = navActive(pathname, item.href);
      const Icon = item.icon;
      return (
        <Link
          key={item.id}
          href={item.href}
          className={linkClass(item)}
          onClick={onClickLink}
        >
          <Icon
            className={`h-4 w-4 shrink-0 ${
              active ? "text-emerald-700" : item.badge ? "text-blue-500" : "text-slate-400"
            }`}
          />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && !active && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                item.badge === "soon"
                  ? "bg-slate-200 text-slate-500"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {item.badge === "soon" ? "準備中" : item.badge}
            </span>
          )}
        </Link>
      );
    });

  return (
    <div className="flex min-h-full w-full bg-white shadow-sm">
      {/* PC sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 px-3 py-5 lg:flex">
        <div className="mb-4 flex items-start justify-between px-1">
          <div>
            <p className="text-xs font-bold tracking-wide text-emerald-700">ANZEN AI</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              現場の安全を、AIで変える。
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            title="ページを更新"
            aria-label="ページを更新"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <nav aria-label="サイト全体ナビゲーション" className="space-y-4">
          {NAV_CATEGORIES.map((cat) => (
            <div key={cat.label || "__top__"}>
              {cat.label && (
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {cat.label}
                </p>
              )}
              <div className="space-y-0.5">{renderNavItems(cat.items)}</div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-full flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-b from-emerald-50 to-white px-4 py-3 lg:hidden">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-emerald-700">ANZEN AI</p>
            <p className="text-xs text-slate-700">現場の安全を、AIで変える。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="ページを更新"
              aria-label="ページを更新"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm"
              aria-expanded={isSidebarOpen}
              aria-label="メニューを開閉"
            >
              {isSidebarOpen ? "閉じる" : "メニュー"}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {isSidebarOpen && (
          <div className="z-20 border-b border-slate-200 bg-slate-50/95 px-3 py-3 shadow-sm lg:hidden">
            <nav aria-label="サイト全体ナビゲーション（モバイル）" className="space-y-3">
              {NAV_CATEGORIES.map((cat) => (
                <div key={cat.label || "__top__"}>
                  {cat.label && (
                    <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {cat.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {renderNavItems(cat.items, () => setIsSidebarOpen(false))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        )}

        <main className="flex flex-1 flex-col">
          <div className="mx-auto w-full max-w-7xl flex-1">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

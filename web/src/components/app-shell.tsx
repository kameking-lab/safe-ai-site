"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Footer } from "@/components/footer";

type AppShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  id: string;
  label: string;
  href: string;
  highlight?: boolean;
};

const navItems: NavItem[] = [
  { id: "home", label: "ホーム", href: "/" },
  { id: "signage", label: "サイネージ", href: "/signage" },
  { id: "risk-prediction", label: "AIリスク予測", href: "/risk-prediction", highlight: true },
  { id: "today-risk", label: "今日の現場リスク", href: "/risk" },
  { id: "chatbot", label: "安衛法チャットボット", href: "/chatbot", highlight: true },
  { id: "laws", label: "法改正", href: "/laws" },
  { id: "accidents", label: "事故データベース", href: "/accidents" },
  { id: "elearning", label: "Eラーニング", href: "/e-learning" },
  { id: "ky-sheet", label: "KY用紙", href: "/ky" },
  { id: "notification-settings", label: "通知/配信", href: "/notifications" },
  { id: "pdf", label: "PDF出力", href: "/pdf" },
  { id: "goods", label: "安全グッズ", href: "/goods" },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const linkClass = (item: NavItem) => {
    const active = navActive(pathname, item.href);
    const base = "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm";
    if (active) return `${base} bg-emerald-100/80 font-semibold text-emerald-900`;
    if (item.highlight) return `${base} font-semibold text-blue-700 hover:bg-blue-50`;
    return `${base} text-slate-800 hover:bg-emerald-50`;
  };

  return (
    <div className="flex min-h-full w-full bg-white shadow-sm">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 px-4 py-5 lg:flex">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-wide text-emerald-700">安全AIサイト</p>
          <p className="mt-1 text-[11px] text-slate-600">
            法改正・現場リスク・事故DB・学習コンテンツへの入り口をまとめています。
          </p>
        </div>
        <nav aria-label="サイト全体ナビゲーション" className="space-y-1 text-sm">
          {navItems.map((item) => (
            <Link key={item.id} href={item.href} className={linkClass(item)}>
              <span>{item.label}</span>
              {item.highlight && !navActive(pathname, item.href) && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  AI
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-full flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-b from-emerald-50 to-white px-4 py-3 lg:hidden">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-emerald-700">安全AIサイト</p>
            <p className="text-xs text-slate-700">法改正・現場リスク・事故DBへの入り口</p>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm"
            aria-expanded={isSidebarOpen}
            aria-label="メニューを開閉"
          >
            メニュー
          </button>
        </div>

        {isSidebarOpen && (
          <div className="z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 text-sm shadow-sm lg:hidden">
            <nav aria-label="サイト全体ナビゲーション（モバイル）" className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={linkClass(item)}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span>{item.label}</span>
                  {item.highlight && !navActive(pathname, item.href) && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      AI
                    </span>
                  )}
                </Link>
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

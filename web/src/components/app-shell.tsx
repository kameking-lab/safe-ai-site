"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type AppShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  id: string;
  label: string;
  href: string;
  status: "ready" | "beta";
};

const navItems: NavItem[] = [
  { id: "home", label: "ホーム", href: "/", status: "ready" },
  { id: "signage", label: "サイネージ", href: "/signage", status: "ready" },
  { id: "laws", label: "法改正", href: "/laws", status: "ready" },
  { id: "today-risk", label: "今日の現場リスク", href: "/risk", status: "ready" },
  { id: "accidents", label: "事故データベース", href: "/accidents", status: "ready" },
  { id: "elearning", label: "Eラーニング", href: "/e-learning", status: "beta" },
  { id: "ky-sheet", label: "KY用紙", href: "/ky", status: "beta" },
  { id: "notification-settings", label: "通知/配信", href: "/notifications", status: "beta" },
  { id: "pdf", label: "PDF出力", href: "/pdf", status: "beta" },
  { id: "goods", label: "安全グッズ", href: "/goods", status: "ready" },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const linkClass = (href: string) =>
    `flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-slate-800 hover:bg-emerald-50 ${
      navActive(pathname, href) ? "bg-emerald-100/80 font-semibold text-emerald-900" : ""
    }`;

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
            <Link key={item.id} href={item.href} className={linkClass(item.href)}>
              <span>{item.label}</span>
              {item.status === "beta" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  beta
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
                  className={linkClass(item.href)}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span>{item.label}</span>
                  {item.status === "beta" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      beta
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        )}

        <main className="flex flex-1 flex-col">
          <div className="mx-auto w-full max-w-6xl flex-1">{children}</div>
        </main>
      </div>
    </div>
  );
}

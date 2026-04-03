"use client";

import { useState } from "react";

type AppShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  id: string;
  label: string;
  target?: string;
  status: "ready" | "coming-soon";
};

const navItems: NavItem[] = [
  { id: "home", label: "ホーム", status: "ready" },
  { id: "laws", label: "法改正", target: "section-laws", status: "ready" },
  {
    id: "today-risk",
    label: "今日の現場リスク",
    target: "section-weather-risk",
    status: "ready",
  },
  {
    id: "accidents",
    label: "事故データベース",
    target: "section-accidents",
    status: "ready",
  },
  {
    id: "elearning",
    label: "Eラーニング",
    target: "section-elearning",
    status: "coming-soon",
  },
  {
    id: "ky-sheet",
    label: "KY用紙",
    target: "section-ky-sheet",
    status: "coming-soon",
  },
  {
    id: "notification-settings",
    label: "通知設定",
    target: "section-notification-settings",
    status: "coming-soon",
  },
];

function scrollToTarget(target?: string) {
  if (!target) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.getElementById(target);
  if (!el) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavigate = (item: NavItem) => {
    scrollToTarget(item.target);
    setIsSidebarOpen(false);
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md bg-white shadow-sm lg:max-w-6xl lg:flex">
      {/* デスクトップ用サイドバー */}
      <aside className="hidden w-56 flex-col border-r border-slate-200 bg-slate-50/80 px-4 py-5 lg:flex">
        <div className="mb-4">
          <p className="text-xs font-semibold tracking-wide text-emerald-700">安全AIサイト</p>
          <p className="mt-1 text-[11px] text-slate-600">
            法改正・現場リスク・事故DB・学習コンテンツへの入り口をまとめています。
          </p>
        </div>
        <nav aria-label="サイト全体ナビゲーション" className="space-y-1 text-sm">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-slate-800 hover:bg-emerald-50"
            >
              <span>{item.label}</span>
              {item.status === "coming-soon" && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  準備中
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* 本文 + モバイルヘッダー */}
      <div className="flex min-h-full flex-1 flex-col">
        {/* モバイル用トップバー */}
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

        {/* モバイル用ドロワー */}
        {isSidebarOpen && (
          <div className="z-20 border-b border-slate-200 bg-slate-50/95 px-4 py-3 text-sm shadow-sm lg:hidden">
            <nav aria-label="サイト全体ナビゲーション（モバイル）" className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-slate-800 hover:bg-emerald-50"
                >
                  <span>{item.label}</span>
                  {item.status === "coming-soon" && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      準備中
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        )}

        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

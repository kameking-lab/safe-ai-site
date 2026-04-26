"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Search, MessageSquare, UserRound } from "lucide-react";

/**
 * 山田職長級モバイル（iPhone SE 375px）専用ボトムナビ。
 * - 480px 以下のみ表示（CSS側で .mobile-bottom-nav を可視化）
 * - safe-area-inset-bottom 対応（iOS ホームバー回避）
 * - 5 アイコン（ホーム / KY / 検索 / AIチャット / マイ）
 * - 各アイコン領域は 48px 以上のタップ領域を保証（globals.css の .tap-target）
 *
 * 既存ページ側は body {padding-bottom} で固定ナビ分の余白を確保（globals.css）。
 */
const ITEMS = [
  { id: "home", label: "ホーム", href: "/", icon: Home },
  { id: "ky", label: "KY", href: "/ky", icon: ClipboardList },
  { id: "search", label: "検索", href: "/law-search", icon: Search },
  { id: "chat", label: "AIチャット", href: "/chatbot", icon: MessageSquare },
  { id: "account", label: "マイ", href: "/account", icon: UserRound },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="モバイル ボトムナビゲーション"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`tap-target flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] leading-tight ${
                  active
                    ? "font-bold text-emerald-700"
                    : "font-medium text-slate-600"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${active ? "text-emerald-700" : "text-slate-500"}`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default MobileBottomNav;

"use client";

/**
 * P0-016 (usability-audit-day3-2026-05-24):
 * /favorites ページのリスト本体。
 *
 * localStorage から条文・通達のお気に入りを読み込み、種別タブで切替表示。
 * 各エントリに削除ボタン + 元ページへのリンク。空状態は使い方ガイドを表示。
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import {
  loadFavorites,
  removeFavorite,
  type FavoriteEntry,
  type FavoriteKind,
} from "@/lib/favorites";

type Tab = "all" | FavoriteKind;

const TAB_LABEL: Record<Tab, string> = {
  all: "すべて",
  article: "条文",
  notice: "通達",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

export function FavoritesList() {
  const [tab, setTab] = useState<Tab>("all");
  const [list, setList] = useState<FavoriteEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration
    setList(loadFavorites());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  const visible = tab === "all" ? list : list.filter((e) => e.kind === tab);
  const counts: Record<Tab, number> = {
    all: list.length,
    article: list.filter((e) => e.kind === "article").length,
    notice: list.filter((e) => e.kind === "notice").length,
  };

  const handleRemove = (entry: FavoriteEntry) => {
    if (!window.confirm(`「${entry.title}」をお気に入りから削除しますか?`)) return;
    removeFavorite(entry.kind, entry.id);
    setList(loadFavorites());
  };

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        読み込み中…
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-bold text-amber-900">まだお気に入りはありません</p>
        <p className="mt-2 text-xs leading-relaxed text-amber-800">
          /law-search の条文カードや /circulars の通達一覧で「⭐ お気に入り」を押すと、ここに保存されます。
          最大 50 件まで端末内 (localStorage) に保持。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/law-search"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            法令検索を開く →
          </Link>
          <Link
            href="/circulars"
            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
          >
            通達一覧を開く →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="お気に入りの種別" className="flex gap-2">
        {(["all", "article", "notice"] as Tab[]).map((k) => {
          const isActive = tab === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(k)}
              className={
                isActive
                  ? "rounded-full border border-emerald-600 bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-300"
              }
            >
              {TAB_LABEL[k]}
              <span
                className={
                  isActive
                    ? "ml-2 inline-flex min-w-[1.5rem] justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-semibold"
                    : "ml-2 inline-flex min-w-[1.5rem] justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-700"
                }
              >
                {counts[k]}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="space-y-2">
        {visible.map((e) => (
          <li
            key={`${e.kind}-${e.id}`}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-amber-300"
          >
            <Star
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
              fill="currentColor"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  className={
                    e.kind === "article"
                      ? "rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800"
                      : "rounded-full bg-violet-100 px-2 py-0.5 font-bold text-violet-800"
                  }
                >
                  {e.kind === "article" ? "条文" : "通達"}
                </span>
                <span className="text-slate-500">{e.subtitle}</span>
                <span className="ml-auto text-[10px] text-slate-400">
                  {formatDate(e.addedAt)}
                </span>
              </div>
              <Link
                href={e.href}
                className="mt-1 block text-sm font-bold text-slate-900 hover:text-emerald-700"
              >
                {e.title}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(e)}
              aria-label={`「${e.title}」を削除`}
              title="削除"
              className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

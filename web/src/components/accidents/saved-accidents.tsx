"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import { loadFavoritesByKind, removeFavorite, type FavoriteEntry } from "@/lib/favorites";

/**
 * P2-4 保存した事故事例（お気に入り）一覧。/accidents に表示。
 * 既存の汎用お気に入りストア(lib/favorites.ts kind="accident")を再利用。localStorage・端末内。
 * 1件以上保存されている場合のみ表示（既存ページ非干渉）。
 */
export function SavedAccidents() {
  const [list, setList] = useState<FavoriteEntry[] | null>(null);

  const reload = useCallback(() => {
    setList(loadFavoritesByKind("accident"));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration
    setList(loadFavoritesByKind("accident"));
  }, []);

  if (list === null || list.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50/50 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Star className="h-5 w-5 text-yellow-500" aria-hidden="true" />
        保存した事故事例（{list.length}）
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">この端末に保存。報告書・朝礼資料の準備にご活用ください。</p>
      <ul className="mt-3 space-y-1.5">
        {list.map((e) => (
          <li key={e.id} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
            <Link href={e.href} className="flex-1">
              <span className="block text-sm font-semibold text-slate-800">{e.title}</span>
              <span className="mt-0.5 block text-[11px] text-slate-500">{e.subtitle}</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                removeFavorite("accident", e.id);
                reload();
              }}
              aria-label="保存から削除"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

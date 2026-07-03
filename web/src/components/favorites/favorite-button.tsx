"use client";

/**
 * P0-016 (usability-audit-day3-2026-05-24):
 * 「⭐ お気に入り」ボタン (条文・通達共通)。
 *
 * 初期マウント時に localStorage を読み、isFavorited を反映。クリックで
 * toggleFavorite を呼んで状態反転。SSR レンダリング時は OFF 状態で出す
 * (hydration 後に正しい状態に updates)。
 */

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  isFavorited,
  toggleFavorite,
  type FavoriteKind,
} from "@/lib/favorites";

type FavoriteButtonProps = {
  kind: FavoriteKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  /** ボタンサイズ。compact = アイコンのみ、normal = アイコン + ラベル */
  variant?: "compact" | "normal";
};

export function FavoriteButton({
  kind,
  id,
  title,
  subtitle,
  href,
  variant = "compact",
}: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration
    setFavorited(isFavorited(kind, id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [kind, id]);

  const handleToggle = () => {
    const result = toggleFavorite({ kind, id, title, subtitle, href });
    setFavorited(result.added);
  };

  const label = favorited ? "お気に入りから削除" : "お気に入りに追加";
  const showLabel = variant === "normal";

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={favorited}
        aria-label={label}
        title={label}
        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border transition ${
          favorited
            ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "border-slate-200 bg-white text-slate-400 hover:border-amber-300 hover:text-amber-700"
        }`}
      >
        <Star
          className="h-4 w-4"
          fill={hydrated && favorited ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={favorited}
      title={label}
      className={`inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-3 py-1 text-[11px] font-semibold transition ${
        favorited
          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
      }`}
    >
      <Star
        className="h-3.5 w-3.5"
        fill={hydrated && favorited ? "currentColor" : "none"}
        aria-hidden="true"
      />
      {showLabel && (favorited ? "お気に入り済" : "お気に入り")}
    </button>
  );
}

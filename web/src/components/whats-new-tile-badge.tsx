"use client";

import { useEffect, useState } from "react";
import { countNewDates } from "@/lib/news-conclusions";

// /whats-new と同じ localStorage キー＝同じ「前回閲覧」基準で件数を出す
const LAST_VISIT_KEY = "anzen_whatsnew_last_visit_v1";

/**
 * トップの「新着」タイルに付ける未読バッジ（柱0: 自分に関係あるか3秒）。
 * 前回 /whats-new を見た以降の新着があれば青バッジで件数を点灯。
 * 見た後は消える＝バッジが付いている時だけ開けばよい、が一目で分かる。
 * SSR とのハイドレーション一致のため、マウント前は何も描画しない。
 */
export function WhatsNewTileBadge({ dates }: { dates: string[] }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // マイクロタスクへ遅延し、effect内の同期setStateによるカスケード再描画を避ける
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const lastVisit = window.localStorage.getItem(LAST_VISIT_KEY);
        setCount(countNewDates(dates, lastVisit));
      } catch {
        // localStorage 不可環境ではバッジを出さない（タイル自体は機能する）
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dates]);

  if (count <= 0) return null;
  return (
    <span
      aria-label={`新着${count}件`}
      className="absolute -right-1.5 -top-1.5 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-sky-700 px-1.5 text-[11px] font-bold leading-none text-white shadow"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

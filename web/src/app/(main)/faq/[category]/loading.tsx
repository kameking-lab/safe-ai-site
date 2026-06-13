import { PageSkeleton } from "@/components/skeleton";

// C-1: app/loading.tsx の全ルート共通境界は、静的ページに「スケルトン先行ペイント
// →$RCスワップ」を焼き込み LCP/CLS を悪化させるため廃止した（詳細は
// docs/site-critique-2026-06-11/c1-mobile-perf-structural-2026-06-12.md）。
// 動的レンダリング（ƒ）のこのセグメントのみ、ナビゲーション時の即時フィードバック
// として個別に loading を持つ。静的ページを含むセグメントには置かないこと。
export default function Loading() {
  return <PageSkeleton label="ページを読み込み中" />;
}

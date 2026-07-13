"use client";

import { FileText, BookOpen } from "lucide-react";
import { HomeScreen } from "@/components/home-screen";
import { LastUpdatedBadge } from "@/components/last-updated-badge";
import { TranslatedPageHeader } from "@/components/translated-page-header";
// C-1: 一覧コンポーネントは laws ページ側で import して HomeScreen に注入する。
// home-screen が静的 import すると /accidents のバンドルにも同梱されるため。
import { LawRevisionList } from "@/components/law-revision-list";
import type { LawRevision } from "@/lib/types/domain";

export function LawsPageClient({ initialRevisions }: { initialRevisions?: LawRevision[] }) {
  // C-1: ?tab= は HomeScreen がマウント後に window.location から復元する。
  // useSearchParams をここで呼ぶと静的プリレンダーが Suspense フォールバックへ
  // 落ち、/laws 本文全体がクライアント差し替えになる（LCP/CLS悪化）。
  // 法改正一覧の初期データは server page から受け取る（バンドル同梱の回避）。
  return (
    <HomeScreen variant="laws" initialRevisions={initialRevisions} LawsListComponent={LawRevisionList}>
      <TranslatedPageHeader
        titleJa="法改正一覧"
        titleEn="Law Updates"
        descriptionJa="労働安全衛生法の改正情報をAI要約付きで確認"
        descriptionEn="Stay up to date with occupational safety law revisions (AI summaries included)"
        iconName="Scale"
        iconColor="blue"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <LastUpdatedBadge />
        <a
          href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />厚労省 安衛法 新旧対照表（公式）
        </a>
        <a
          href="/laws/glossary"
          className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 hover:bg-purple-100"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />法令用語集
        </a>
      </div>
    </HomeScreen>
  );
}

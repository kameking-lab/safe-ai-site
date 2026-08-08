import type { Metadata } from "next";
import { AlertTriangle, ExternalLink, ShieldAlert } from "lucide-react";
import { PageContainer } from "@/components/layout";

const TITLE = "安全標識データの検証状況";
const DESCRIPTION =
  "旧安全標識データは、法令・指針・JIS・サイト独自推奨の区分を再検証するまで公開停止しています。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/safety-signs" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function SafetySignsHubPage() {
  return (
    <PageContainer width="prose">
      <header>
        <p className="inline-flex items-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          quarantine・公開可能0件
        </p>
        <div className="mt-4 flex items-start gap-3">
          <ShieldAlert
            className="h-8 w-8 shrink-0 text-amber-800"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            安全標識データは独立検証のため公開停止中です
          </h1>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          旧データでは、法令上の義務、行政指針、JIS上の表現、サイト独自の推奨を十分に区別できていませんでした。
          個別標識、カテゴリ、業種別セットを検索・サイトマップ・構造化データから除外しています。
        </p>
      </header>

      <section className="mt-6 rounded-2xl border-2 border-amber-400 bg-amber-50 p-5">
        <h2 className="text-lg font-bold text-amber-950">再公開の品質ゲート</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-950">
          <li>法令、告示、指針、JIS、独自推奨を別フィールドにする</li>
          <li>標識ごとに一次資料、対象条件、確認日を登録する</li>
          <li>有料規格の図形・文言を転載しない</li>
          <li>確認済みレコードだけをallowlistで公開する</li>
        </ul>
      </section>

      <a
        href="https://www.jisc.go.jp/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        日本産業標準調査会を開く
      </a>
    </PageContainer>
  );
}

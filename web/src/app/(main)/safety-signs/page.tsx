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
          公開停止中
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
          法令・指針・JISとの対応を再確認するため、安全標識データの公開を停止しています。
          規格の確認には、日本産業標準調査会のサイトをご利用ください。
        </p>
      </header>

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

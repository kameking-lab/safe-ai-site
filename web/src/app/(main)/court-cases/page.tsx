import type { Metadata } from "next";
import { AlertTriangle, ExternalLink, Scale } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { SITE_URL } from "@/lib/seo-metadata";

const TITLE = "労災・労働判例データの検証状況";
const DESCRIPTION =
  "旧判例要旨は裁判所・事件・出典の誤対応が確認されたため公開停止中です。裁判所の裁判例検索を案内します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/court-cases" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function CourtCasesPage() {
  const url = `${SITE_URL}/court-cases`;
  return (
    <PageContainer width="wide">
      <JsonLd
        schema={[
          webPageSchema({ name: TITLE, description: DESCRIPTION, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "判例データの検証状況", url },
          ]),
        ]}
      />
      <header className="max-w-4xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          公開停止中
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Scale className="h-8 w-8 text-amber-800" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            労災・労働判例要旨は出典再検証のため公開停止中です
          </h1>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          出典との対応に誤りが見つかったため、判例要旨の公開を停止しています。
          判決原文は裁判所の裁判例検索で確認してください。
        </p>
      </header>

      <a
        href="https://www.courts.go.jp/app/hanrei_jp/search1"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        裁判所の裁判例検索を開く
      </a>
      <p className="mt-4 max-w-4xl text-xs leading-6 text-slate-600">
        個別案件は弁護士等の専門家へ相談してください。
      </p>
    </PageContainer>
  );
}

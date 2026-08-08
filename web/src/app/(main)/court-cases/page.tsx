import type { Metadata } from "next";
import { AlertTriangle, ExternalLink, Scale } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { SITE_URL } from "@/lib/seo-metadata";

const TITLE = "労災・労働判例データの検証状況";
const DESCRIPTION =
  "旧判例要旨は裁判所・事件・出典の誤対応が確認されたため公開停止中です。裁判所の裁判例検索と検証再開条件を案内します。";

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
          quarantine・公開可能0件
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Scale className="h-8 w-8 text-amber-800" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            労災・労働判例要旨は出典再検証のため公開停止中です
          </h1>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          旧データの一部で、裁判所・法廷、裁判年月日、判例誌、事件内容の対応が
          一次資料と一致しないことを確認しました。「全件実在確認済み」という旧表示も、
          実際の監査範囲を超えていました。個別ページ、サイト内検索、サイトマップ、
          印刷資料、AI回答の根拠から全件を除外しています。
        </p>
      </header>

      <section className="mt-6 max-w-4xl rounded-2xl border-2 border-amber-400 bg-amber-50 p-5">
        <h2 className="text-lg font-bold text-amber-950">再公開の必須条件</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-950">
          <li>事件番号、裁判所・法廷、裁判年月日を照合する</li>
          <li>裁判所の個別判決URLまたは公式判例集を登録する</li>
          <li>要旨の各主張に支持箇所を対応付ける</li>
          <li>確認日、reviewer、訂正履歴を記録し、独立レビューを通す</li>
        </ul>
      </section>

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
        状態更新日: 2026年7月24日。公開停止は、関連する裁判例が存在しないという意味ではありません。
        個別案件は弁護士等の専門家へ相談してください。
      </p>
    </PageContainer>
  );
}

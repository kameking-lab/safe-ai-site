import type { Metadata } from "next";
import { AlertTriangle, ExternalLink, Gauge } from "lucide-react";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { SITE_URL } from "@/lib/seo-metadata";

const TITLE = "作業環境測定ツールの検証状況";
const DESCRIPTION =
  "旧管理区分判定式は作業環境評価基準の正式式と一致しないため公開停止中です。作業環境測定機関と公式資料への確認導線を案内します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/work-environment-measurement" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function WorkEnvironmentMeasurementPage() {
  const url = `${SITE_URL}/work-environment-measurement`;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        schema={[
          webPageSchema({ name: TITLE, description: DESCRIPTION, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "作業環境測定ツールの検証状況", url },
          ]),
        ]}
      />
      <header>
        <p className="inline-flex items-center gap-2 rounded-full border border-rose-400 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-900">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          fail-closed・判定停止
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Gauge className="h-8 w-8 text-rose-800" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            作業環境測定の管理区分判定は公開停止中です
          </h1>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          旧判定ロジックは、A測定の第1・第2評価値に必要な正式式と補正を実装せず、
          B測定の境界も作業環境評価基準と一致していませんでした。入力不足でも法的区分を表示していたため、
          対象作業場チェッカー、管理区分算出、措置・期限の表示、検索、構造化データ、サイトマップを停止しました。
        </p>
      </header>

      <section className="mt-6 rounded-2xl border-2 border-rose-400 bg-rose-50 p-5">
        <h2 className="text-lg font-bold text-rose-950">
          旧ツールの結果を法定判断や帳票へ使用しないでください
        </h2>
        <p className="mt-2 text-sm leading-7 text-rose-950">
          測定対象、デザイン、統計処理、管理濃度、評価、措置は対象物質・作業場・測定方法で異なります。
          登録作業環境測定機関または作業環境測定士へ確認し、公式の告示・通達を使用してください。
        </p>
      </section>

      <section className="mt-8" aria-labelledby="measurement-official-links">
        <h2
          id="measurement-official-links"
          className="text-xl font-bold text-slate-950"
        >
          公式情報
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href="https://www.mhlw.go.jp/web/t_doc?dataId=74088000&dataType=0&pageNo=1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:border-emerald-500"
          >
            作業環境評価基準
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000118540.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:border-emerald-500"
          >
            厚生労働省 作業環境測定
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>
      <p className="mt-6 text-xs leading-6 text-slate-600">
        状態更新日: 2026年7月24日。再公開には正式式、必要入力、対象物質別条件、公式ゴールドケースの独立検証が必要です。
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { AlertTriangle, ExternalLink, Stethoscope } from "lucide-react";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { SITE_URL } from "@/lib/seo-metadata";

const TITLE = "健康診断スケジューラの検証状況";
const DESCRIPTION =
  "旧スケジューラは法定期限後へ予定を移動できる不具合が確認されたため判定・印刷を停止中です。公式情報と再公開条件を案内します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/health-checkup-scheduler" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function HealthCheckupSchedulerPage() {
  const url = `${SITE_URL}/health-checkup-scheduler`;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        schema={[
          webPageSchema({ name: TITLE, description: DESCRIPTION, url }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "健康診断スケジューラの検証状況", url },
          ]),
        ]}
      />
      <header>
        <p className="inline-flex items-center gap-2 rounded-full border border-rose-400 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-900">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          fail-closed・判定／印刷停止
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Stethoscope className="h-8 w-8 text-rose-800" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            健康診断スケジューラは期限計算の再検証中です
          </h1>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          旧「繁忙期回避」機能は、健診予定を法定期限より後へ移動できました。
          期限判定も日を無視した月差比較で、約1か月の超過を見逃す場合がありました。
          不正日付の厳密検証も不足していたため、健診要否の判定、年間最適化、
          結果ページ、PDF・印刷、検索、構造化データ、サイトマップを停止しました。
        </p>
      </header>

      <section className="mt-6 rounded-2xl border-2 border-rose-400 bg-rose-50 p-5">
        <h2 className="text-lg font-bold text-rose-950">
          旧出力を実施期限の管理に使用しないでください
        </h2>
        <p className="mt-2 text-sm leading-7 text-rose-950">
          前回実施日、雇入日、配置転換日、対象業務・物質、法定間隔を確認し、
          産業医、健診実施機関、所轄労働基準監督署等へ確認してください。
        </p>
      </section>

      <a
        href="https://laws.e-gov.go.jp/law/347AC0000000057"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700"
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        e-Gov 労働安全衛生法を確認
      </a>
      <p className="mt-4 text-xs leading-6 text-slate-600">
        状態更新日: 2026年7月24日。再公開には実日付比較、不正日付拒否、期限後移動の禁止、
        対象制度別の公式境界ゴールドケースが必要です。
      </p>
    </div>
  );
}

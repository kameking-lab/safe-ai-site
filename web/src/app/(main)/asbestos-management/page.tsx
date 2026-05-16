import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import {
  ASBESTOS_FORMS,
  ASBESTOS_QUALIFICATIONS,
  WORK_PLANS,
} from "@/data/asbestos-rules";

const _title =
  "石綿（アスベスト）対応支援｜事前調査・労基署報告・作業計画テンプレート";
const _desc =
  "建築物の解体・改修工事における石綿障害予防規則対応をワンストップで支援。R4.4施行の事前調査結果報告義務、R5.10の建築物石綿含有建材調査者制度に対応した判定ツール、届出書類自動生成、レベル1〜3別の作業計画書テンプレート、必要資格一覧を提供します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/asbestos-management" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
    locale: "ja_JP",
  },
};

export default function AsbestosHubPage() {
  const totalForms = ASBESTOS_FORMS.length;
  const totalQuals = ASBESTOS_QUALIFICATIONS.length;
  const totalLevels = Object.keys(WORK_PLANS).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageJsonLd
        name="石綿（アスベスト）対応支援"
        description={_desc}
        path="/asbestos-management"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "石綿対応支援",
            url: "https://www.anzen-ai-portal.jp/asbestos-management",
          },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "石綿（アスベスト）対応支援",
          url: "https://www.anzen-ai-portal.jp/asbestos-management",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Any",
          offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
          description: _desc,
          inLanguage: ["ja"],
        }}
      />
      <PageContainer width="wide" className="py-8 md:py-12">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-stone-700">
            Asbestos Compliance Toolkit
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            石綿（アスベスト）対応支援
          </h1>
          <p className="mt-3 text-base text-slate-700">
            建築物の解体・改修工事では、令和4年4月以降
            <strong>事前調査結果の労基署報告</strong>
            が義務付けられ、令和5年10月からは
            <strong>建築物石綿含有建材調査者</strong>
            による調査が原則となりました。本ツールは、現場担当者が要否判定・届出書類生成・作業計画作成までを通しで進められるよう、石綿障害予防規則と大気汚染防止法の要件を整理しています。
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-4 text-sm sm:max-w-md">
            <div className="rounded-lg border border-stone-200 bg-white p-3">
              <dt className="text-xs text-slate-500">届出書類</dt>
              <dd className="mt-1 text-xl font-bold text-stone-700">
                {totalForms}
                <span className="ml-1 text-xs font-normal text-slate-500">種類</span>
              </dd>
            </div>
            <div className="rounded-lg border border-amber-100 bg-white p-3">
              <dt className="text-xs text-slate-500">作業計画テンプレ</dt>
              <dd className="mt-1 text-xl font-bold text-amber-700">
                {totalLevels}
                <span className="ml-1 text-xs font-normal text-slate-500">レベル</span>
              </dd>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-white p-3">
              <dt className="text-xs text-slate-500">関連資格</dt>
              <dd className="mt-1 text-xl font-bold text-emerald-700">
                {totalQuals}
                <span className="ml-1 text-xs font-normal text-slate-500">種類</span>
              </dd>
            </div>
          </dl>
        </header>

        <section className="mb-10 grid gap-4 md:grid-cols-2">
          <Link
            href="/asbestos-management/investigation-checker"
            className="block rounded-xl border border-stone-200 bg-white p-5 transition hover:border-stone-400 hover:shadow-md md:p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Step 1
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              事前調査・報告義務 判定ツール
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              建物用途・建築年・工事種別・請負金額・床面積から、事前調査義務、労基署および自治体（大防法）への結果報告義務、調査者資格要件を即時判定します。判定根拠条文付き。
            </p>
            <p className="mt-3 text-sm font-semibold text-stone-700">判定を開始する →</p>
          </Link>
          <Link
            href="/asbestos-management/notification-builder"
            className="block rounded-xl border border-amber-200 bg-white p-5 transition hover:border-amber-400 hover:shadow-md md:p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Step 2
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              届出書類リスト 自動生成
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              プロジェクト規模・石綿レベルに応じて、提出すべき届出書類・期限・記載事項・提出先を一覧化。掲示物・保存記録もまとめて出力できます。
            </p>
            <p className="mt-3 text-sm font-semibold text-amber-700">書類リストを作る →</p>
          </Link>
          <Link
            href="/asbestos-management/work-plan-template"
            className="block rounded-xl border border-emerald-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-md md:p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Step 3
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              作業計画書 テンプレート
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              レベル1（吹付け石綿）・レベル2（保温材等）・レベル3（成形板等）別の作業計画書テンプレート。隔離養生・PPE・気中濃度測定・廃棄物処理・健康管理を一括掲載。
            </p>
            <p className="mt-3 text-sm font-semibold text-emerald-700">テンプレートを見る →</p>
          </Link>
          <Link
            href="/asbestos-management/qualifications"
            className="block rounded-xl border border-sky-200 bg-white p-5 transition hover:border-sky-400 hover:shadow-md md:p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
              Step 4
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              必要資格一覧
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              石綿作業主任者・特別教育・建築物石綿含有建材調査者・分析者の取得要件と必要場面を整理。特別教育・技能講習DBへも連動します。
            </p>
            <p className="mt-3 text-sm font-semibold text-sky-700">資格一覧を見る →</p>
          </Link>
        </section>

        <section className="mb-10 rounded-xl border border-amber-200 bg-amber-50 p-5 md:p-6">
          <h2 className="text-base font-semibold text-amber-900">
            令和4年4月施行・事前調査結果報告義務のポイント
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-amber-900">
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-700" />
              <span>
                <strong>請負金額 100 万円以上</strong>の解体・改修工事は、石綿の有無にかかわらず労基署へ事前調査結果を電子報告する必要があります。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-700" />
              <span>
                <strong>床面積 80 m² 以上</strong>の建築物解体、または 100 万円以上の改修等の特定工事は、大気汚染防止法に基づき自治体への報告も必要です。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-700" />
              <span>
                報告様式は労基署・自治体で共通化され、<strong>「石綿事前調査結果報告システム」</strong>（GビズID）で同時申請できます。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-700" />
              <span>
                令和5年10月以降に着手する建築物の事前調査は、<strong>建築物石綿含有建材調査者</strong>等の有資格者が実施する必要があります。
              </span>
            </li>
          </ul>
        </section>

        <section className="mb-10 rounded-xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="text-base font-semibold text-slate-900">関連機能</h2>
          <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <li>
              <Link href="/industries/construction" className="text-emerald-700 hover:underline">
                建設業 安全管理ポータル
              </Link>
              ：解体・改修工事全般の安全管理と関連法令への動線。
            </li>
            <li>
              <Link href="/education-certification" className="text-emerald-700 hover:underline">
                特別教育・技能講習DB
              </Link>
              ：石綿作業主任者技能講習・石綿取扱作業従事者特別教育の根拠条文確認。
            </li>
            <li>
              <Link href="/circulars" className="text-emerald-700 hover:underline">
                通達原文
              </Link>
              ：基発「石綿障害予防規則の施行について」関係通達。
            </li>
            <li>
              <Link href="/health-checkup-scheduler" className="text-emerald-700 hover:underline">
                健康診断スケジューラ
              </Link>
              ：石綿健康診断（雇入れ時・6 ヶ月以内ごと）の自動判定。
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 md:p-6">
          <h2 className="text-base font-semibold text-slate-900">出典・参考資料</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>厚生労働省「石綿障害予防規則」「同規則の施行について」</li>
            <li>環境省「大気汚染防止法の解説」</li>
            <li>国土交通省「建築物の解体等における石綿飛散防止対策マニュアル」</li>
            <li>JATI協会「事前調査の手引き」「石綿作業マニュアル」</li>
            <li>建材試験センター「建築物石綿含有建材調査者講習テキスト」</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            本ページの情報は法令・通達の公開情報に基づく独自整理であり、特定の事業者の現場運用を保証するものではありません。実際の届出・作業計画作成にあたっては所轄労働基準監督署および自治体の最新運用をご確認ください。
          </p>
        </section>
      </PageContainer>
    </div>
  );
}

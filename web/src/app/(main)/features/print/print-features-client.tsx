"use client";

import Link from "next/link";
import { FEATURES, FEATURE_CATEGORIES, getFeaturesByCategory, type FeatureCategoryId } from "@/data/features-catalog";

export function PrintFeaturesClient() {
  return (
    <>
      {/* Print用CSS — @page A4 + 画面外に余計なものを隠す */}
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm 12mm; }
          html, body {
            background: white !important;
          }
          /* メインのナビゲーションやフッターを印刷対象外に */
          header, aside, footer, nav[aria-label*="ナビゲーション"], .no-print {
            display: none !important;
          }
          .print-page-break {
            page-break-before: always;
          }
          .print-avoid-break {
            page-break-inside: avoid;
          }
          a {
            color: #1e293b !important;
            text-decoration: none !important;
          }
          .print-section {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>

      <div className="px-4 py-6 sm:py-10">
        {/* 印刷ボタン (画面でのみ表示) */}
        <div className="no-print mx-auto max-w-5xl">
          <nav aria-label="パンくず" className="text-xs text-slate-500">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/features" className="hover:text-slate-800 hover:underline">
                  機能紹介
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li className="font-semibold text-slate-700">印刷用</li>
            </ol>
          </nav>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div>
              <p className="text-xs font-bold tracking-widest text-emerald-700">PRINT VIEW</p>
              <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                印刷用機能一覧（A4対応）
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                社内稟議・検討資料用に整形しています。「印刷する」ボタンからPDF保存または印刷してください。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
              >
                🖨 印刷する / PDF保存
              </button>
              <Link
                href="/features"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                通常表示に戻る
              </Link>
            </div>
          </div>
        </div>

        {/* 印刷本体 */}
        <article className="mx-auto mt-6 max-w-3xl bg-white text-[12px] leading-snug text-slate-900 sm:text-sm">
          {/* タイトル */}
          <header className="print-avoid-break mb-4 border-b-2 border-emerald-700 pb-3">
            <p className="text-[10px] font-bold tracking-widest text-emerald-700">
              ANZEN AI — 機能一覧（社内検討資料）
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              現場の安全を、AIで変える。
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              労働安全コンサルタント（登録番号260022）監修 ／ 全{FEATURES.length}機能
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              印刷日: <span className="print-only">{new Date().toLocaleDateString("ja-JP")}</span>
              <span className="screen-only">（印刷時に自動表示）</span>
            </p>
          </header>

          {/* サマリ */}
          <section className="print-avoid-break mb-4 rounded border border-slate-300 bg-slate-50 p-3">
            <h3 className="text-sm font-bold text-slate-900">サービス概要</h3>
            <p className="mt-1 text-xs leading-relaxed">
              ANZEN AIは、労働安全衛生法対応のクラウドポータルです。
              安衛法チャットボット・KY用紙・化学物質RA・事故DB・特別教育などを1つのアカウントで利用できます。
              スマートフォン・PC・現場サイネージに対応。
            </p>
            <ul className="mt-2 list-disc pl-5 text-xs">
              <li>
                改正安衛法（2024年4月施行）の化学物質RAに対応
              </li>
              <li>
                厚労省公開データを基にした事故DB・通達フォロー
              </li>
              <li>
                特別教育・能力向上教育の修了証発行・LMS管理
              </li>
              <li>
                現場での運用前提（スマホ・音声入力・PDF出力）
              </li>
            </ul>
          </section>

          {/* カテゴリ別機能一覧 */}
          {FEATURE_CATEGORIES.map((cat) => {
            const items = getFeaturesByCategory(cat.id as FeatureCategoryId);
            if (items.length === 0) return null;
            return (
              <section
                key={cat.id}
                className="print-avoid-break print-section mb-4 rounded border border-slate-300 p-3"
              >
                <h3 className="border-b border-slate-200 pb-1 text-base font-bold text-emerald-800">
                  {cat.title}（{items.length}機能）
                </h3>
                <p className="mt-1 text-[11px] text-slate-600">{cat.summary}</p>
                <ul className="mt-2 space-y-1.5">
                  {items.map((f) => (
                    <li key={f.slug} className="text-[11px]">
                      <p className="font-bold text-slate-900">
                        ▼ {f.title}
                        <span className="ml-2 text-slate-500">{f.href}</span>
                      </p>
                      <p className="text-slate-700">{f.description}</p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {/* お問い合わせ */}
          <section className="print-avoid-break mt-6 rounded border-2 border-emerald-700 bg-emerald-50 p-3">
            <h3 className="text-base font-bold text-emerald-900">お問い合わせ</h3>
            <p className="mt-1 text-xs">
              導入相談・受託業務・月額顧問のご相談は、お気軽にどうぞ。
              安全コンサルタントが直接対応します。
            </p>
            <ul className="mt-2 text-xs">
              <li>
                Webフォーム: https://safe-ai-site.vercel.app/contact
              </li>
              <li>料金プラン: https://safe-ai-site.vercel.app/pricing</li>
              <li>5分ツアー: https://safe-ai-site.vercel.app/features/quick-tour</li>
            </ul>
            <p className="mt-2 text-[10px] text-slate-600">
              監修: 労働安全コンサルタント（登録番号260022） ／ © 2026 ANZEN AI
            </p>
          </section>
        </article>
      </div>
    </>
  );
}

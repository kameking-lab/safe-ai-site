"use client";

import { Printer } from "lucide-react";
import { SITE_STATS } from "@/data/site-stats";
import { MHLW_MERGED_CHEMICAL_COUNT } from "@/lib/mhlw-chemicals";

const SITE_URL = "https://safe-ai-site.vercel.app";
// QR コードは Google Chart API は廃止のため、qrserver を利用（CDN フェールセーフ用に画像でフォールバック）。
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(SITE_URL)}`;

const FEATURES = [
  {
    icon: "📋",
    title: "通達・法令の即時参照",
    desc: `労働安全衛生関連 ${SITE_STATS.lawArticleCount} 条文と通達を一次出典付きで横断検索。RAG型チャットボットで条文根拠を提示。`,
  },
  {
    icon: "🗂",
    title: "事故データベース",
    desc: `厚労省全件 ${SITE_STATS.accidentDbCount} 件・死亡災害 ${SITE_STATS.mhlwDeathsCount} 件を業種・原因別に可視化。`,
  },
  {
    icon: "🧪",
    title: "化学物質情報",
    desc: `${MHLW_MERGED_CHEMICAL_COUNT.toLocaleString()} 物質の SDS・濃度限度値・発がん性区分を横断検索。RA 入力ツールも併設。`,
  },
  {
    icon: "📝",
    title: "KY 用紙のデジタル化",
    desc: "シンプル/詳細モード、業種別プリセット、音声入力、PDF 出力で現場の朝礼を即時化。",
  },
  {
    icon: "🎓",
    title: "Eラーニング・過去問",
    desc: "特別教育・法定教育・労働衛生の動画教材と過去問 1,000 問超。多様な働き方に配慮した設計。",
  },
];

export function LeafletPrintView() {
  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="bg-slate-100">
      {/* 印刷指示ボタン（印刷時には消える） */}
      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-slate-900">紹介リーフレット（A4両面）</h1>
            <p className="text-xs text-slate-500">
              下のプレビューを印刷ダイアログから「PDFとして保存」できます。余白は最小推奨。
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            <Printer className="h-4 w-4" />
            印刷 / PDF保存
          </button>
        </div>
      </div>

      {/* A4 ページ群（210 × 297 mm） */}
      <div className="leaflet-stage mx-auto max-w-[820px] space-y-6 p-4 print:max-w-none print:space-y-0 print:p-0">
        {/* 表面 */}
        <article
          aria-label="リーフレット表面"
          className="leaflet-page mx-auto flex aspect-[210/297] flex-col gap-5 bg-white p-10 shadow-lg print:shadow-none"
        >
          <header className="flex items-start justify-between gap-4 border-b-2 border-emerald-600 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                ANZEN AI — 研究・実証プロジェクト
              </p>
              <h2 className="mt-2 text-3xl font-extrabold leading-tight text-slate-900">
                現場の安全を、AI で変える。
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                労働安全衛生分野における AI・DX 活用を、個人運営で研究・実証する公開ポータル。
                通達・事故事例・化学物質情報・KY 用紙・Eラーニングを一次ソース付きで無料公開しています。
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">監修</p>
              <p className="text-sm font-bold text-slate-900">労働安全コンサルタント</p>
              <p className="text-[11px] text-slate-500">ANZEN AI 有資格者</p>
            </div>
          </header>

          <section className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              5 つの主要機能
            </p>
            <ul className="mt-3 space-y-2.5">
              {FEATURES.map((f) => (
                <li
                  key={f.title}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <span className="text-xl leading-none" aria-hidden="true">
                    {f.icon}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{f.title}</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-700">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <footer className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500">
                個人運営の研究プロジェクト・運営費用は運営者個人が負担しています。
              </p>
              <p className="text-[10px] font-bold text-emerald-700">{SITE_URL}</p>
            </div>
          </footer>
        </article>

        {/* 裏面 */}
        <article
          aria-label="リーフレット裏面"
          className="leaflet-page mx-auto flex aspect-[210/297] flex-col gap-5 bg-white p-10 shadow-lg print:shadow-none"
        >
          <header className="border-b border-slate-200 pb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              プロジェクトの規模（{SITE_URL.replace(/^https?:\/\//, "")}）
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">数字で見る ANZEN AI</h2>
          </header>

          {/* 統計ブロック */}
          <section className="grid grid-cols-3 gap-3">
            {[
              { v: SITE_STATS.lawArticleCount, l: "通達・法令条文" },
              { v: MHLW_MERGED_CHEMICAL_COUNT.toLocaleString(), l: "化学物質情報" },
              { v: SITE_STATS.accidentDbCount, l: "事故DB（全件）" },
              { v: SITE_STATS.mhlwDeathsCount, l: "死亡災害DB" },
              { v: SITE_STATS.siteCuratedCaseCount, l: "curated 事例" },
              { v: SITE_STATS.specialEdKinds, l: "特別教育種別" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-3 text-center"
              >
                <p className="text-2xl font-extrabold leading-none text-emerald-900">{s.v}</p>
                <p className="mt-1 text-[10px] font-medium text-emerald-700">{s.l}</p>
              </div>
            ))}
          </section>

          {/* QR + URL */}
          <section className="grid flex-1 grid-cols-[180px_1fr] items-center gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={QR_URL}
                alt={`ANZEN AI のQRコード（${SITE_URL}）`}
                width={160}
                height={160}
                className="h-40 w-40 border border-slate-300 bg-white p-1"
              />
              <p className="text-[9px] text-slate-500">スマホでスキャン</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                アクセス
              </p>
              <p className="mt-1 break-all text-base font-bold text-emerald-800">{SITE_URL}</p>
              <p className="mt-3 text-[11px] leading-5 text-slate-700">
                ブラウザだけで全機能をご利用いただけます。アカウント登録は不要、もちろん無料です。
                スマホ・PC・サイネージのいずれにも対応しています。
              </p>
            </div>
          </section>

          {/* 相談窓口 */}
          <section className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
              ご意見・改善提案・データ誤りの指摘 募集中
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              現場担当者・行政・研究者の皆さまのフィードバックをお待ちしています。
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-700">
              {SITE_URL}/contact から匿名でも投稿できます。データの誤り、追加してほしい機能、
              現場で使いにくい点など、お気軽にお書きください。業務に関するご相談もこちらから。
            </p>
          </section>

          <footer className="border-t border-slate-200 pt-3 text-center">
            <p className="text-[10px] text-slate-500">
              © 2026 ANZEN AI / 監修：ANZEN AI 専門家チーム
            </p>
          </footer>
        </article>
      </div>

      {/* 印刷用 CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, html { background: white !important; }
          .leaflet-stage { padding: 0 !important; }
          .leaflet-page {
            box-shadow: none !important;
            page-break-after: always;
            margin: 0 auto;
            width: 210mm;
            height: 297mm;
            aspect-ratio: auto;
          }
          .leaflet-page:last-child { page-break-after: auto; }
        }
        @page { size: A4; margin: 0; }
      `}</style>
    </div>
  );
}

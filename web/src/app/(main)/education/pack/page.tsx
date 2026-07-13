import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, FileDown, Monitor, Printer } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageJsonLd } from "@/components/page-json-ld";
import { EDUCATION_DECKS } from "@/data/education-decks";
import { getCurriculum, LICENSE_SUMMARY_3 } from "@/data/education-curriculum";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import { Mascot } from "@/components/mascot";

const TITLE = "無償・編集可の法定教育スライドパック";
const DESCRIPTION =
  "特別教育の学科・雇入れ時教育・労働衛生教育に使える無償教材（申請不要・編集可）。法定科目の網羅をCIで機械検証し法定対応表を同梱。最新の災害統計に自動追従。投影（16:9）・A4横印刷対応。教材の提供は教育の実施ではありません。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education/pack" },
  openGraph: withSiteOpenGraph("/education/pack", {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, "無償・申請不要・編集可・法定対応表つき"), width: 1200, height: 630 }],
  }),
  twitter: withSiteTwitter({ title: TITLE, description: DESCRIPTION, images: [ogImageUrl(TITLE, "無償教材")] }),
};

export default function EduPackIndexPage() {
  return (
    <>
      <PageJsonLd name={TITLE} description={DESCRIPTION} path="/education/pack" />
      <Breadcrumb items={[{ name: "教育", href: "/education" }, { name: "無償教材パック" }]} />
      <header className="mb-5 flex items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-transparent p-4 dark:from-emerald-950/25 dark:via-slate-900 sm:p-5">
        <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          無償・申請不要・編集可
        </span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">法定教育スライドパック</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          特別教育の学科・雇入れ時教育・労働衛生教育に使える無償の教育スライドです。ダウンロードに申請・登録・パスワードは不要。
          各教材は<strong>告示正本から構造化したカリキュラムレジストリとの機械照合（CI）</strong>で法定科目の網羅を検証し、
          <strong>法定対応表</strong>を同梱します。統計は最新の災害データに自動追従します。
        </p>
        </div>
        <Mascot variant="teacher" size="lg" alt="" className="hidden shrink-0 sm:block" />
      </header>

      {/* 特徴 */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Monitor aria-hidden="true" className="h-5 w-5 text-slate-700" />
          <p className="mt-2 text-sm font-bold text-slate-900">投影・印刷両対応</p>
          <p className="mt-0.5 text-xs text-slate-600">16:9投影モードとA4横印刷/PDF。朝礼・教育の場でそのまま使えます。</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <ShieldCheck aria-hidden="true" className="h-5 w-5 text-emerald-700" />
          <p className="mt-2 text-sm font-bold text-slate-900">法定充足を機械保証</p>
          <p className="mt-0.5 text-xs text-slate-600">告示正本の科目・範囲・時間との照合をCIで常時実施。宣伝でなく検証事実。</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <FileDown aria-hidden="true" className="h-5 w-5 text-slate-700" />
          <p className="mt-2 text-sm font-bold text-slate-900">編集可・出典明記でOK</p>
          <p className="mt-0.5 text-xs text-slate-600">自社の現場写真・事例を足して自由に改変可。出典を残すだけ。</p>
        </div>
      </div>

      {/* 利用条件サマリ */}
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-900">ご自由にお使いください</p>
        <ul className="mt-1.5 grid gap-1 sm:grid-cols-3">
          {LICENSE_SUMMARY_3.map((t) => (
            <li key={t} className="flex items-start gap-1.5 text-xs text-emerald-900">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-600" />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-emerald-800">
          <Link href="/education/pack/terms" className="underline">教材利用規約の全文 →</Link>
        </p>
      </div>

      {/* 教材一覧 */}
      <h2 className="mb-3 text-lg font-bold text-slate-900">教材ラインナップ</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {EDUCATION_DECKS.map((deck) => {
          const c = getCurriculum(deck.curriculumId);
          return (
            <li key={deck.slug}>
              <Link
                href={`/education/pack/${deck.slug}`}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-400 hover:shadow-sm"
              >
                <p className="text-sm font-bold text-slate-900">{deck.title}</p>
                <p className="mt-1 text-xs text-slate-600">{deck.audience}</p>
                <p className="mt-2 text-[11px] text-slate-500">{deck.basisDisplay}</p>
                <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <Printer aria-hidden="true" className="h-3.5 w-3.5" />
                  投影・印刷で開く（{deck.slides.length}枚）
                  {c?.educationClass === "circular" && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">通達ベース</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* 線引き */}
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
        <p className="font-bold">教材の提供は教育の「実施」ではありません</p>
        <p className="mt-1">
          本教材の閲覧・配布は、労働安全衛生法上の特別教育・労働衛生教育の「実施」には当たりません。科目・時間の充足、講師の選定、実技教育の実施、
          記録の作成・3年保存（安衛則第38条）は、教育を実施する事業者の責任で行ってください。技能講習は登録教習機関でのみ受講できます。
        </p>
      </div>
    </>
  );
}

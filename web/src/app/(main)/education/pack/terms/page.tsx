import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  LICENSE_CLAUSES,
  POSITIONING_SPECIAL,
  POSITIONING_CIRCULAR,
  POSITIONING_SKILL_PREP,
  CREDIT_LINE,
  IMPLEMENTATION_CHECKLIST,
} from "@/data/education-curriculum";

const TITLE = "教材利用規約（無償教育スライドパック）";
const DESCRIPTION =
  "無償教育スライドパックの利用条件。自社の安全衛生教育での投影・印刷・改変は無償・申請不要。出典明記が条件。改変した教材には法定対応表の保証は適用されません。教材の提供は教育の実施ではありません。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/education/pack/terms" },
};

export default function EduPackTermsPage() {
  return (
    <>
      <PageJsonLd name={TITLE} description={DESCRIPTION} path="/education/pack/terms" />
      <Breadcrumb
        items={[
          { name: "教育", href: "/education" },
          { name: "無償教材パック", href: "/education/pack" },
          { name: "教材利用規約" },
        ]}
      />
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">教材利用規約</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          本規約は、当サイトが無償公開する教育スライドパック（以下「本教材」）の利用条件を定めるものです。
          「ご自由にお使いください」の範囲を明確にするため、以下の6条を確認のうえご利用ください。
        </p>
        <p className="mt-1 text-xs text-slate-400">
          ※ 文言は最終確定前の起案です（労働安全コンサルタント監修のもとで確定します）。
        </p>
      </header>

      <ol className="space-y-4">
        {LICENSE_CLAUSES.map((clause, i) => (
          <li key={clause.title} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-900">
              第{i + 1}条　{clause.title}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-700">{clause.body}</p>
          </li>
        ))}
      </ol>

      {/* 教育実施の位置づけ（線引き） */}
      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-bold text-amber-900">教材と教育実施の線引き</h2>
        <p className="mt-1.5 text-xs leading-6 text-amber-900">
          <strong>特別教育：</strong>
          {POSITIONING_SPECIAL}
        </p>
        <p className="mt-2 text-xs leading-6 text-amber-900">
          <strong>労働衛生教育（熱中症等）：</strong>
          {POSITIONING_CIRCULAR}
        </p>
        <p className="mt-2 text-xs leading-6 text-amber-900">
          <strong>技能講習：</strong>
          {POSITIONING_SKILL_PREP}
        </p>
      </section>

      {/* 実施チェックリスト */}
      <section className="mt-6">
        <h2 className="text-sm font-bold text-slate-900">特別教育 実施チェックリスト</h2>
        <p className="mt-1 text-xs text-slate-600">本教材で学科を実施する事業者の確認事項です（修了証は同梱しません）。</p>
        <ul className="mt-2 space-y-2">
          {IMPLEMENTATION_CHECKLIST.map((t) => (
            <li key={t} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700">
              <span aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-2 border-emerald-600" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs text-slate-500">{CREDIT_LINE}</p>
      <p className="mt-1 text-xs text-slate-400">
        <Link href="/education/pack" className="underline">無償教材パック一覧へ戻る</Link>
      </p>
    </>
  );
}

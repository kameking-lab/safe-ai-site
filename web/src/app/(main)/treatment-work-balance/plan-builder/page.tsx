import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PlanBuilderClient } from "./plan-builder-client";

const _title =
  "両立支援プランビルダー｜病態・職種別に労務配慮と主治医意見書テンプレを自動生成";
const _desc =
  "疾患・職務・症状の重さ・希望勤務形態を選ぶだけで、両立支援プラン（作業/時間/環境/コミュニケーション配慮）、段階的復職プラン、主治医意見書テンプレートを生成。印刷してそのまま社内回覧・主治医依頼に使えます。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/treatment-work-balance/plan-builder" },
  openGraph: {
    title: _title,
    description: _desc,
    type: "website",
  },
};

export default function PlanBuilderPage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd
        name="両立支援プランビルダー"
        description={_desc}
        path="/treatment-work-balance/plan-builder"
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "治療と仕事の両立支援",
            url: "https://www.anzen-ai-portal.jp/treatment-work-balance",
          },
          {
            name: "両立支援プランビルダー",
            url: "https://www.anzen-ai-portal.jp/treatment-work-balance/plan-builder",
          },
        ]}
      />

      <PageHeader
        title="両立支援プランビルダー"
        description="病態・職務・症状の重さ・希望勤務形態から、配慮事項・復職プラン・主治医意見書テンプレを生成"
        icon={ClipboardList}
        iconColor="emerald"
      />

      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm leading-6 text-emerald-900">
        <p className="font-semibold">本ツールの位置付け</p>
        <p className="mt-1">
          生成される内容は労務管理上のたたき台です。医学的判断・就業可否の最終決定は主治医および産業医にご相談ください。
          本人の同意を取った上で職場内で共有してください。
        </p>
      </section>

      <div className="mt-6">
        <PlanBuilderClient />
      </div>

      <section className="mt-10 text-xs leading-6 text-slate-500">
        <p>
          ※ 本ツールは厚生労働省「事業場における治療と仕事の両立支援のためのガイドライン」（令和5年改訂版）の枠組みに沿って労務配慮の一例を提示するものです。
          疾患特性・個別事情によって妥当な対応は変わります。
          詳細な制度設計は産業保健総合支援センター（さんぽセンター）等にご相談ください。
        </p>
        <p className="mt-2">
          <Link href="/treatment-work-balance" className="underline">
            ← 両立支援ハブに戻る
          </Link>
        </p>
      </section>
    </PageContainer>
  );
}

import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RiskPredictionPanel } from "@/components/risk-prediction-panel";
import { RelatedPageCards } from "@/components/related-page-cards";
import { EnterpriseFunnel } from "@/components/EnterpriseFunnel";
import { ogImageUrl } from "@/lib/og-url";

const _title = "AI 労働災害リスク予測｜KY活動支援";
const _desc =
  "作業内容を入力すると類似事故を検索し、AIが潜在リスクを予測。建設・製造・林業の朝礼KY活動・危険予知活動を支援。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function RiskPredictionPage() {
  return (
    <>
      <PageHeader
        title="AIリスク予測"
        description="作業内容から事故事例を検索し、AIがリスクを予測"
        icon={Brain}
        iconColor="blue"
        badge="AI"
      />
      <RiskPredictionPanel />

      {/* 予測の仕組みについて */}
      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="mb-3 text-sm font-bold text-slate-800">予測の仕組みについて</h2>
          <dl className="space-y-3 text-xs leading-6 text-slate-700">
            <div>
              <dt className="font-semibold text-slate-900">照合ロジック</dt>
              <dd>
                入力された作業種別・環境・条件をもとに、事故データベース内の類似事例をキーワードマッチング＋スコアリングで抽出します。
                上位マッチ事例の事故種別・原因を集計し、頻度の高いリスクを「高・中・低」で分類して表示します。
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">データソース</dt>
              <dd>
                厚生労働省「職場のあんぜんサイト」等の公開データを基にしたモックデータ（200件以上）を使用しています。
                実際の事故統計に基づいて作成していますが、網羅的ではありません。
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">精度の限界</dt>
              <dd>
                本ツールはあくまで参考情報の提供を目的としています。
                実際の現場での安全管理は、専門家による調査・リスクアセスメントを必ず実施してください。
                本ツールの予測結果のみに依拠した安全管理は推奨しません。
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/ky",
            label: "KY用紙",
            description: "予測されたリスクをKY用紙に記録。危険予知活動表として現場で活用できます。",
            color: "emerald",
            cta: "KY用紙を作成する",
          },
          {
            href: "/accidents",
            label: "事故データベース",
            description: "予測の根拠となった類似事故事例を詳しく確認。再発防止対策の検討に役立てられます。",
            color: "orange",
            cta: "事故事例を確認する",
          },
        ]}
      />
      <EnterpriseFunnel
        service="claude-code"
        headline="貴社のヒヤリハット・事故DBを学習させたAI予測"
        subline="社内の事故・ヒヤリハットデータを取り込み、貴社特化のリスク予測モデルを構築。朝礼・KY活動の精度を一段引き上げます。"
      />
    </>
  );
}

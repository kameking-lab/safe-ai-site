import type { Metadata } from "next";
import { MeetingPaperView } from "@/components/meeting/meeting-paper-view";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { createDefaultMeetingRecordSeed } from "@/lib/meeting/schema";
import { AutomationServicePromo } from "@/components/automation/automation-service-promo";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { TaskPageIntro } from "@/components/task-page-intro";
import { ContextualNextActions } from "@/components/contextual-next-actions";

// 初期日付・行IDをリクエスト単位で一度だけ生成してClient Componentへ渡す。
// 静的HTMLとブラウザーで別々にUUIDを生成するとhydration mismatchになるため動的描画にする。
export const dynamic = "force-dynamic";

const _title = "安全工程打合せ書・安全衛生指示書｜各社の作業と指示を整理";
const _desc =
  "各社の作業・使用機械・必要資格・予想災害・リスク評価・指示事項を1枚に整理する作成補助。点検項目8カテゴリ・使用機械集計・印刷に対応。特定機関の公式様式との互換は独立検証していません。無料・登録不要。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/safety-diary" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [ogImageUrl(_title, _desc)] },
};

export default function SafetyDiaryPage() {
  const initialSeed = createDefaultMeetingRecordSeed();
  return (
    <>
      <PageJsonLd
        name="安全工程打合せ書・安全衛生指示書"
        description="各社マトリクス・点検項目8カテゴリ・使用機械集計・印刷に対応する独自の作成補助です。公式様式との互換は独立検証していません。"
        path="/safety-diary"
      />
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <TaskPageIntro
          eyebrow="KY・帳票"
          title="安全工程打合せ書を作る"
          summary="工程、会社・人員、重機、同時作業、対策を整理し、人が承認します。"
          status="独自様式・人の承認が必要"
          primaryAction={{ href: "#meeting-paper-start", label: "工程を入力する" }}
          secondaryActions={[
            { href: "/safety-diary/list", label: "保存一覧を見る" },
            { href: "/ky/paper", label: "KYを作る" },
          ]}
          things={["各社の工程を入力", "変更点と対策を確認", "承認して印刷"]}
          jumps={[
            { href: "#meeting-paper-start", label: "工程書作成" },
            { href: "#meeting-approval", label: "承認" },
            { href: "#meeting-next-actions", label: "次の操作" },
          ]}
          importantNote="特定機関の公式様式との互換は独立検証していません。候補・既定値・空欄を確認済みと扱わず、現場責任者が最終確認してください。"
          compactOnMobile
          visual="paper"
        />
      </div>
      <div id="meeting-paper-start" className="scroll-mt-28">
        <MeetingPaperView initialSeed={initialSeed} />
      </div>
      <div
        id="meeting-next-actions"
        className="mx-auto mt-6 max-w-7xl scroll-mt-28 px-4 sm:px-6 lg:px-8"
      >
        <ContextualNextActions
          actions={[
            { href: "#meeting-approval", label: "内容を確認・承認する" },
            { href: "/ky/paper", label: "KYを作る" },
            { href: "/accidents", label: "関連事故を見る" },
            {
              href: "/education-certification/finder",
              label: "必要資格を確認する",
            },
          ]}
        />
      </div>
      <AutomationServicePromo
        position="safety_diary"
        availability={getAutomationConsultAvailability()}
        title="工程書・帳票の集計や通知も自動化できます"
        cta="安全衛生業務の自動化を相談する"
      />
    </>
  );
}

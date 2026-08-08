import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { TaskPageIntro } from "@/components/task-page-intro";
import { ContextualNextActions } from "@/components/contextual-next-actions";
import { HEAT_ILLNESS_FIELD_BRIEFING } from "@/data/heat-illness-learning/slides";
import { HeatIllnessSlides } from "./heat-illness-slides";
import { AutomationServicePromo } from "@/components/automation/automation-service-promo";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";

const PAGE_PATH = "/heat-illness-prevention/slides";
const TITLE = "熱中症を防ぐ現場ブリーフィング";
const DESCRIPTION =
  "熱中症の基礎からWBGT、KY、119番通報・AEDまでを14枚に整理し、2026年現行指針と安衛則第612条の2へ戻れるHTMLスライドです。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  // 公式URLは確認済みだが、法務・編集レビューが未完了のため検索公開は保留する。
  robots: { index: false, follow: true },
};

export default function HeatIllnessSlidesPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name={TITLE}
        description={DESCRIPTION}
        path={PAGE_PATH}
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "職場の熱中症対策",
            url: "https://www.anzen-ai-portal.jp/heat-illness-prevention",
          },
          {
            name: TITLE,
            url: `https://www.anzen-ai-portal.jp${PAGE_PATH}`,
          },
        ]}
      />

      <TaskPageIntro
        eyebrow="5〜10分・朝礼向け"
        title="熱中症を防ぐ現場ブリーフィング"
        summary="14枚を順に表示し、WBGT、予防、KY、緊急対応を朝礼で共有します。"
        status="未監修・外部確認待ち"
        primaryAction={{ href: "#heat-slides-start", label: "スライドを開始する" }}
        secondaryActions={[
          { href: "/heat-illness-prevention/elearning", label: "5分で確認する" },
          { href: "/heat-illness-prevention", label: "熱中症対策へ戻る" },
        ]}
        things={["朝礼で表示", "公式出典を確認", "理解度確認へ進む"]}
        jumps={[
          { href: "#heat-slides-start", label: "スライド" },
          { href: "#slides-details", label: "適用範囲・配布条件" },
        ]}
        importantNote={`${HEAT_ILLNESS_FIELD_BRIEFING.boundary} AI支援で作成した未監修教材で、法令・編集・医学の外部確認待ちです。公式資料や正式な教育記録を代替しません。`}
        visual="heat"
      />

      <div id="heat-slides-start" className="mt-6 scroll-mt-28">
        <HeatIllnessSlides />
      </div>

      <details
        id="slides-details"
        className="mt-6 scroll-mt-28 rounded-2xl border border-sky-700 bg-sky-50 p-4 text-sky-950 dark:border-sky-300 dark:bg-sky-950/40 dark:text-sky-50"
      >
        <summary className="min-h-11 cursor-pointer py-2 font-black">
          適用範囲・基準日・複製条件
        </summary>
        <div className="space-y-3 pt-2 text-sm leading-6">
          <p>
            回答基準日: <time dateTime={HEAT_ILLNESS_FIELD_BRIEFING.asOf}>2026年7月24日</time> ／
            対象: {HEAT_ILLNESS_FIELD_BRIEFING.audience}
          </p>
          <p>
            サイト独自の文章・構成は、出典として「安全AIポータル」とURLを表示し、改変箇所を明示すれば社内教育や朝礼用に複製・配布できます。
            公式資料や第三者コンテンツは各利用条件に従ってください。
          </p>
        </div>
      </details>

      <div className="mt-8 print:hidden">
        <ContextualNextActions
          actions={[
            {
              href: "/heat-illness-prevention/elearning",
              label: "eラーニングを始める",
            },
            {
              href: "/ky/paper?topic=heat-illness",
              label: "熱中症KYを作る",
            },
            { href: "/signage", label: "サイネージに表示する" },
            {
              href: "/heat-illness-prevention",
              label: "熱中症対策へ戻る",
            },
          ]}
        />
      </div>
      <div className="print:hidden">
        <AutomationServicePromo
          position="heat_slides"
          availability={getAutomationConsultAvailability()}
          title="この教材を現場向け講習資料へ整える相談ができます"
          description="対象者、時間、現場条件に合わせたスライド、講師台本、配布資料、確認クイズを必要な範囲だけ相談できます。"
          cta="熱中症講習・資料作成を相談する"
          href="/services/automation?consultationType=training-materials#consult-form"
        />
      </div>
    </PageContainer>
  );
}

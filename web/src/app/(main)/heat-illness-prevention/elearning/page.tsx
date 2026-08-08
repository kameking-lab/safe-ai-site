import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { TaskPageIntro } from "@/components/task-page-intro";
import { ContextualNextActions } from "@/components/contextual-next-actions";
import {
  HEAT_LEARNING_AS_OF,
  HEAT_LEARNING_SOURCE_IDS,
  getHeatLearningSource,
} from "@/data/heat-illness-learning/sources";
import { HeatIllnessElearning } from "./heat-illness-elearning";
import { AutomationServicePromo } from "@/components/automation/automation-service-promo";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";

const PAGE_PATH = "/heat-illness-prevention/elearning";
const TITLE = "熱中症対策・出典付き理解度確認";
const DESCRIPTION =
  "安衛則第612条の2、2026年現行指針、WBGTの実測・実況推定・予測、熱中症が疑われる人の救急分岐を、公式出典付き7問で確認します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  // 公式URLは確認済みだが、法務・編集レビューが未完了のため検索公開は保留する。
  robots: { index: false, follow: true },
};

const officialLearning = getHeatLearningSource(
  HEAT_LEARNING_SOURCE_IDS.officialLearning,
);
const currentGuideline = getHeatLearningSource(
  HEAT_LEARNING_SOURCE_IDS.currentGuideline,
);

export default function HeatIllnessElearningPage() {
  return (
    <PageContainer width="prose">
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
        eyebrow="7問・保存なし・外部送信なし"
        title="熱中症対策・出典付き理解度確認"
        summary="7問を選び、回答ごとに公式一次資料と照合します。"
        status="未監修・外部確認待ち"
        primaryAction={{ href: "#knowledge-check", label: "理解度確認を始める" }}
        secondaryActions={[
          {
            href: "/heat-illness-prevention/slides",
            label: "スライドを先に見る",
          },
          {
            href: "/heat-illness-prevention",
            label: "熱中症対策へ戻る",
          },
        ]}
        things={["7問を選択", "公式根拠を確認", "苦手項目を見直す"]}
        jumps={[
          { href: "#knowledge-check", label: "7問" },
          { href: "#official-learning-title", label: "公式教材" },
        ]}
        importantNote="回答は保存・送信しません。法定教育、資格判定、医学的診断、実地訓練を代替しません。未監修・外部確認待ちのため、公的資料と責任者の判断を優先してください。"
        visual="heat"
      />

      <nav
        aria-label="理解度確認の前に読む資料"
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <Link
          href="/heat-illness-prevention/slides"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-slate-700 bg-white px-4 py-3 font-black text-slate-950 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 motion-reduce:transition-none dark:border-slate-300 dark:bg-slate-950 dark:text-white forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          HTMLスライドを先に読む
        </Link>
        {currentGuideline ? (
          <a
            href={currentGuideline.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-sky-800 bg-sky-50 px-4 py-3 font-black text-sky-950 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 motion-reduce:transition-none dark:border-sky-300 dark:bg-sky-950/40 dark:text-sky-50 forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]"
          >
            2026年現行指針を開く
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : null}
      </nav>

      <section
        id="knowledge-check"
        aria-labelledby="knowledge-check-title"
        className="mt-8 scroll-mt-28 [contain-intrinsic-size:auto_1400px] [content-visibility:auto]"
      >
        <h2
          id="knowledge-check-title"
          className="text-2xl font-black text-slate-950 dark:text-white"
        >
          公式根拠を確認する7問
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
          すべて一つ選択です。未回答は「分からない」のままにせず、回答確認後に該当する公式資料へ戻れます。
        </p>
        <div className="mt-5">
          <HeatIllnessElearning />
        </div>
      </section>

      {officialLearning ? (
        <section
          aria-labelledby="official-learning-title"
          className="mt-8 rounded-2xl border border-slate-300 bg-slate-50 p-5 [contain-intrinsic-size:auto_360px] [content-visibility:auto] dark:border-slate-600 dark:bg-slate-900 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
        >
          <h2
            id="official-learning-title"
            className="text-xl font-black text-slate-950 dark:text-white"
          >
            厚生労働省の公式学習資料
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            厚生労働省の動画・クイズも利用できます。同ページは令和2年時点の情報を基にした動画を含み、
            JIS Z 8504改正に関する注意書きがあります。2026年現行指針と併せて確認してください。
          </p>
          <a
            href={officialLearning.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-black text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400 dark:bg-white dark:text-slate-950 forced-colors:border-2 forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]"
          >
            厚生労働省の公式e-learningを開く
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </section>
      ) : null}
      <section
        aria-labelledby="elearning-evidence-title"
        className="mt-6 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="elearning-evidence-title" className="font-black">
          根拠・適用範囲・回答の扱い
        </h2>
        <div className="space-y-2 pt-2 leading-6">
          <p>
            AI支援で作成した未監修教材です。外部法務レビュー待ちのため、公式資料と事業場手順を正本とします。
          </p>
          <p>
            回答基準日: <time dateTime={HEAT_LEARNING_AS_OF}>2026年7月24日</time>。
            選択内容は保存・送信せず、正答率や能力評価に変換しません。
          </p>
          <p>
            結果は自己確認用で、正式な教育記録や受講証明にはなりません。必要な事業場では管理者確認と所定の手続きを行ってください。
          </p>
        </div>
      </section>
      <div className="mt-6">
        <ContextualNextActions
          actions={[
            {
              href: "/ky/paper?topic=heat-illness",
              label: "熱中症KYを作る",
            },
            {
              href: "/heat-illness-prevention/slides",
              label: "教育スライドを見る",
            },
            { href: "/signage", label: "サイネージに表示する" },
            {
              href: "/heat-illness-prevention",
              label: "今日のリスクへ戻る",
            },
          ]}
        />
      </div>
      <AutomationServicePromo
        position="heat_elearning"
        availability={getAutomationConsultAvailability()}
        title="熱中症教育の実施方法を相談できます"
        description="短時間講習、社内eラーニング原稿、理解度確認、教育資料の作成を、正式な教育記録とは分けて設計します。"
        cta="現場向け熱中症教育を相談する"
        href="/services/automation?consultationType=heat-illness-training#consult-form"
      />
    </PageContainer>
  );
}

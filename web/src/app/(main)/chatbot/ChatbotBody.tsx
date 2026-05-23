"use client";

import { Suspense, useEffect } from "react";
import { ChatbotPanel } from "@/components/chatbot-panel";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { useTranslation } from "@/contexts/language-context";
import { PageContainer } from "@/components/layout";
import { CopilotStepNav } from "@/components/copilot/CopilotStepNav";
import { CopilotMemo } from "@/components/copilot/CopilotMemo";
import { CopilotNextSteps } from "@/components/copilot/CopilotNextSteps";
import { useOptionalCopilot } from "@/components/copilot/CopilotProvider";

const CORE_LAWS = [
  { ja: "安衛法", en: "OSH Act (安衛法)" },
  { ja: "安衛則", en: "OSH Rules (安衛則)" },
  { ja: "足場則", en: "Scaffolding Rules (足場則)" },
  { ja: "クレーン則", en: "Crane Rules (クレーン則)" },
];

const SPECIALTY_LAWS = [
  { ja: "有機則", en: "Organic Solvent Rules (有機則)" },
  { ja: "特化則", en: "Specific Chemical Rules (特化則)" },
  { ja: "酸欠則", en: "Oxygen Deficiency Rules (酸欠則)" },
  { ja: "石綿則", en: "Asbestos Rules (石綿則)" },
  { ja: "じん肺法", en: "Pneumoconiosis Act (じん肺法)" },
  { ja: "粉じん則", en: "Dust Rules (粉じん則)" },
  { ja: "電離則", en: "Ionizing Radiation Rules (電離則)" },
  { ja: "ボイラー則", en: "Boiler Rules (ボイラー則)" },
  { ja: "ゴンドラ則", en: "Gondola Rules (ゴンドラ則)" },
  { ja: "高圧則", en: "High-Pressure Rules (高圧則)" },
  { ja: "作業環境測定法", en: "Work Env. Measurement Act (作業環境測定法)" },
  { ja: "労基法", en: "Labour Standards Act (労基法)" },
  { ja: "労災保険法", en: "Workers' Accident Compensation Act (労災保険法)" },
  { ja: "育児介護休業法", en: "Childcare/Care Leave Act (育児介護休業法)" },
  { ja: "雇用均等法", en: "Equal Employment Act (雇用均等法)" },
];

const USAGE_GUIDE = {
  ja: [
    "回答は登録済み法令条文に基づくRAG方式で生成されます",
    "法改正により条文内容が変わる場合があります。最新情報はe-Govで確認ください",
    "本ツールの回答は法的アドバイスではありません。具体的な判断は専門家にご相談ください",
    "現在対応中の法令：労働安全衛生法・安衛則・クレーン則・有機則・特化則・酸欠則・石綿則・じん肺法・粉じん則・電離則・ボイラー則・ゴンドラ則・足場則・高圧則・作業環境測定法・労基法・労災保険法・育児介護休業法・雇用均等法 ほか（全33法令以上）",
    "労働安全衛生コンサルタント（登録番号260022）監修",
  ],
  en: [
    "Answers are generated via RAG using registered occupational safety law articles",
    "Law content may change due to amendments — always confirm the latest on e-Gov",
    "Responses from this tool are not legal advice. For specific decisions, consult a qualified expert",
    "Covered laws: OSH Act, OSH Rules, Crane Rules, Organic Solvent Rules, Specific Chemical Rules, Oxygen Deficiency Rules, Asbestos Rules, Pneumoconiosis Act, Dust Rules, Ionizing Radiation Rules, Boiler Rules, Gondola Rules, Scaffolding Rules, High-Pressure Rules, Work Environment Measurement Act, Labour Standards Act, Workers' Accident Compensation Act, Childcare/Care Leave Act, Equal Employment Act + 14 more (33+ total)",
    "Supervised by an Occupational Safety & Health Consultant (registration no. 260022)",
  ],
};

export function ChatbotBody() {
  const { t, language } = useTranslation();
  const isEn = language === "en";
  const guide = isEn ? USAGE_GUIDE.en : USAGE_GUIDE.ja;
  const copilot = useOptionalCopilot();

  // Record entry to the chatbot step in the cross-feature SafetyContext so
  // the step indicator on /accidents-reports and /strategy/plan-generator
  // can light up the "1. 質問する" node.
  useEffect(() => {
    copilot?.recordVisit("chatbot");
  }, [copilot]);

  return (
    <PageContainer width="wide">
      <TranslatedPageHeader
        titleJa="安衛法AIチャットボット"
        titleEn="Occupational Safety Law AI Chat"
        descriptionJa="労働安全衛生法・関連規則に基づいてAIが回答"
        descriptionEn="AI answers your questions based on occupational safety and health laws"
        iconName="Scale"
        iconColor="blue"
      />

      {!isEn && (
        <div className="mt-4 space-y-3">
          <CopilotStepNav current="chatbot" />
          <CopilotMemo />
        </div>
      )}

      {/* Law badges */}
      <div className="mt-4 mb-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-700">
            {t("chatbot.core_laws_label")}
          </span>
          {CORE_LAWS.map((law) => (
            <span
              key={law.ja}
              className="rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-xs font-bold text-blue-800"
            >
              {isEn ? law.en : law.ja}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {t("chatbot.specialty_laws_label")}
          </span>
          {SPECIALTY_LAWS.map((law) => (
            <span
              key={law.ja}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-medium text-slate-600"
            >
              {isEn ? law.en : law.ja}
            </span>
          ))}
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-medium text-slate-500">
            {isEn ? "and 14 more" : "ほか全33法令以上"}
          </span>
        </div>
      </div>
      <p className="mb-6 text-[11px] leading-5 text-slate-500">
        {isEn
          ? "The above is a partial list. 33+ laws in total are used for RAG search, including the Labour Standards Act, Occupational Safety and Health Act, and MHLW mental health guidelines."
          : "※ 上記は対応法令の一部です。労働基準法・職業安定法・職業能力開発促進法・メンタルヘルス指針など、全33法令以上の条文をRAG検索に使用しています。"}
      </p>

      {/* Chat panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <Suspense
          fallback={
            <div
              role="status"
              aria-live="polite"
              aria-busy="true"
              className="space-y-3"
            >
              <span className="sr-only">{isEn ? "Loading" : "読み込み中"}</span>
              <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          }
        >
          <ChatbotPanel />
        </Suspense>
      </div>

      {/* Usage guide */}
      <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800 mb-2">
          {isEn ? "Before you use this tool" : "ご利用にあたって"}
        </p>
        <ul className="text-xs text-amber-700 space-y-1 leading-5">
          {guide.map((item) => (
            <li key={item}>・ {item}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-amber-800">
          <a href="/about/chatbot-eval" className="font-semibold underline hover:text-amber-900">
            {isEn
              ? "→ See the 100-question Recall@5 benchmark"
              : "→ 100問ベンチマーク（Recall@5 検索ヒット率）を見る"}
          </a>
        </p>
      </div>

      {!isEn && (
        <CopilotNextSteps
          current="chatbot"
          intro="回答内容を踏まえて、業種別の事故傾向確認や年次計画作成に進めます。質問で言及された業種・関心事項は自動で引き継がれます。"
        />
      )}

      <RelatedPageCards
        heading={isEn ? "Main 3 features" : "メイン3機能の他のページ"}
        pages={[
          {
            href: "/accidents-reports",
            label: isEn
              ? "Industry-specific accident analysis reports"
              : "業種別 労働災害分析レポート",
            description: isEn
              ? "5 industries (construction / manufacturing / transport / healthcare / services) × 5,000+ MHLW cases auto-analyzed by accident type, cause, industry pattern, and recommended measures."
              : "建設・製造・運輸・医療福祉・サービスの5業種5,000件超の労働災害を事故型・原因・業種特有パターン・推奨対策で自動分析。",
            color: "rose",
            cta: isEn ? "Open the reports" : "業種別レポートを見る",
          },
          {
            href: "/strategy/plan-generator",
            label: isEn
              ? "Annual safety & health plan generator"
              : "年次安全衛生計画 業種別ジェネレーター",
            description: isEn
              ? "13 industries × 3 scales × 39 templates (construction-first). Generates basic policy, focus goals, monthly schedule and law references — PDF output."
              : "建設業を筆頭に13業種×3規模・39テンプレートから基本方針・重点目標・月別スケジュール・関連法令付きの年次安全衛生計画書を自動生成・PDF出力可。",
            color: "purple",
            cta: isEn ? "Generate a plan" : "計画書を作る",
          },
        ]}
      />

      <RelatedPageCards
        heading={isEn ? "Use alongside" : "合わせて使う"}
        pages={[
          {
            href: "/guides/anzeneho-ai-chatbot",
            label: isEn
              ? "Guide: How the OSH Law AI Chatbot works"
              : "ガイド：安衛法AIチャットボットとは",
            description: isEn
              ? "Intent guide explaining 33+ supported laws, Recall@5 evaluation, common queries, and how the chatbot differs from generic ChatGPT."
              : "対応33法令・Recall@5評価・代表的な質問例・汎用ChatGPTとの違いを解説した検索意図ガイド。",
            color: "amber",
            cta: isEn ? "Read the guide" : "ガイドを読む",
          },
          {
            href: "/law-search",
            label: isEn ? "Law Search" : "法令検索",
            description: isEn
              ? "Look up the full text of articles mentioned in chat. Search OSH Act and OSH Rules by keyword."
              : "チャットで出てきた条文を原文で確認。安衛法・安衛則をキーワード検索できます。",
            color: "sky",
            cta: isEn ? "Search laws" : "法令を検索する",
          },
          {
            href: "/e-learning",
            label: isEn ? "E-learning" : "Eラーニング",
            description: isEn
              ? "Reinforce legal knowledge with quizzes. 20+ topics and 100+ questions for systematic learning."
              : "法令知識をクイズ形式で定着。20テーマ・100問以上で体系的に学べます。",
            color: "emerald",
            cta: isEn ? "Start e-learning" : "Eラーニングで学ぶ",
          },
        ]}
      />
    </PageContainer>
  );
}

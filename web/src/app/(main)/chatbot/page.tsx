import { Suspense } from "react";
import type { Metadata } from "next";
import { ChatbotPanel } from "@/components/chatbot-panel";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { RelatedPageCards } from "@/components/related-page-cards";
import { ogImageUrl } from "@/lib/og-url";

const _title = "安衛法 AI チャットボット｜法令質問";
const _desc =
  "労働安全衛生法・安衛則・石綿則・じん肺法・粉じん則・有機則・特化則・酸欠則・ボイラー則など全33法令以上の条文をAIが即答。現場の法令の疑問をその場で解決。";

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

export default function ChatbotPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <TranslatedPageHeader
        titleJa="安衛法AIチャットボット"
        titleEn="Occupational Safety Law AI Chat"
        descriptionJa="労働安全衛生法・関連規則に基づいてAIが回答"
        descriptionEn="AI answers your questions based on occupational safety and health laws"
        iconName="Scale"
        iconColor="blue"
      />

      {/* 対応法令バッジ（コア4法令＋関連規則で視覚的に重みづけ） */}
      <div className="mt-4 mb-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-700">
            コア法令（一般作業者向け）
          </span>
          {["安衛法", "安衛則", "足場則", "クレーン則"].map((law) => (
            <span
              key={law}
              className="rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-xs font-bold text-blue-800"
            >
              {law}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            特定業種・有害業務向け
          </span>
          {[
            "有機則",
            "特化則",
            "酸欠則",
            "石綿則",
            "じん肺法",
            "粉じん則",
            "電離則",
            "ボイラー則",
            "ゴンドラ則",
            "高圧則",
            "作業環境測定法",
            "労基法",
            "労災保険法",
            "育児介護休業法",
            "雇用均等法",
          ].map((law) => (
            <span
              key={law}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-medium text-slate-600"
            >
              {law}
            </span>
          ))}
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-medium text-slate-500">
            ほか全33法令以上
          </span>
        </div>
      </div>
      <p className="mb-6 text-[11px] leading-5 text-slate-500">
        ※ 上記は対応法令の一部です。労働基準法・職業安定法・職業能力開発促進法・メンタルヘルス指針など、全33法令以上の条文をRAG検索に使用しています。
      </p>

      {/* チャット本体 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <Suspense fallback={<div className="text-sm text-slate-400">読み込み中…</div>}>
          <ChatbotPanel />
        </Suspense>
      </div>

      {/* 使い方ガイド */}
      <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800 mb-2">ご利用にあたって</p>
        <ul className="text-xs text-amber-700 space-y-1 leading-5">
          <li>・ 回答は登録済み法令条文に基づくRAG方式で生成されます</li>
          <li>・ 法改正により条文内容が変わる場合があります。最新情報はe-Govで確認ください</li>
          <li>・ 本ツールの回答は法的アドバイスではありません。具体的な判断は専門家にご相談ください</li>
          <li>・ 現在対応中の法令：労働安全衛生法・安衛則・クレーン則・有機則・特化則・酸欠則・石綿則・じん肺法・粉じん則・電離則・ボイラー則・ゴンドラ則・足場則・高圧則・作業環境測定法・労基法・労災保険法・育児介護休業法・雇用均等法 ほか（全33法令以上）</li>
          <li>・ 監修：労働安全コンサルタント（登録番号260022・土木区分）</li>
        </ul>
      </div>
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/law-search",
            label: "法令検索",
            description: "チャットで出てきた条文を原文で確認。安衛法・安衛則をキーワード検索できます。",
            color: "sky",
            cta: "法令を検索する",
          },
          {
            href: "/e-learning",
            label: "Eラーニング",
            description: "法令知識をクイズ形式で定着。20テーマ・100問以上で体系的に学べます。",
            color: "emerald",
            cta: "Eラーニングで学ぶ",
          },
        ]}
      />
    </main>
  );
}

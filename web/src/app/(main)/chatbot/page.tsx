import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { ChatbotPanel } from "@/components/chatbot-panel";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "安衛法AIチャットボット",
  description: "労働安全衛生法・安全規則の条文をAIが検索・回答。安衛法・安衛則・クレーン則・有機則・特化則・酸欠則に対応。",
  openGraph: {
    title: "安衛法AIチャットボット｜ANZEN AI",
    description: "労働安全衛生法・安全規則の条文をAIが検索・回答。安衛法・安衛則・クレーン則・有機則・特化則・酸欠則に対応。",
  },
};

export default function ChatbotPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <PageHeader
        title="安衛法AIチャットボット"
        description="労働安全衛生法・関連規則に基づいてAIが回答"
        icon={Scale}
        iconColor="blue"
      />

      {/* 対応法令バッジ */}
      <div className="mt-4 mb-6 flex flex-wrap gap-2">
        {["安衛法", "安衛則", "クレーン則", "有機則", "特化則", "酸欠則"].map((law) => (
          <span
            key={law}
            className="rounded-full border border-blue-100 bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700"
          >
            {law}
          </span>
        ))}
      </div>

      {/* チャット本体 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <ChatbotPanel />
      </div>

      {/* 使い方ガイド */}
      <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800 mb-2">ご利用にあたって</p>
        <ul className="text-xs text-amber-700 space-y-1 leading-5">
          <li>・ 回答は登録済み法令条文に基づくRAG方式で生成されます</li>
          <li>・ 法改正により条文内容が変わる場合があります。最新情報はe-Govで確認ください</li>
          <li>・ 本ツールの回答は法的アドバイスではありません。具体的な判断は専門家にご相談ください</li>
          <li>・ 現在対応中の法令：労働安全衛生法、労働安全衛生規則、クレーン等安全規則、有機溶剤中毒予防規則、特定化学物質障害予防規則、酸素欠乏症等防止規則</li>
        </ul>
      </div>
    </main>
  );
}

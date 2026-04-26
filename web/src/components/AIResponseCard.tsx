"use client";

import { BINDING_BADGE, type SourceBindingLevel } from "@/lib/gemini";

/** 出典の拘束力バッジ */
export function BindingBadge({ level }: { level: SourceBindingLevel }) {
  const { label, color } = BINDING_BADGE[level];
  return (
    <span
      className={`inline-block text-xs font-semibold px-1.5 py-0.5 rounded border ${color}`}
    >
      {label}
    </span>
  );
}

type AIResponseCardProps = {
  children: React.ReactNode;
  /** true のときに免責バナーを表示（デフォルト true） */
  showDisclaimer?: boolean;
  /** "medium" 以上の信頼度のとき拘束力バッジを強調表示 */
  confidence?: "high" | "medium" | "low";
  className?: string;
};

/**
 * AI回答を包むカード。免責バナーを統一レイアウトで表示する。
 * 佐藤指摘「AIが断定的に法解釈を述べる」への対応コンポーネント。
 */
export function AIResponseCard({
  children,
  showDisclaimer = true,
  className = "",
}: AIResponseCardProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {showDisclaimer && (
        <div className="flex items-start gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
          <span className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true">
            ⚠️
          </span>
          <p className="text-xs text-amber-800 leading-snug">
            本回答はAIによる情報提供であり、<strong>法的助言・法令解釈の確定ではありません</strong>。
            具体的な法的判断・実務対応は、労働安全コンサルタント・弁護士等の専門家にご相談ください。
          </p>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

/** 拘束力バッジ一覧（法令・告示・通達・指針の説明付き凡例） */
export function BindingLevelLegend() {
  const levels: SourceBindingLevel[] = ["law", "binding", "indirect", "reference"];
  const descriptions: Record<SourceBindingLevel, string> = {
    law: "法律・政令・省令（違反すると罰則あり）",
    binding: "告示（拘束力あり、法令と同等の効果）",
    indirect: "通達（行政解釈・行政指導。間接的拘束）",
    reference: "指針・ガイドライン（参考。法的拘束力なし）",
  };
  return (
    <div className="text-xs text-gray-600 space-y-1">
      <p className="font-semibold text-gray-700 mb-1">出典の拘束力レベル</p>
      {levels.map((lvl) => (
        <div key={lvl} className="flex items-center gap-2">
          <BindingBadge level={lvl} />
          <span>{descriptions[lvl]}</span>
        </div>
      ))}
    </div>
  );
}

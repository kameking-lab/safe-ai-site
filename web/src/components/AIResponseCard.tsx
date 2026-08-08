"use client";

import { AlertTriangle } from "lucide-react";
import { BINDING_BADGE, type SourceBindingLevel } from "@/lib/gemini";

/** 文書種別バッジ。法的効力を自動判定するものではない。 */
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
  /** 回答生成側の信頼区分（法的効力とは別）。 */
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
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
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

/** 文書種別一覧。具体的効力は根拠法令と個別文書で確認する。 */
export function BindingLevelLegend() {
  const levels: SourceBindingLevel[] = ["law", "binding", "indirect", "reference"];
  const descriptions: Record<SourceBindingLevel, string> = {
    law: "法律・政令・省令等。現行条文、対象、罰則条項を個別確認",
    binding: "告示。根拠法令、委任、対象、効力を個別確認",
    indirect: "通達。行政内部の解釈・運用資料で、事業者への義務を自動判定しない",
    reference: "指針・ガイドライン。根拠法令と位置付けを個別確認",
  };
  return (
    <div className="text-xs text-gray-600 space-y-1">
      <p className="font-semibold text-gray-700 mb-1">文書種別と確認事項</p>
      {levels.map((lvl) => (
        <div key={lvl} className="flex items-center gap-2">
          <BindingBadge level={lvl} />
          <span>{descriptions[lvl]}</span>
        </div>
      ))}
    </div>
  );
}

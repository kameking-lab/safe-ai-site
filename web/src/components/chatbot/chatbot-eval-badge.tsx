/**
 * NIQ-TOOL1: /chatbot の公開eval透明性バッジ。
 *
 * 「安衛法特化で精度を公開しているチャットボット」を、誇張なく可視化する。
 * 数字は誇らず、性質（自作評価・第三者検証なし・網を広げれば下がり得る）を必ず併記。
 * 既知の重大欠陥（ratchet台帳）が空でなければ、その件数も正直に表示する。
 */

import {
  CHATBOT_EVAL_TRANSPARENCY,
  evalAccuracyPercent,
  evalMeasuredOnDate,
} from "@/data/chatbot-eval-transparency";

export function ChatbotEvalBadge({ isEn = false }: { isEn?: boolean }) {
  const e = CHATBOT_EVAL_TRANSPARENCY;
  const pct = evalAccuracyPercent(e);
  const date = evalMeasuredOnDate(e);
  const hasDefects = e.knownDefects.length > 0;

  return (
    <section
      aria-labelledby="chatbot-eval-badge-heading"
      className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-emerald-900"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="chatbot-eval-badge-heading" className="text-xs font-bold text-emerald-800">
          {isEn ? "Published accuracy (measured on production)" : "公開している精度（本番実測）"}
        </h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-sm font-bold text-emerald-700">
          {isEn
            ? `${e.correct}/${e.scorableQuestions} correct · ${pct}%`
            : `${e.scorableQuestions}問中${e.correct}問正答・正答率${pct}%`}
        </span>
        <span className="text-[11px] text-emerald-700">
          {isEn
            ? `${e.totalQuestions}-question public eval · out-of-scope ${e.outOfScopeHandled}/${e.outOfScopeTotal} handled · measured ${date}`
            : `公開${e.totalQuestions}問eval・範囲外${e.outOfScopeHandled}/${e.outOfScopeTotal}棄却・${date}実測`}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
        {isEn ? (
          <>
            This is a <strong>self-made evaluation set with no third-party verification</strong>. The score can drop as
            the question set grows (23→51 questions once dipped to 95.7%, then recovered to 100% after a retrieval fix).
            We publish the number and the detection net honestly rather than claiming perfection.
          </>
        ) : (
          <>
            これは<strong>自作の評価セットで、第三者検証はありません</strong>。質問の網を広げれば下がり得ます（23問→51問拡張で一時95.7%へ低下→retrieval是正で100%回復の実績）。
            数字を誇るのではなく、正答率と検出網を正直に公開しています。
          </>
        )}
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        {isEn ? "Known material defects: " : "既知の重大欠陥: "}
        {hasDefects ? (
          <span className="font-semibold text-amber-700">
            {isEn ? `${e.knownDefects.length} on the ratchet ledger` : `${e.knownDefects.length}件（台帳管理中）`}
          </span>
        ) : (
          <span>{isEn ? "none at this time" : "現時点でなし"}</span>
        )}
        {" · "}
        <a href="/about/chatbot-eval" className="font-semibold text-emerald-700 underline hover:text-emerald-900">
          {isEn ? "See the evaluation detail →" : "評価の詳細を見る →"}
        </a>
      </p>
    </section>
  );
}

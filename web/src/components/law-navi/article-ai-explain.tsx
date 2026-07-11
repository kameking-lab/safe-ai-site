"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { SimpleMarkdown } from "@/components/simple-markdown";

/**
 * 法令ナビ条文ページの「AI解説」アイランド（docs/horei-navi-foundation-2026-07-11 §2-6）。
 *
 * - 原文が主役・解説は補助: 原文ブロックの**下**に展開し、モーダルで原文を隠さない。
 * - 生成はオンデマンド（ボタン押下時のみ）＝閲覧だけでは Gemini を呼ばない。
 * - 経路は既存 /api/law-summary（mode:"explain"）を再利用: サーキットブレーカ・
 *   CDNキャッシュ（同一条文→同一解説 4h）・フォールバックは API 側に内蔵済み。
 * - 免責は生成部に1回だけ表示（原文が正・解説は補助）。根拠条文とe-Gov原文URLは
 *   API 側プロンプトで末尾に自動添付される。
 */
export function ArticleAiExplain({
  law,
  articleNum,
  text,
}: {
  law: string;
  articleNum: string;
  text: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [explanation, setExplanation] = useState("");

  async function fetchExplanation() {
    setStatus("loading");
    try {
      // GET（LN-S2）: 同一条文は同一URLに収束し Vercel エッジキャッシュが効く
      // （POST はエッジで no-op）。本文はサーバ側が curated コーパスから解決する。
      const res = await fetch(
        `/api/law-summary?law=${encodeURIComponent(law)}&articleNum=${encodeURIComponent(articleNum)}&mode=explain`
      );
      if (!res.ok) throw new Error("API error");
      const data = (await res.json()) as { summary: string };
      setExplanation(data.summary);
      setStatus("done");
    } catch {
      // API 自体が届かない場合の最終フォールバック（API 内フォールバックと同じ建て付け）
      setExplanation(
        `【解説フォールバック】\n${law} ${articleNum}\n\n${text.slice(0, 160)}…\n\n(通信エラーのためAI解説を生成できませんでした。原文と e-Gov をご確認ください。)`
      );
      setStatus("done");
    }
  }

  return (
    <section aria-label="AI解説" className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      {status === "idle" && (
        <button
          type="button"
          onClick={fetchExplanation}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          AI解説を生成する（原文が読みづらいとき）
        </button>
      )}
      {status === "loading" && (
        <p className="py-3 text-center text-sm text-slate-500">AI解説を生成中...</p>
      )}
      {status === "done" && (
        <>
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-violet-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI解説（補助）
          </p>
          <SimpleMarkdown content={explanation} className="text-sm leading-relaxed text-slate-700" />
          <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
            ※ この解説はAIが生成した補助情報です。正はあくまで上の原文と e-Gov 法令検索の現行条文です。
          </p>
        </>
      )}
    </section>
  );
}

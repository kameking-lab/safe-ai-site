"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { SimpleMarkdown } from "@/components/simple-markdown";

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
  const [excerpt, setExcerpt] = useState("");

  async function fetchExcerpt() {
    setStatus("loading");
    try {
      const response = await fetch(
        `/api/law-summary?law=${encodeURIComponent(law)}&articleNum=${encodeURIComponent(articleNum)}&mode=excerpt`,
      );
      if (!response.ok) throw new Error("API error");
      const data = (await response.json()) as { summary: string };
      setExcerpt(data.summary);
    } catch {
      setExcerpt(
        `【一次資料の抜粋・自動解説ではありません】\n${law} ${articleNum}\n\n${text.slice(0, 1_200)}\n\n通信に失敗しました。正本はe-Gov法令検索の原文で確認してください。`,
      );
    } finally {
      setStatus("done");
    }
  }

  return (
    <section
      aria-label="一次資料の確認補助"
      className="rounded-xl border border-violet-200 bg-violet-50/50 p-4"
    >
      {status === "idle" ? (
        <button
          type="button"
          onClick={() => void fetchExcerpt()}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white hover:bg-violet-800"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          一次資料の抜粋を表示
        </button>
      ) : null}
      {status === "loading" ? (
        <p className="py-3 text-center text-sm text-slate-600" role="status">
          原文を確認中…
        </p>
      ) : null}
      {status === "done" ? (
        <>
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-violet-800">
            <FileText className="h-4 w-4" aria-hidden="true" />
            収載済み一次資料の抜粋
          </p>
          <SimpleMarkdown
            content={excerpt}
            className="text-sm leading-7 text-slate-800"
          />
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
            これはAI解説ではありません。適用条件、関連条文、改正履歴を含む正本はe-Gov法令検索で確認してください。
          </p>
        </>
      ) : null}
    </section>
  );
}

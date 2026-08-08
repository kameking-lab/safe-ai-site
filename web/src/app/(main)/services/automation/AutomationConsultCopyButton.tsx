"use client";

import { useState } from "react";

export function AutomationConsultCopyButton({
  template,
  label = "相談テンプレートをコピー",
}: {
  template: string;
  label?: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(template);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copyTemplate}
        className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
      >
        <span aria-hidden="true">⧉</span>
        {label}
      </button>
      <p
        aria-live="polite"
        className="mt-2 min-h-6 text-sm font-semibold text-slate-700"
      >
        {copyState === "copied"
          ? "テンプレートをコピーしました。"
          : copyState === "failed"
            ? "自動コピーできませんでした。上のテンプレートを選択してコピーしてください。"
            : ""}
      </p>
    </>
  );
}

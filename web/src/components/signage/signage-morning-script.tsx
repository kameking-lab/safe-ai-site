"use client";

import { useState } from "react";
import { Sparkles, Copy, Volume2 } from "lucide-react";

type Props = {
  jmaHeadline?: string | null;
  warnings?: { code: string; status: string }[] | null;
  topAccidentTitle?: string | null;
  topLawTitle?: string | null;
  industryLabel?: string;
};

function speak(text: string) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ja-JP";
  utter.rate = 1.0;
  synth.cancel();
  synth.speak(utter);
}

function buildScript(p: Props): string {
  const parts: string[] = [];
  parts.push(`おはようございます。本日の${p.industryLabel ?? "現場"}の安全朝礼を始めます。`);
  if (p.jmaHeadline) {
    parts.push(`気象状況: ${p.jmaHeadline}`);
  } else if (p.warnings && p.warnings.length > 0) {
    parts.push(`気象状況: ${p.warnings.map((w) => w.status).join("、")}`);
  }
  if (p.topAccidentTitle) {
    parts.push(`類似事故の参考: ${p.topAccidentTitle}`);
  }
  if (p.topLawTitle) {
    parts.push(`30日以内の法改正: ${p.topLawTitle}`);
  }
  parts.push("ヘルメット・墜落制止用器具・指差呼称・声かけを徹底し、本日もご安全に。");
  return parts.join(" ").slice(0, 240);
}

export function SignageMorningScript(props: Props) {
  const [text, setText] = useState<string>(() => buildScript(props));

  const regenerate = () => {
    setText(buildScript(props));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      alert("朝礼スクリプトをコピーしました");
    } catch {}
  };

  return (
    <section className="rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-3 text-emerald-50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1 text-sm font-bold tracking-wide">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          朝礼スクリプト（AI 生成・200字目安）
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={regenerate}
            className="rounded border border-emerald-400 bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-600"
          >
            再生成
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded border border-emerald-400 bg-emerald-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-600"
          >
            <Copy className="h-3 w-3" />
            コピー
          </button>
          <button
            type="button"
            onClick={() => speak(text)}
            className="inline-flex items-center gap-1 rounded border border-emerald-400 bg-white px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
          >
            <Volume2 className="h-3 w-3" />
            読み上げ
          </button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-line rounded-md bg-emerald-900/50 p-2 text-[12px] leading-relaxed">
        {text}
      </p>
      <p className="mt-1 text-[10px] text-emerald-200/80">
        KY＋気象＋類似事故から200字に要約。再生成で表現を変えられます。
      </p>
    </section>
  );
}

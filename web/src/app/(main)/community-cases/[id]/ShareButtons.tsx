"use client";

import { Share2, Send, Link as LinkIcon, Check } from "lucide-react";
import { useState } from "react";

export function ShareButtons({ title, id }: { title: string; id: string }) {
  const [copied, setCopied] = useState(false);

  // SSRとクライアントで同じURLを生成してhydration mismatchを避ける
  const url = `https://safe-ai-site.vercel.app/community-cases/${id}`;

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${title} ｜現場の声｜ANZEN AI`
  )}&url=${encodeURIComponent(url)}`;

  async function handleCopy() {
    try {
      const liveUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/community-cases/${id}`
          : url;
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  }

  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-bold text-slate-700">
        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
        この事例をシェア
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Send className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
          X (Twitter)
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              コピー済み
            </>
          ) : (
            <>
              <LinkIcon className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              URLをコピー
            </>
          )}
        </button>
      </div>
    </div>
  );
}

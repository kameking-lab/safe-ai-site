"use client";

import { useEffect, useState } from "react";
import { Copy, Trash2, ExternalLink } from "lucide-react";
import type { ChatbotSource } from "@/app/api/chatbot/route";

// These must stay in sync with chatbot-panel.tsx share constants
const SHARE_DATA_KEY = "anzen_ai_shares";
const SHARE_TOKENS_KEY = "anzen_ai_share_tokens";

const EGOV_LAW_NUMBERS: Record<string, string> = {
  "労働安全衛生法": "347AC0000000057",
  "労働基準法": "322AC0000000049",
  "じん肺法": "335AC0000000030",
  "労働安全衛生規則": "347M50002000032",
  "クレーン等安全規則": "347M50002000034",
  "有機溶剤中毒予防規則": "347M50002000036",
  "特定化学物質障害予防規則": "347M50002000040",
  "酸素欠乏症等防止規則": "347M50002000042",
};

function egovUrl(lawName: string): string {
  const num = EGOV_LAW_NUMBERS[lawName];
  return num
    ? `https://laws.e-gov.go.jp/law/${num}`
    : `https://laws.e-gov.go.jp/search?keyword=${encodeURIComponent(lawName)}`;
}

type SharedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatbotSource[];
  source_type?: "rag" | "ai_inference";
  confidence?: "high" | "medium" | "low";
};

type ShareData = {
  id: string;
  title: string;
  messages: SharedMessage[];
  createdAt: string;
};

function loadShare(id: string): ShareData | null {
  try {
    const raw = localStorage.getItem(SHARE_DATA_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, ShareData>;
    return all[id] ?? null;
  } catch {
    return null;
  }
}

function hasDeleteToken(id: string): boolean {
  try {
    const raw = localStorage.getItem(SHARE_TOKENS_KEY);
    if (!raw) return false;
    const tokens = JSON.parse(raw) as Record<string, string>;
    return !!tokens[id];
  } catch {
    return false;
  }
}

function removeShare(id: string): void {
  try {
    const shares = JSON.parse(localStorage.getItem(SHARE_DATA_KEY) ?? "{}") as Record<string, ShareData>;
    delete shares[id];
    localStorage.setItem(SHARE_DATA_KEY, JSON.stringify(shares));
    const tokens = JSON.parse(localStorage.getItem(SHARE_TOKENS_KEY) ?? "{}") as Record<string, string>;
    delete tokens[id];
    localStorage.setItem(SHARE_TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // ignore
  }
}

export function ChatbotShareView({ shareId }: { shareId: string }) {
  const [data, setData] = useState<ShareData | null | "loading">("loading");
  const [canDelete, setCanDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const share = loadShare(shareId);
    setData(share);
    setCanDelete(hasDeleteToken(shareId));
  }, [shareId]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  function handleDelete() {
    removeShare(shareId);
    setDeleted(true);
  }

  if (data === "loading") {
    return <p className="text-sm text-slate-400">読み込み中…</p>;
  }

  if (deleted) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm font-semibold text-slate-700">共有URLを削除しました</p>
        <p className="mt-1 text-xs text-slate-500">このURLはもう開けなくなりました。</p>
        <a href="/chatbot" className="mt-4 inline-block text-xs text-blue-600 underline hover:text-blue-800">
          チャットボットに戻る
        </a>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm font-semibold text-slate-700">この共有URLは見つかりませんでした</p>
        <p className="mt-2 text-xs text-slate-500">
          共有URLは同じブラウザ内でのみ有効です。URLを生成したブラウザで開いてください。
        </p>
        <a href="/chatbot" className="mt-4 inline-block text-xs text-blue-600 underline hover:text-blue-800">
          チャットボットを使う
        </a>
      </div>
    );
  }

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent("労働安全法Q&A | ANZEN AI")}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">共有された会話</p>
            <h1 className="mt-1 text-base font-semibold text-slate-800">{data.title}</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              {new Date(data.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void copyUrl()}
              title="URLをコピー"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "コピー済み" : "URLをコピー"}
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title="この共有を削除"
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                削除
              </button>
            )}
          </div>
        </div>

        {/* 免責事項 */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ 免責事項：本内容は法的助言ではありません。実際の判断は必ず専門家（労働安全コンサルタント等）にご確認ください。
          <br />
          監修：労働安全コンサルタント（登録番号260022・土木区分）
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          ※ このページは同じブラウザ内でのみ有効です。
        </p>
      </div>

      {/* 会話内容（読み取り専用） */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="space-y-4">
          {data.messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 ${
                  msg.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-800"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="whitespace-pre-wrap">
                    {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={idx}>{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    })}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {/* 信頼度バッジ */}
              {msg.role === "assistant" && msg.source_type && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {msg.source_type === "rag" ? (
                    <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                      📚 法令データベースから検索
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                      🤖 AI推論
                    </span>
                  )}
                  {msg.confidence === "high" && <span className="text-[11px] text-slate-500">🟢 信頼度：高</span>}
                  {msg.confidence === "medium" && <span className="text-[11px] text-slate-500">🟡 信頼度：中</span>}
                  {msg.confidence === "low" && <span className="text-[11px] text-slate-500">🔴 信頼度：低</span>}
                </div>
              )}

              {/* 参照条文 */}
              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <details className="mt-2 max-w-[88%] rounded-lg border border-slate-200 bg-white p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-700">
                    参照条文 ({msg.sources.length}件)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {msg.sources.map((src, i) => (
                      <div key={i} className="rounded-md bg-slate-50 p-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <p className="font-semibold text-blue-700">
                            {src.law} {src.article}
                          </p>
                          <a
                            href={egovUrl(src.law)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 shrink-0 rounded border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            e-Gov で確認
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                        <p className="mt-1 text-slate-600 leading-5">{src.text}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* アクションフッター */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-800"
          >
            𝕏 でシェア
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent("ANZEN AI 労働安全Q&A")}&body=${encodeURIComponent(shareUrl + "\n\n（同じブラウザでのみ開けます）")}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            メールで送る
          </a>
        </div>
        <a
          href="/chatbot"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
        >
          自分でも質問する
        </a>
      </div>
    </div>
  );
}

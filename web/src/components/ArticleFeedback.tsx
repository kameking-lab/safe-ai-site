"use client";

import { useState } from "react";
import type { FeedbackPayload } from "@/app/api/feedback/route";

type Props = {
  articleSlug: string;
  className?: string;
};

const ERROR_TYPE_OPTIONS: { value: FeedbackPayload["errorType"]; label: string }[] = [
  { value: "law_citation", label: "法令引用誤り" },
  { value: "broken_link", label: "リンク切れ" },
  { value: "factual_error", label: "事実誤認" },
  { value: "other", label: "その他" },
];

type Status = "idle" | "submitting" | "success" | "error";

export function ArticleFeedback({ articleSlug, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [errorType, setErrorType] = useState<FeedbackPayload["errorType"]>("law_citation");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleSlug,
          errorType,
          description: description.trim(),
          email: email.trim() || undefined,
        } satisfies FeedbackPayload),
      });

      if (res.status === 429) {
        setErrorMsg("送信が多すぎます。1分ほどおいてから再度お試しください。");
        setStatus("error");
        return;
      }

      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setErrorMsg("送信に失敗しました。しばらくしてから再度お試しください。");
        setStatus("error");
        return;
      }

      setStatus("success");
      setDescription("");
      setEmail("");
    } catch {
      setErrorMsg("通信エラーが発生しました。");
      setStatus("error");
    }
  }

  function handleClose() {
    setOpen(false);
    setStatus("idle");
    setErrorMsg("");
    setDescription("");
    setEmail("");
  }

  return (
    <div className={`mt-8 border-t border-gray-200 pt-6 ${className}`}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700 transition-colors"
        >
          この記事に誤りがありましたか？
        </button>
      ) : status === "success" ? (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          <p className="font-semibold">ご報告ありがとうございます。</p>
          <p className="mt-1 text-green-700">内容を確認のうえ、修正対応いたします。</p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-3 text-xs text-green-600 underline hover:text-green-800"
          >
            閉じる
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">誤りを報告する</p>
            <button
              type="button"
              onClick={handleClose}
              aria-label="フォームを閉じる"
              className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div>
            <label htmlFor="fb-error-type" className="block text-xs text-gray-600 mb-1">
              エラー種別
            </label>
            <select
              id="fb-error-type"
              value={errorType}
              onChange={(e) => setErrorType(e.target.value as FeedbackPayload["errorType"])}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ERROR_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="fb-description" className="block text-xs text-gray-600 mb-1">
              詳細 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="fb-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="どの部分が誤りかを具体的にご記入ください（例: 第○条の番号が間違っています）"
              rows={3}
              maxLength={1000}
              required
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          <div>
            <label htmlFor="fb-email" className="block text-xs text-gray-600 mb-1">
              メールアドレス（任意・返信を希望する場合）
            </label>
            <input
              id="fb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@example.com"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 rounded bg-red-50 border border-red-200 px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting" || !description.trim()}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {status === "submitting" ? "送信中…" : "送信する"}
          </button>
        </form>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Mail, CheckCircle, ArrowRight } from "lucide-react";

interface Props {
  heading?: string;
  description?: string;
}

export function NewsletterCTA({
  heading = "最新の通達・事故事例を受け取る",
  description = "毎週月曜日に厚労省通達・事故事例・法改正情報をお届け。無料。",
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, industry: "その他" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "登録に失敗しました。");
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "エラーが発生しました。");
      setStatus("error");
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-bold text-emerald-900">{heading}</h2>
          </div>
          <p className="text-xs text-emerald-700 leading-5">{description}</p>
        </div>

        <div className="flex-shrink-0 w-full sm:w-auto">
          {status === "success" ? (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-semibold">登録完了！</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                aria-label="メールアドレス"
                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 sm:w-52"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {status === "loading" ? (
                  "登録中..."
                ) : (
                  <>
                    登録する
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          )}
          {status === "error" && (
            <p className="mt-1 text-xs text-red-600">{errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}

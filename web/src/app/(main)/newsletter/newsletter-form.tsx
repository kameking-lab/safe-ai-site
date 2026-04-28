"use client";

import { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";
import type { Industry } from "@/lib/newsletter";

const INDUSTRIES: Industry[] = ["建設", "製造", "医療福祉", "運輸", "IT", "その他"];

type Status = "idle" | "loading" | "success" | "error";

interface Props {
  compact?: boolean;
}

export function NewsletterForm({ compact = false }: Props) {
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState<Industry>("その他");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, industry }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "登録に失敗しました。");
      }
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "エラーが発生しました。");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle className="mx-auto h-8 w-8 text-emerald-500 mb-2" aria-hidden="true" />
        <p className="font-bold text-emerald-800">登録が完了しました！</p>
        <p className="mt-1 text-sm text-emerald-700">
          {email} に確認メールを送信しました。
          毎週月曜日の朝9時にお届けします。
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メールアドレス"
          aria-label="メールアドレス"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 whitespace-nowrap"
        >
          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
          {status === "loading" ? "登録中..." : "登録する"}
        </button>
        {status === "error" && (
          <p className="w-full text-xs text-red-600 sm:col-span-2">{errorMsg}</p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="nl-email" className="mb-1.5 block text-xs font-semibold text-slate-700">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          id="nl-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@company.jp"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      <div>
        <label htmlFor="nl-industry" className="mb-1.5 block text-xs font-semibold text-slate-700">
          業種
        </label>
        <select
          id="nl-industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as Industry)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none"
        >
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          業種別の情報を優先的にお届けするために使用します
        </p>
      </div>

      {status === "error" && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        <Mail className="h-4 w-4" aria-hidden="true" />
        {status === "loading" ? "登録中..." : "研究プロジェクトの応援者として登録する"}
      </button>

      <p className="text-center text-xs text-slate-400 leading-5">
        週1回（月曜9時）配信。いつでも配信停止できます。無料。
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  UGC_CATEGORY_LABELS,
  UGC_INDUSTRY_OPTIONS,
  type UgcCategory,
  type UgcIndustry,
  type UgcSubmission,
} from "@/lib/ugc-types";
import { clientAddSubmission } from "@/lib/ugc-store";
import { markFeedbackSubmitted } from "@/lib/usage-tracker";

const CATEGORY_OPTIONS: { value: UgcCategory; label: string; hint: string }[] = [
  {
    value: "hiyari",
    label: UGC_CATEGORY_LABELS.hiyari,
    hint: "実際にヒヤッとした出来事・再発防止策",
  },
  {
    value: "question",
    label: UGC_CATEGORY_LABELS.question,
    hint: "他の現場担当者に意見を聞きたいこと",
  },
  {
    value: "tips",
    label: UGC_CATEGORY_LABELS.tips,
    hint: "現場で効いた工夫・小さな改善",
  },
];

export function SubmitForm() {
  const [category, setCategory] = useState<UgcCategory>("hiyari");
  const [industry, setIndustry] = useState<UgcIndustry>("construction");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultSubmissionId, setResultSubmissionId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/community-cases/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, industry, title, body }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        submission?: UgcSubmission;
      };
      if (!res.ok || !data.ok || !data.submission) {
        setErrorMessage(data.message ?? "送信に失敗しました。時間をおいて再度お試しください。");
        setStatus("error");
        return;
      }
      // クライアント側にも保存して一覧で確認できるように
      clientAddSubmission(data.submission);
      // フィードバックゲートを永続的に消す
      markFeedbackSubmitted();

      setResultMessage(data.message ?? "投稿ありがとうございます。");
      setResultSubmissionId(data.submission.id);
      setStatus("success");
    } catch {
      setErrorMessage("通信エラーが発生しました。");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
        <p className="mt-3 text-xl font-bold text-emerald-800">送信完了しました</p>
        <p className="mt-2 text-sm text-emerald-900">{resultMessage}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/community-cases"
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            現場の声 一覧へ
          </Link>
          {resultSubmissionId && (
            <Link
              href={`/community-cases/${resultSubmissionId}`}
              className="rounded-lg border border-emerald-300 bg-white px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              投稿を確認する
            </Link>
          )}
        </div>
      </div>
    );
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/40 sm:text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset>
        <legend className="block text-sm font-semibold text-slate-700">
          投稿カテゴリ <span className="text-red-500">*</span>
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CATEGORY_OPTIONS.map((c) => (
            <label
              key={c.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2 text-sm ${
                category === c.value
                  ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ugc-category"
                  value={c.value}
                  checked={category === c.value}
                  onChange={() => setCategory(c.value)}
                  className="h-4 w-4"
                />
                {c.label}
              </span>
              <span className="text-[11px] text-slate-500">{c.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="ugc-industry" className="block text-sm font-semibold text-slate-700">
          業種 <span className="text-red-500">*</span>
        </label>
        <select
          id="ugc-industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value as UgcIndustry)}
          className={`${inputCls} bg-white`}
        >
          {UGC_INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="ugc-title" className="block text-sm font-semibold text-slate-700">
          タイトル <span className="text-red-500">*</span>
          <span className="ml-1 text-xs text-slate-400">（80文字以内）</span>
        </label>
        <input
          id="ugc-title"
          type="text"
          required
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：高所作業で安全帯の掛け替え時にヒヤッとした"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="ugc-body" className="block text-sm font-semibold text-slate-700">
          本文 <span className="text-red-500">*</span>
          <span className="ml-1 text-xs text-slate-400">
            （15〜2000文字／現在 {body.length} 文字）
          </span>
        </label>
        <textarea
          id="ugc-body"
          required
          minLength={15}
          maxLength={2000}
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="状況・気付き・対策などをご記入ください。個人名・会社名は書かないでください（自動マスキングされます）。"
          className={inputCls}
        />
        <p className="mt-1 text-[11px] text-slate-500">
          ※ メールアドレス・電話番号・氏名（さん付き）は自動でマスキングされます。
        </p>
      </div>

      {errorMessage && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {status === "sending" ? "送信中..." : "投稿する（自動審査 → 公開）"}
      </button>
    </form>
  );
}

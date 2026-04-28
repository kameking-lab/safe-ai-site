"use client";

import { useState } from "react";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { PAID_MODE } from "@/lib/paid-mode";

type Category =
  | "question"
  | "improvement"
  | "data-error"
  | "feature-request"
  | "business"
  | "other";

const CATEGORIES: { value: Category; label: string; hint: string }[] = [
  { value: "question", label: "質問", hint: "使い方・法令・データの読み方など" },
  { value: "improvement", label: "改善提案", hint: "もっとこうしたら使いやすい等" },
  { value: "data-error", label: "データの誤り", hint: "条文・事故事例・統計の誤りを発見した" },
  { value: "feature-request", label: "機能リクエスト", hint: "追加してほしい機能" },
  { value: "business", label: "業務に関するご相談", hint: "コンサル・受託の検討（任意）" },
  { value: "other", label: "その他", hint: "何でもお書きください" },
];

const INDUSTRY_OPTIONS = [
  "建設・土木",
  "製造・化学",
  "物流・運輸",
  "医療・福祉・介護",
  "林業・農業・漁業",
  "教育・行政",
  "その他",
];

export default function InquiryForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    industry: "",
    category: "question" as Category,
    subject: "",
    message: "",
    publishOk: false,
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setResultMsg(null);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        return;
      }
      setResultMsg(data.message ?? "送信が完了しました。");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 sm:text-sm";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 lg:px-8">
      <TranslatedPageHeader
        titleJa="ご意見・ご質問・改善提案"
        titleEn="Feedback / Questions / Improvement Suggestions"
        descriptionJa="個人運営の研究プロジェクトです。気付いた点をお気軽にお寄せください。"
        descriptionEn="An independent research project — share any feedback or questions you have."
        iconName="MessageSquare"
        iconColor="emerald"
      />

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
        <p className="font-semibold">どんな声でも歓迎します</p>
        <p className="mt-1 text-xs leading-5 text-emerald-800">
          匿名でも投稿できます（名前・メールは任意）。データの誤り・追加してほしい機能・現場で使いにくい点など、お気軽にお書きください。
          {PAID_MODE
            ? "業務委託・顧問契約のご相談もこちらから受け付けています。"
            : "業務に関するご相談もお気軽にお書きください。"}
        </p>
      </div>

      {status === "success" ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center"
        >
          <p className="text-xl font-bold text-emerald-800">送信が完了しました</p>
          <p className="mt-2 text-sm text-emerald-700">
            {resultMsg ??
              "ご意見ありがとうございます。メールアドレスをご記入いただいた場合は3営業日以内に返信します。"}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* カテゴリ */}
          <fieldset>
            <legend className="block text-sm font-semibold text-slate-700">
              カテゴリ <span className="text-red-500">*</span>
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CATEGORIES.map((c) => (
                <label
                  key={c.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                    form.category === c.value
                      ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={form.category === c.value}
                    onChange={() => setForm((f) => ({ ...f, category: c.value }))}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    <span className="block">{c.label}</span>
                    <span className="block text-[11px] font-normal text-slate-500">{c.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 件名 */}
          <div>
            <label htmlFor="inquiry-subject" className="block text-sm font-semibold text-slate-700">
              件名 <span className="text-red-500">*</span>
            </label>
            <input
              id="inquiry-subject"
              required
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="例: 法令検索でこの条文が見つからない"
              className={inputClass}
            />
          </div>

          {/* 本文 */}
          <div>
            <label htmlFor="inquiry-message" className="block text-sm font-semibold text-slate-700">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="inquiry-message"
              required
              rows={7}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="どのページのどの箇所か・期待する動作・現状の動作などをお書きください。"
              className={inputClass}
            />
          </div>

          {/* 任意項目 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="inquiry-name" className="block text-sm font-semibold text-slate-700">
                お名前 <span className="text-xs text-slate-400">（任意）</span>
              </label>
              <input
                id="inquiry-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="匿名でも構いません"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="inquiry-email" className="block text-sm font-semibold text-slate-700">
                メールアドレス <span className="text-xs text-slate-400">（任意・返信希望時）</span>
              </label>
              <input
                id="inquiry-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="example@example.com"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="inquiry-industry" className="block text-sm font-semibold text-slate-700">
              業種 <span className="text-xs text-slate-400">（任意）</span>
            </label>
            <select
              id="inquiry-industry"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              className={`${inputClass} bg-white`}
            >
              <option value="">選択しない</option>
              {INDUSTRY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* 公開Q&Aチェック */}
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <input
              type="checkbox"
              checked={form.publishOk}
              onChange={(e) => setForm((f) => ({ ...f, publishOk: e.target.checked }))}
              className="mt-1 h-4 w-4"
            />
            <span className="text-slate-700">
              この内容を <strong>公開Q&amp;A</strong> として匿名で掲載しても構いません。
              <span className="block text-[11px] text-slate-500">
                チェックを入れた場合のみ、回答とともに公開する場合があります。氏名・メールは公開しません。
              </span>
            </span>
          </label>

          {status === "error" && (
            <p className="text-sm text-red-600" role="alert">
              送信に失敗しました。時間をおいて再度お試しください。
            </p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {status === "sending" ? "送信中..." : "送信する"}
          </button>
          <p className="text-[11px] text-slate-500">
            ※ 個人情報の取扱いは{" "}
            <a href="/privacy" className="underline hover:text-slate-700">
              プライバシーポリシー
            </a>{" "}
            をご確認ください。
          </p>
        </form>
      )}
    </div>
  );
}

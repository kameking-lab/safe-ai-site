"use client";

import { useState } from "react";

const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID;

const FEATURE_OPTIONS = [
  "KY用紙・音声入力",
  "法令チャットボット",
  "事故データベース",
  "Eラーニング編集",
  "PDF出力",
  "安全グッズ情報",
  "その他",
];

const INQUIRY_CATEGORIES = [
  { value: "safety-consulting", label: "労働安全コンサルティング" },
  { value: "education", label: "特別教育・安全衛生教育" },
  { value: "automation", label: "業務自動化（Excel VBA・AI）" },
  { value: "web", label: "Webサイト・LP 制作" },
  { value: "monthly-retainer", label: "月額顧問契約（安全 / AI・DX）" },
  { value: "demo", label: "本サービスのデモ・導入相談" },
  { value: "other", label: "その他" },
] as const;

type InquiryCategory = typeof INQUIRY_CATEGORIES[number]["value"];

const BUDGET_OPTIONS = [
  { value: "under-200k", label: "〜20万円" },
  { value: "200k-500k", label: "20〜50万円" },
  { value: "500k-1m", label: "50〜100万円" },
  { value: "1m-3m", label: "100〜300万円" },
  { value: "over-3m", label: "300万円以上" },
  { value: "monthly", label: "月額顧問契約を希望" },
  { value: "tbd", label: "未定・要相談" },
] as const;

type BudgetValue = typeof BUDGET_OPTIONS[number]["value"];

const CONTACT_METHODS = [
  { value: "online", label: "オンライン会議（Zoom / Teams 等）" },
  { value: "phone", label: "電話" },
  { value: "email", label: "メールのみ" },
  { value: "onsite", label: "対面（訪問）" },
] as const;

type ContactMethodValue = typeof CONTACT_METHODS[number]["value"];

export default function ContactForm() {
  const [form, setForm] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    message: "",
    category: "safety-consulting" as InquiryCategory,
    budget: "tbd" as BudgetValue,
    contactMethod: "online" as ContactMethodValue,
    features: [] as string[],
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function toggleFeature(feat: string) {
    setForm((f) => ({
      ...f,
      features: f.features.includes(feat)
        ? f.features.filter((x) => x !== feat)
        : [...f.features, feat],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!FORMSPREE_ID) {
      // Formspree 未設定時は mailto: フォールバック
      const subject = encodeURIComponent(`[ANZEN AI 事務局] お問い合わせ: ${form.company} ${form.name}`);
      const categoryLabel = INQUIRY_CATEGORIES.find((c) => c.value === form.category)?.label ?? form.category;
      const budgetLabel = BUDGET_OPTIONS.find((b) => b.value === form.budget)?.label ?? form.budget;
      const methodLabel = CONTACT_METHODS.find((m) => m.value === form.contactMethod)?.label ?? form.contactMethod;
      const bodyLines = [
        `会社名: ${form.company}`,
        `担当者名: ${form.name}`,
        `メール: ${form.email}`,
        form.phone ? `電話: ${form.phone}` : "",
        `相談カテゴリ: ${categoryLabel}`,
        `ご予算感: ${budgetLabel}`,
        `希望相談方法: ${methodLabel}`,
        "",
        `【相談内容】`,
        form.message,
        "",
        form.features.length ? `【希望機能】${form.features.join("、")}` : "",
      ].filter((l) => l !== "");
      window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...form, features: form.features.join("、") }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 lg:px-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">お問い合わせ</h1>
        <p className="mt-2 text-sm text-slate-600">
          導入相談・デモのご依頼・機能要望など、お気軽にご連絡ください。
          通常2〜3営業日以内にご返信いたします。
        </p>
      </div>

      {/* 受託可能業務 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">受託可能な業務</h2>
        <p className="mt-2 text-sm text-slate-600">
          サイト運営のかたわら、以下のご依頼をお受けしています。自社の業務を効率化したい方・安全管理体制を見直したい方はお気軽にご相談ください。
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {[
            "労働安全衛生コンサルティング",
            "安全管理システム構築",
            "Excel・ルーティン業務の自動化",
            "KYシート・安全書類のデジタル化",
            "AI活用による業務効率化全般",
            "安全衛生教育・研修",
          ].map((label) => (
            <li key={label} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="mt-0.5 shrink-0 text-emerald-600">✓</span>
              {label}
            </li>
          ))}
        </ul>
      </section>

      {/* プロフィールセクション */}
      <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#1a7a4c] text-2xl font-bold text-white">
          安
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            ANZEN AI 監修
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            労働安全コンサルタント（登録番号260022・土木区分）
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            スーパーゼネコンでの大型土木インフラの施工管理経験をもつ労働安全コンサルタント。
            現場目線での安全衛生教育・リスクアセスメント導入・化学物質管理の指針策定を専門としています。
            本サービスのコンテンツ監修を担当。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["労働安全コンサルタント（土木）", "1級土木施工管理技士", "監理技術者"].map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* フォーム */}
      {status === "success" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
          <p className="text-xl font-bold text-emerald-800">送信完了しました！</p>
          <p className="mt-2 text-sm text-emerald-700">
            2〜3営業日以内にご入力のメールアドレスへご返信いたします。
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-company" className="block text-sm font-semibold text-slate-700">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-company"
                name="company"
                required
                value={form.company}
                onChange={handleChange}
                placeholder="株式会社〇〇建設"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
              />
            </div>
            <div>
              <label htmlFor="contact-name" className="block text-sm font-semibold text-slate-700">
                担当者名 <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-name"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="山田 太郎"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="yamada@example.co.jp"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className="block text-sm font-semibold text-slate-700">
                電話番号 <span className="text-xs text-slate-400">（任意）</span>
              </label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="03-0000-0000"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-category" className="block text-sm font-semibold text-slate-700">
              相談カテゴリ <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {INQUIRY_CATEGORIES.map((c) => (
                <label
                  key={c.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    form.category === c.value
                      ? "border-[#1a7a4c] bg-emerald-50 font-semibold text-emerald-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                  }`}
                >
                  <input
                    type="radio"
                    id="contact-category"
                    name="category"
                    value={c.value}
                    checked={form.category === c.value}
                    onChange={() => setForm((f) => ({ ...f, category: c.value }))}
                    className="h-4 w-4"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-budget" className="block text-sm font-semibold text-slate-700">
                ご予算感 <span className="text-red-500">*</span>
              </label>
              <select
                id="contact-budget"
                name="budget"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value as BudgetValue }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
              >
                {BUDGET_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="contact-method" className="block text-sm font-semibold text-slate-700">
                希望相談方法 <span className="text-red-500">*</span>
              </label>
              <select
                id="contact-method"
                name="contactMethod"
                value={form.contactMethod}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactMethod: e.target.value as ContactMethodValue }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
              >
                {CONTACT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="contact-message" className="block text-sm font-semibold text-slate-700">
              相談内容（自由記述） <span className="text-red-500">*</span>
            </label>
            <textarea
              id="contact-message"
              name="message"
              required
              value={form.message}
              onChange={handleChange}
              rows={5}
              placeholder="現在の課題や相談内容をご記入ください"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              希望する機能 <span className="text-xs text-slate-400">（複数選択可）</span>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map((feat) => (
                <button
                  key={feat}
                  type="button"
                  onClick={() => toggleFeature(feat)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    form.features.includes(feat)
                      ? "border-[#1a7a4c] bg-[#1a7a4c] text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-[#1a7a4c]"
                  }`}
                >
                  {feat}
                </button>
              ))}
            </div>
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600">送信に失敗しました。時間をおいて再度お試しください。</p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-[#1a7a4c] py-3 text-sm font-bold text-white transition hover:bg-[#15633e] disabled:opacity-60"
          >
            {status === "sending" ? "送信中..." : "送信する"}
          </button>
        </form>
      )}
    </div>
  );
}

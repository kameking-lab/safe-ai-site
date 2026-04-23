"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock, MailCheck, ShieldCheck } from "lucide-react";

const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_ID;

const INQUIRY_CATEGORIES = [
  { value: "safety-consulting", label: "労働安全コンサル・診断" },
  { value: "automation", label: "KY・安全業務の自動化／受託開発" },
  { value: "education", label: "特別教育・安全衛生教育・教材制作" },
  { value: "chemical", label: "化学物質管理（SDS・RA）" },
  { value: "monthly-retainer", label: "月額顧問契約（安全 / AI・DX）" },
  { value: "demo", label: "ANZEN AI 本体のデモ・導入相談" },
] as const;

type InquiryCategory = typeof INQUIRY_CATEGORIES[number]["value"];

const BUDGET_OPTIONS = [
  { value: "under-100k", label: "〜10万円" },
  { value: "100k-300k", label: "10〜30万円" },
  { value: "300k-500k", label: "30〜50万円" },
  { value: "500k-1m", label: "50〜100万円" },
  { value: "1m-3m", label: "100〜300万円" },
  { value: "over-3m", label: "300万円以上" },
  { value: "tbd", label: "未定・要相談" },
] as const;

type BudgetValue = typeof BUDGET_OPTIONS[number]["value"];

const INDUSTRY_OPTIONS = [
  { value: "construction", label: "建設・土木" },
  { value: "manufacturing", label: "製造・化学" },
  { value: "logistics", label: "物流・運輸" },
  { value: "care", label: "医療・福祉・介護" },
  { value: "forestry", label: "林業・農業・漁業" },
  { value: "other", label: "その他" },
] as const;

type IndustryValue = typeof INDUSTRY_OPTIONS[number]["value"];

const COMPANY_SIZE_OPTIONS = [
  { value: "solo", label: "個人事業主・一人親方" },
  { value: "1-10", label: "〜10名" },
  { value: "11-50", label: "11〜50名" },
  { value: "51-100", label: "51〜100名" },
  { value: "101-500", label: "101〜500名" },
  { value: "over-500", label: "500名超" },
] as const;

type CompanySizeValue = typeof COMPANY_SIZE_OPTIONS[number]["value"];

const CONTACT_METHODS = [
  { value: "online", label: "オンライン（Zoom / Teams）" },
  { value: "email", label: "メール中心で進めたい" },
  { value: "phone", label: "電話・対面も可" },
] as const;

type ContactMethodValue = typeof CONTACT_METHODS[number]["value"];

const PLAN_PRESET: Record<
  string,
  { label: string; budget: BudgetValue; category: InquiryCategory }
> = {
  free: { label: "フリー（無料）", budget: "tbd", category: "demo" },
  standard: { label: "スタンダード（月額¥980）", budget: "tbd", category: "demo" },
  pro: { label: "プロ（月額¥2,980）", budget: "tbd", category: "demo" },
  custom: { label: "受託（カスタム・個別見積）", budget: "tbd", category: "automation" },
};

const SERVICE_LABEL: Record<string, string> = {
  "ky-digital": "KY（危険予知）デジタル化",
  "safety-automation": "安全管理業務の自動化",
  "law-notify": "法改正通知システム",
  "edu-content": "教育コンテンツ制作",
  chemical: "化学物質管理体制の構築",
  "special-edu": "特別教育・安全衛生教育",
  "claude-code": "Claude Code 活用自動化",
};

export default function ContactForm() {
  const searchParams = useSearchParams();
  const plan = searchParams?.get("plan") ?? "";
  const service = searchParams?.get("service") ?? "";
  const categoryParam = searchParams?.get("category") ?? "";
  const preset = plan && plan in PLAN_PRESET ? PLAN_PRESET[plan] : null;
  const serviceLabel = service && service in SERVICE_LABEL ? SERVICE_LABEL[service] : "";

  const initialCategory: InquiryCategory = (() => {
    if (preset) return preset.category;
    const categoryValues = INQUIRY_CATEGORIES.map((c) => c.value) as readonly string[];
    if (categoryParam && categoryValues.includes(categoryParam)) {
      return categoryParam as InquiryCategory;
    }
    return "safety-consulting";
  })();

  const initialMessage = (() => {
    if (serviceLabel) {
      return `「${serviceLabel}」について相談したいです。\n\n（現状の課題・希望スケジュール・ご予算などをご記入ください）`;
    }
    if (preset) {
      return `${preset.label} の導入について相談したいです。\n\n（事業規模・想定アカウント数・ご相談内容をご記入ください）`;
    }
    return "";
  })();

  const [form, setForm] = useState(() => ({
    company: "",
    name: "",
    email: "",
    phone: "",
    message: initialMessage,
    category: initialCategory,
    industry: "construction" as IndustryValue,
    companySize: "1-10" as CompanySizeValue,
    budget: (preset?.budget ?? "tbd") as BudgetValue,
    contactMethod: "online" as ContactMethodValue,
  }));
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!preset) return;
    setForm((f) =>
      f.company || f.name || f.email || f.message
        ? f
        : {
            ...f,
            message:
              initialMessage ||
              `${preset.label} の導入について相談したいです。\n\n（事業規模・想定アカウント数・ご相談内容をご記入ください）`,
            category: preset.category,
            budget: preset.budget,
          }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setSuccessMessage(null);
    try {
      const apiRes = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          plan,
          service,
          // API が要求する features は空配列を保持（後方互換）
          features: [] as string[],
        }),
      });
      const apiData = (await apiRes.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!apiRes.ok || !apiData.ok) {
        setStatus("error");
        return;
      }

      if (FORMSPREE_ID) {
        void fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...form, plan, service }),
        }).catch(() => undefined);
      }

      setSuccessMessage(apiData.message ?? "送信が完了しました。");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1a7a4c] focus:ring-2 focus:ring-[#1a7a4c]/20";

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 lg:px-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">お問い合わせ・無料相談</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          導入相談・受託業務のご依頼・顧問契約・機能要望など、お気軽にご連絡ください。
          現状の課題に合わせて、最適なプラン・受託メニューをご提案します。
        </p>

        {/* 返信約束バッジ */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <Clock className="h-4 w-4" />
            24時間以内にご返信（土日祝除く）
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
            <MailCheck className="h-4 w-4" />
            無料相談30分を必ず実施
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">
            <ShieldCheck className="h-4 w-4" />
            強引な営業は一切ありません
          </div>
        </div>
      </div>

      {/* プラン／サービス選択で遷移してきた場合のバナー */}
      {(preset || serviceLabel) && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">
            {serviceLabel ? `「${serviceLabel}」の相談として受け付けます` : `${preset?.label}の導入相談として受け付けます`}
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            カテゴリ・ご予算感を自動で入力しました。内容は自由に変更できます。
          </p>
        </div>
      )}

      {/* プロフィール */}
      <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#1a7a4c] text-2xl font-bold text-white">
          安
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            ANZEN AI 監修・受託担当
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            労働安全コンサルタント（登録番号260022・土木区分）
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            大手ゼネコンで大型土木インフラの施工管理経験をもつ労働安全コンサルタント。
            Claude Code による高速開発と現場理解を組み合わせ、「机上の安全管理」ではなく
            「現場で回る仕組み」を設計します。
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
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center"
        >
          <p className="text-xl font-bold text-emerald-800">送信完了しました！</p>
          <p className="mt-2 text-sm text-emerald-700">
            {successMessage ??
              "24時間以内（土日祝を除く）にご入力のメールアドレスへご返信いたします。"}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 会社・担当者 */}
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
                placeholder="株式会社〇〇建設（個人の場合は屋号／お名前）"
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
              />
            </div>
          </div>

          {/* 業種 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              業種 <span className="text-red-500">*</span>
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INDUSTRY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    form.industry === opt.value
                      ? "border-[#1a7a4c] bg-emerald-50 font-semibold text-emerald-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="industry"
                    value={opt.value}
                    checked={form.industry === opt.value}
                    onChange={() => setForm((f) => ({ ...f, industry: opt.value }))}
                    className="h-4 w-4"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* 会社規模 */}
          <div>
            <label htmlFor="contact-company-size" className="block text-sm font-semibold text-slate-700">
              会社・チームの規模 <span className="text-red-500">*</span>
            </label>
            <select
              id="contact-company-size"
              name="companySize"
              value={form.companySize}
              onChange={(e) =>
                setForm((f) => ({ ...f, companySize: e.target.value as CompanySizeValue }))
              }
              className={`${inputClass} bg-white`}
            >
              {COMPANY_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              ご相談カテゴリ <span className="text-red-500">*</span>
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

          {/* 予算 & 連絡方法 */}
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
                className={`${inputClass} bg-white`}
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
                希望する連絡方法 <span className="text-red-500">*</span>
              </label>
              <select
                id="contact-method"
                name="contactMethod"
                value={form.contactMethod}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactMethod: e.target.value as ContactMethodValue }))
                }
                className={`${inputClass} bg-white`}
              >
                {CONTACT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 自由記述 */}
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
              rows={6}
              placeholder="現状の課題・ゴール・希望スケジュールなどをご記入ください。箇条書きでも構いません。"
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              ※ 個人情報の取扱いは <a href="/privacy" className="underline hover:text-slate-700">プライバシーポリシー</a> をご確認ください。
            </p>
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600">
              送信に失敗しました。時間をおいて再度お試しください。
            </p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-[#1a7a4c] py-3.5 text-sm font-bold text-white transition hover:bg-[#15633e] disabled:opacity-60"
          >
            {status === "sending" ? "送信中..." : "送信する（24時間以内に返信します）"}
          </button>
        </form>
      )}
    </div>
  );
}

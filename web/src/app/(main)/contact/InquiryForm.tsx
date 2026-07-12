"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { TranslatedPageHeader } from "@/components/translated-page-header";
import { PageContainer } from "@/components/layout";
import { useLanguage } from "@/contexts/language-context";

type Category =
  | "question"
  | "improvement"
  | "data-error"
  | "feature-request"
  | "business"
  | "other";

type Tab = "general" | "business";

// 「業務に関するご相談」は柱C-10でタブ化したため、一般カテゴリからは除外
const CATEGORIES_JA: { value: Category; label: string; hint: string }[] = [
  { value: "question", label: "質問", hint: "使い方・法令・データの読み方など" },
  { value: "improvement", label: "改善提案", hint: "もっとこうしたら使いやすい等" },
  { value: "data-error", label: "データの誤り", hint: "条文・事故事例・統計の誤りを発見した" },
  { value: "feature-request", label: "機能リクエスト", hint: "追加してほしい機能" },
  { value: "other", label: "その他", hint: "何でもお書きください" },
];

const CATEGORIES_EN: { value: Category; label: string; hint: string }[] = [
  { value: "question", label: "Question", hint: "Usage, laws, how to read data, etc." },
  { value: "improvement", label: "Improvement suggestion", hint: "How to make it easier to use" },
  { value: "data-error", label: "Data error", hint: "Found an error in articles, cases, or stats" },
  { value: "feature-request", label: "Feature request", hint: "Features you'd like to see" },
  { value: "other", label: "Other", hint: "Anything you'd like to share" },
];

const TABS_JA: { value: Tab; label: string }[] = [
  { value: "general", label: "ご意見・ご質問" },
  { value: "business", label: "法人・コンサルのご相談" },
];

const TABS_EN: { value: Tab; label: string }[] = [
  { value: "general", label: "Feedback / Questions" },
  { value: "business", label: "Business / Consulting" },
];

const INDUSTRY_OPTIONS_JA = [
  "建設・土木",
  "製造・化学",
  "物流・運輸",
  "医療・福祉・介護",
  "林業・農業・漁業",
  "教育・行政",
  "その他",
];

const INDUSTRY_OPTIONS_EN = [
  "Construction / Civil",
  "Manufacturing / Chemicals",
  "Logistics / Transport",
  "Healthcare / Welfare / Care",
  "Forestry / Agriculture / Fisheries",
  "Education / Government",
  "Other",
];

export default function InquiryForm() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const searchParams = useSearchParams();
  const CATEGORIES = isEn ? CATEGORIES_EN : CATEGORIES_JA;
  const TABS = isEn ? TABS_EN : TABS_JA;
  const INDUSTRY_OPTIONS = isEn ? INDUSTRY_OPTIONS_EN : INDUSTRY_OPTIONS_JA;
  // 教育パック導線（企画06章・EDU-R2）: course/topic を読み business タブ初期選択＋件名プレフィル。
  // /api/inquiry のスキーマは不変（course は subject に載せる＝env追加なし）。
  const courseParam = searchParams?.get("course") ?? "";
  const topicParam = searchParams?.get("topic") ?? "";
  const isEduContext = Boolean(courseParam) || topicParam === "edu-pack";
  const COURSE_LABELS: Record<string, string> = {
    fullharness: "フルハーネス型墜落制止用器具 特別教育",
    necchu: "熱中症予防 労働衛生教育",
  };
  const courseLabel = courseParam ? (COURSE_LABELS[courseParam] ?? courseParam) : "";
  const initialSubject = isEduContext
    ? isEn
      ? `[Education Pack] ${courseLabel || "Custom training"} — customization inquiry`
      : `【教育パック】${courseLabel ? `${courseLabel} ` : ""}カスタマイズ相談`
    : "";
  const initialTab: Tab =
    searchParams?.get("tab") === "business" ||
    searchParams?.get("category") === "business" ||
    isEduContext
      ? "business"
      : "general";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [form, setForm] = useState({
    name: "",
    email: "",
    industry: searchParams?.get("industry") ?? "",
    category: (initialTab === "business" ? "business" : "question") as Category,
    subject: initialSubject,
    message: "",
    publishOk: false,
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  function handleTabChange(next: Tab) {
    setTab(next);
    setForm((f) => ({
      ...f,
      category: next === "business" ? "business" : "question",
      publishOk: next === "business" ? false : f.publishOk,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setResultMsg(null);
    try {
      // 同一エンドポイント（/api/inquiry）に送信し、category(business/それ以外)が
      // 件名プレフィックスとして送信先メールに反映される（柱C-10: 2タブ化の受け皿を分岐させない）
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
      setResultMsg(data.message ?? (isEn ? "Submission complete." : "送信が完了しました。"));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 sm:text-sm";

  return (
    <PageContainer width="narrow" className="space-y-6">
      <TranslatedPageHeader
        titleJa="ご意見・ご質問・お問い合わせ"
        titleEn="Feedback / Questions / Contact"
        descriptionJa="どちらの窓口も同じ担当者が確認します。内容に近いタブを選んでください。"
        descriptionEn="Both tabs are checked by the same person — pick whichever fits your message."
        iconName="MessageSquare"
        iconColor="emerald"
      />

      {/* 柱C-10: コンサル相談CVパス。2タブ化で「この人に頼みたい」を受け止める */}
      <div role="tablist" aria-label={isEn ? "Contact type" : "お問い合わせの種類"} className="grid grid-cols-2 gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => handleTabChange(t.value)}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${
              tab === t.value
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "business" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          <p className="flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            {isEn
              ? "Consulting, custom development, and training projects"
              : "コンサル・受託開発・教育コンテンツ制作のご相談"}
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            {isEn
              ? "This portal is built and maintained by a licensed labor safety consultant with hands-on construction site management experience. Company/organization inquiries about safety consulting, KY/safety workflow automation, or training material production are welcome here."
              : "本ポータルは労働安全コンサルタント（土木）の資格を持つ運営者が実務経験をもとに開発しています。労働安全コンサル・KY/安全業務の自動化、教育コンテンツ制作などの法人・団体からのご相談を承ります。"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          <p className="font-semibold">
            {isEn ? "All feedback is welcome" : "どんな声でも歓迎します"}
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            {isEn
              ? "Anonymous submissions are fine (name/email optional). Share data errors, feature requests, friction in the field — anything goes."
              : "匿名でも投稿できます（名前・メールは任意）。データの誤り・追加してほしい機能・現場で使いにくい点など、お気軽にお書きください。"}
          </p>
        </div>
      )}

      {status === "success" ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center"
        >
          <p className="text-xl font-bold text-emerald-800">
            {isEn ? "Submission complete" : "送信が完了しました"}
          </p>
          <p className="mt-2 text-sm text-emerald-700">
            {resultMsg ??
              (isEn
                ? "Thanks for your feedback. If you included an email, we'll reply within 3 business days."
                : "ご意見ありがとうございます。メールアドレスをご記入いただいた場合は3営業日以内に返信します。")}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* カテゴリ（法人・コンサル相談タブは category=business 固定のため非表示） */}
          {tab === "general" && (
            <fieldset>
              <legend className="block text-sm font-semibold text-slate-700">
                {isEn ? "Category" : "カテゴリ"} <span className="text-red-500">*</span>
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
          )}

          {/* 件名 */}
          <div>
            <label htmlFor="inquiry-subject" className="block text-sm font-semibold text-slate-700">
              {isEn ? "Subject" : "件名"} <span className="text-red-500">*</span>
            </label>
            <input
              id="inquiry-subject"
              required
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder={
                tab === "business"
                  ? isEn
                    ? "e.g. Safety consulting for a construction site"
                    : "例: 建設現場の労働安全コンサルについて"
                  : isEn
                    ? "e.g. Can't find this article in law search"
                    : "例: 法令検索でこの条文が見つからない"
              }
              className={inputClass}
            />
          </div>

          {/* 本文 */}
          <div>
            <label htmlFor="inquiry-message" className="block text-sm font-semibold text-slate-700">
              {isEn ? "Message" : "内容"} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="inquiry-message"
              required
              rows={7}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder={
                tab === "business"
                  ? isEn
                    ? "Company/organization, current challenges, desired timeline, budget range, etc."
                    : "会社名・団体名、現状の課題、希望スケジュール、ご予算感などをお書きください。"
                  : isEn
                    ? "Which page/section, expected behavior, actual behavior, etc."
                    : "どのページのどの箇所か・期待する動作・現状の動作などをお書きください。"
              }
              className={inputClass}
            />
          </div>

          {/* 任意項目（法人・コンサル相談タブでは返信のため必須化） */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="inquiry-name" className="block text-sm font-semibold text-slate-700">
                {tab === "business" ? (isEn ? "Name / Company" : "お名前・会社名") : isEn ? "Name" : "お名前"}{" "}
                <span className="text-xs text-slate-500">
                  {tab === "business" ? "" : isEn ? "(optional)" : "（任意）"}
                </span>
                {tab === "business" && <span className="text-red-500">*</span>}
              </label>
              <input
                id="inquiry-name"
                required={tab === "business"}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={
                  tab === "business"
                    ? isEn
                      ? "e.g. Yamada Construction Co., Ltd."
                      : "例: 株式会社〇〇建設 山田"
                    : isEn
                      ? "Anonymous is fine"
                      : "匿名でも構いません"
                }
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="inquiry-email" className="block text-sm font-semibold text-slate-700">
                {isEn ? "Email" : "メールアドレス"}{" "}
                <span className="text-xs text-slate-500">
                  {tab === "business" ? "" : isEn ? "(optional, for reply)" : "（任意・返信希望時）"}
                </span>
                {tab === "business" && <span className="text-red-500">*</span>}
              </label>
              <input
                id="inquiry-email"
                type="email"
                required={tab === "business"}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="example@example.com"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="inquiry-industry" className="block text-sm font-semibold text-slate-700">
              {isEn ? "Industry" : "業種"} <span className="text-xs text-slate-500">{isEn ? "(optional)" : "（任意）"}</span>
            </label>
            <select
              id="inquiry-industry"
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              className={`${inputClass} bg-white`}
            >
              <option value="">{isEn ? "Not selected" : "選択しない"}</option>
              {INDUSTRY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* 公開Q&Aチェック（法人・コンサル相談は個別対応のため対象外） */}
          {tab === "general" && (
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={form.publishOk}
                onChange={(e) => setForm((f) => ({ ...f, publishOk: e.target.checked }))}
                className="mt-1 h-4 w-4"
              />
              <span className="text-slate-700">
                {isEn ? (
                  <>
                    This content may be posted anonymously to the <strong>public Q&amp;A</strong>.
                    <span className="block text-[11px] text-slate-500">
                      Only when checked may we publish your message alongside a reply. Name and email are never shared.
                    </span>
                  </>
                ) : (
                  <>
                    この内容を <strong>公開Q&amp;A</strong> として匿名で掲載しても構いません。
                    <span className="block text-[11px] text-slate-500">
                      チェックを入れた場合のみ、回答とともに公開する場合があります。氏名・メールは公開しません。
                    </span>
                  </>
                )}
              </span>
            </label>
          )}

          {status === "error" && (
            <p className="text-sm text-red-600" role="alert">
              {isEn ? "Submission failed. Please try again later." : "送信に失敗しました。時間をおいて再度お試しください。"}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {status === "sending" ? (isEn ? "Sending..." : "送信中...") : (isEn ? "Submit" : "送信する")}
          </button>
          <p className="text-[11px] text-slate-500">
            {isEn ? "* Personal-data handling per the " : "※ 個人情報の取扱いは"}{" "}
            <a href="/privacy" className="underline hover:text-slate-700">
              {isEn ? "Privacy Policy" : "プライバシーポリシー"}
            </a>{" "}
            {isEn ? "." : "をご確認ください。"}
          </p>
          <p className="text-[11px] text-slate-500">
            {isEn ? "If the form is unavailable, contact us directly at " : "フォームが使えない場合は "}
            <a href="mailto:kenshi.ycc@gmail.com" className="underline hover:text-slate-700">
              kenshi.ycc@gmail.com
            </a>
            {isEn ? "." : " まで直接ご連絡ください。"}
          </p>
        </form>
      )}
    </PageContainer>
  );
}

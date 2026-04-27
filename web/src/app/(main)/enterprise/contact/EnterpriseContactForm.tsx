"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Calendar,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";

const CAL_COM_URL = "https://cal.com/anzen-ai/30min";

const INDUSTRY_OPTIONS = [
  { value: "construction", label: "建設・土木" },
  { value: "manufacturing", label: "製造・化学" },
  { value: "logistics", label: "物流・運輸" },
  { value: "care", label: "医療・福祉・介護" },
  { value: "forestry", label: "林業・農業・漁業" },
  { value: "service", label: "サービス・小売" },
  { value: "other", label: "その他" },
] as const;

type IndustryValue = (typeof INDUSTRY_OPTIONS)[number]["value"];

const COMPANY_SIZE_OPTIONS = [
  { value: "1-50", label: "〜50名（中小）", planHint: "small" },
  { value: "51-300", label: "50〜300名（中規模）", planHint: "mid" },
  { value: "301-1000", label: "300〜1,000名（大手）", planHint: "large" },
  { value: "over-1000", label: "1,000名超（エンタープライズ）", planHint: "large" },
] as const;

type CompanySizeValue = (typeof COMPANY_SIZE_OPTIONS)[number]["value"];

const CHALLENGES = [
  { value: "ky-paper", label: "紙のKY運用を電子化したい" },
  { value: "law-update", label: "法改正のキャッチアップが追いつかない" },
  { value: "training", label: "特別教育・職長教育を効率化したい" },
  { value: "chemical", label: "化学物質の自律管理対応が不安" },
  { value: "incident", label: "ヒヤリハット集計が形骸化している" },
  { value: "audit", label: "監査・ESG開示への対応" },
  { value: "automation", label: "Excel・紙の集計を自動化したい" },
  { value: "consulting", label: "労働安全コンサル監修が欲しい" },
] as const;

const TIMELINE = [
  { value: "asap", label: "今すぐ（1か月以内）" },
  { value: "quarter", label: "今四半期中（3か月以内）" },
  { value: "half", label: "半年以内" },
  { value: "research", label: "情報収集中（時期未定）" },
] as const;

type TimelineValue = (typeof TIMELINE)[number]["value"];

const BUDGET_OPTIONS = [
  { value: "under-500k", label: "〜50万円" },
  { value: "500k-1m", label: "50〜100万円" },
  { value: "1m-3m", label: "100〜300万円" },
  { value: "3m-10m", label: "300〜1,000万円" },
  { value: "over-10m", label: "1,000万円以上" },
  { value: "tbd", label: "未定・ご提案次第" },
] as const;

type BudgetValue = (typeof BUDGET_OPTIONS)[number]["value"];

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const TOTAL_STEPS = 6;

export default function EnterpriseContactForm() {
  const searchParams = useSearchParams();
  const planParam = searchParams?.get("plan") ?? "";
  const serviceParam = searchParams?.get("service") ?? "";

  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState({
    industry: "construction" as IndustryValue,
    companySize: "51-300" as CompanySizeValue,
    challenges: [] as string[],
    timeline: "quarter" as TimelineValue,
    budget: "tbd" as BudgetValue,
    company: "",
    name: "",
    email: "",
    phone: "",
    message: planParam
      ? `「${planParam}」プランの導入を検討しています。\n\n（追加でお伝えしたいことがあればご記入ください）`
      : serviceParam
        ? `「${serviceParam}」について相談したいです。\n\n（追加でお伝えしたいことがあればご記入ください）`
        : "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function toggleChallenge(value: string) {
    setForm((f) => {
      const has = f.challenges.includes(value);
      return {
        ...f,
        challenges: has ? f.challenges.filter((c) => c !== value) : [...f.challenges, value],
      };
    });
  }

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(form.industry);
      case 1:
        return Boolean(form.companySize);
      case 2:
        return form.challenges.length > 0;
      case 3:
        return Boolean(form.timeline);
      case 4:
        return Boolean(form.budget);
      case 5:
        return (
          form.company.trim().length > 0 &&
          form.name.trim().length > 0 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
        );
      default:
        return true;
    }
  }, [step, form]);

  function next() {
    if (step < TOTAL_STEPS) setStep((step + 1) as Step);
  }
  function prev() {
    if (step > 0) setStep((step - 1) as Step);
  }

  async function handleSubmit() {
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.company,
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: [
            form.message,
            "",
            "── 法人ヒアリング情報 ──",
            `業種: ${INDUSTRY_OPTIONS.find((o) => o.value === form.industry)?.label}`,
            `規模: ${COMPANY_SIZE_OPTIONS.find((o) => o.value === form.companySize)?.label}`,
            `課題: ${form.challenges
              .map((c) => CHALLENGES.find((x) => x.value === c)?.label)
              .filter(Boolean)
              .join(" / ")}`,
            `導入希望時期: ${TIMELINE.find((t) => t.value === form.timeline)?.label}`,
            `予算感: ${BUDGET_OPTIONS.find((b) => b.value === form.budget)?.label}`,
            planParam ? `参照プラン: ${planParam}` : "",
            serviceParam ? `参照サービス: ${serviceParam}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          category: "enterprise",
          budget: form.budget,
          contactMethod: "online",
          features: form.challenges,
          plan: planParam,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMsg(data.message ?? "送信に失敗しました。時間をおいて再度お試しください。");
        return;
      }
      setStatus("success");
      setStep(TOTAL_STEPS as Step);
    } catch {
      setStatus("error");
      setErrorMsg("通信エラーが発生しました。時間をおいて再度お試しください。");
    }
  }

  const progressPercent = Math.round((Math.min(step, TOTAL_STEPS) / TOTAL_STEPS) * 100);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {/* ヘッダー */}
      <header className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
          <Building2 className="h-3.5 w-3.5" aria-hidden />
          Enterprise Contact
        </span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          法人向け 無料相談（30分）
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          5〜7問のヒアリングにお答えいただくと、貴社に合った提案・概算見積を 24時間以内にお送りします。
          オンライン相談（Cal.com）の予約もこのページで完結します。
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <Sparkles className="h-4 w-4" />
            無料相談30分
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
            <Mail className="h-4 w-4" />
            24時間以内に返信
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">
            <ShieldCheck className="h-4 w-4" />
            無理な営業はありません
          </div>
        </div>
      </header>

      {/* 進捗バー */}
      {status !== "success" && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              Step {Math.min(step + 1, TOTAL_STEPS)} / {TOTAL_STEPS}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div
            className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Step 0: 業種 */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">Q1. 業種を教えてください</h2>
            <p className="mt-1 text-xs text-slate-500">最も近いものを1つ選択してください。</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {INDUSTRY_OPTIONS.map((opt) => {
                const active = form.industry === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, industry: opt.value }))}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: 規模 */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Q2. 従業員規模を教えてください
            </h2>
            <p className="mt-1 text-xs text-slate-500">グループ全体ではなく、対象組織の規模で選択してください。</p>
            <div className="mt-4 grid gap-2">
              {COMPANY_SIZE_OPTIONS.map((opt) => {
                const active = form.companySize === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, companySize: opt.value }))}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: 課題 */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Q3. 現在の安全管理の課題はどれですか？
            </h2>
            <p className="mt-1 text-xs text-slate-500">複数選択可。1つ以上選んでください。</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {CHALLENGES.map((c) => {
                const active = form.challenges.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleChallenge(c.value)}
                    className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        active ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                      }`}
                      aria-hidden
                    >
                      {active ? <CheckCircle2 className="h-3 w-3" /> : null}
                    </span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: 時期 */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Q4. 導入希望時期を教えてください
            </h2>
            <div className="mt-4 grid gap-2">
              {TIMELINE.map((t) => {
                const active = form.timeline === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, timeline: t.value }))}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: 予算 */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">Q5. ご予算感を教えてください</h2>
            <p className="mt-1 text-xs text-slate-500">
              年間総額のイメージ。未定でも構いません。提案後に調整可能です。
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {BUDGET_OPTIONS.map((b) => {
                const active = form.budget === b.value;
                return (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, budget: b.value }))}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: 連絡先 */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Q6. ご連絡先を教えてください
            </h2>
            <div>
              <label htmlFor="ec-company" className="block text-sm font-semibold text-slate-700">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                id="ec-company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="株式会社〇〇建設"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="ec-name" className="block text-sm font-semibold text-slate-700">
                ご担当者名 <span className="text-red-500">*</span>
              </label>
              <input
                id="ec-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="山田 太郎"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="ec-email" className="block text-sm font-semibold text-slate-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="ec-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="yamada@example.co.jp"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="ec-phone" className="block text-sm font-semibold text-slate-700">
                電話番号 <span className="text-xs text-slate-400">（任意）</span>
              </label>
              <input
                id="ec-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="03-0000-0000"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="ec-message" className="block text-sm font-semibold text-slate-700">
                追加メッセージ <span className="text-xs text-slate-400">（任意）</span>
              </label>
              <textarea
                id="ec-message"
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="特に伝えたいことがあればご記入ください"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 sm:text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              ※ 個人情報の取扱いは{" "}
              <Link href="/privacy" className="underline hover:text-slate-700">
                プライバシーポリシー
              </Link>{" "}
              をご確認ください。
            </p>
          </div>
        )}

        {/* Step 6: 完了＋Cal.com予約 */}
        {step === TOTAL_STEPS && (
          <div className="space-y-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-3 text-lg font-bold text-emerald-900">送信が完了しました</p>
              <p className="mt-1 text-sm text-emerald-800">
                {status === "success"
                  ? "24時間以内（土日祝を除く）にご担当者よりメールでご連絡します。"
                  : "ご入力ありがとうございました。"}
              </p>
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Calendar className="h-5 w-5 text-emerald-600" />
                さらに早く話したい方は、その場で相談予約
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Cal.com で30分のオンライン相談枠（Zoom）を直接予約できます。
              </p>

              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <iframe
                  src={CAL_COM_URL}
                  title="Cal.com 30分 無料相談予約"
                  className="h-[640px] w-full"
                  loading="lazy"
                />
              </div>
              <a
                href={CAL_COM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                外部ページで開く（{CAL_COM_URL}） →
              </a>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-bold text-slate-900">提案書テンプレートも公開しています</h3>
              <p className="mt-1 text-xs text-slate-600">
                3プラン（中小／中規模／大手）の概算見積をPDFで確認いただけます。
              </p>
              <Link
                href="/services/proposal"
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:border-emerald-400"
              >
                提案書テンプレートを見る
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ナビゲーション */}
        {status !== "success" && step < TOTAL_STEPS && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={prev}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              戻る
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={next}
                disabled={!stepValid}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                次へ
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!stepValid || status === "sending"}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "sending" ? "送信中..." : "送信する"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {errorMsg && status === "error" && (
          <p className="mt-4 text-sm text-red-600">{errorMsg}</p>
        )}
      </section>
    </main>
  );
}

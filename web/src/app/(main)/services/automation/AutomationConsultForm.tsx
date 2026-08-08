"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { trackAutomationEvent } from "@/lib/automation-consult/analytics";
import { parseAutomationConsultationTypePrefill } from "@/lib/automation-consult/prefill";

const SERVICE_PATH = "/services/automation";
// サーバーは運営者通知（並列・最大10秒）後に自動返信（最大10秒）を送る。
// 正常処理中の誤タイムアウトを避けつつ、30秒で必ず中断する。
const REQUEST_TIMEOUT_MS = 30_000;

const CONSULTATION_TYPES = [
  { value: "automation", label: "業務自動化" },
  { value: "ai-utilization", label: "AI活用" },
  { value: "safety-efficiency", label: "安全衛生業務の効率化" },
  { value: "training", label: "講習・研修" },
  { value: "training-materials", label: "講習会資料作成" },
  { value: "manuals", label: "マニュアル・手順書作成" },
  { value: "signage", label: "サイネージ" },
  { value: "heat-illness-training", label: "熱中症講習" },
  { value: "safety-education-materials", label: "安全教育資料" },
  { value: "wbgt-weather-notifications", label: "WBGT・気象通知" },
  { value: "heat-signage", label: "熱中症サイネージ表示" },
  { value: "ky-document-automation", label: "KY・帳票自動化" },
  { value: "other", label: "その他" },
] as const;

const TIMING_OPTIONS = [
  { value: "asap", label: "できるだけ早く" },
  { value: "within-1-month", label: "1か月以内" },
  { value: "within-3-months", label: "3か月以内" },
  { value: "undecided", label: "未定・相談して決めたい" },
] as const;

const BUDGET_OPTIONS = [
  { value: "", label: "選択しない" },
  { value: "under-50000", label: "5万円未満" },
  { value: "50000-100000", label: "5万〜10万円" },
  { value: "100000-300000", label: "10万〜30万円" },
  { value: "300000-500000", label: "30万〜50万円" },
  { value: "over-500000", label: "50万円以上" },
  { value: "undecided", label: "未定・相談して決めたい" },
] as const;

const DELIVERY_OPTIONS = [
  { value: "", label: "選択しない" },
  { value: "online", label: "オンライン希望" },
  { value: "onsite", label: "現地希望" },
  { value: "either", label: "どちらでもよい" },
  { value: "undecided", label: "相談して決めたい" },
] as const;

type ConsultationType = (typeof CONSULTATION_TYPES)[number]["value"] | "";
type Timing = (typeof TIMING_OPTIONS)[number]["value"] | "";
type Budget = (typeof BUDGET_OPTIONS)[number]["value"];
type DeliveryPreference = (typeof DELIVERY_OPTIONS)[number]["value"];

type FormState = {
  consultationType: ConsultationType;
  name: string;
  email: string;
  organization: string;
  currentProblem: string;
  desiredSupport: string;
  currentTools: string;
  timing: Timing;
  budget: Budget;
  deliveryPreference: DeliveryPreference;
  privacyConsent: boolean;
  website: string;
};

type FieldName = keyof Omit<FormState, "website">;
type FieldErrors = Partial<Record<FieldName, string>>;

const INITIAL_FORM: FormState = {
  consultationType: "",
  name: "",
  email: "",
  organization: "",
  currentProblem: "",
  desiredSupport: "",
  currentTools: "",
  timing: "",
  budget: "",
  deliveryPreference: "",
  privacyConsent: false,
  website: "",
};

const FIELD_IDS: Record<FieldName, string> = {
  consultationType: "automation-consult-type",
  name: "automation-consult-name",
  email: "automation-consult-email",
  organization: "automation-consult-organization",
  currentProblem: "automation-consult-problem",
  desiredSupport: "automation-consult-support",
  currentTools: "automation-consult-tools",
  timing: "automation-consult-timing",
  budget: "automation-consult-budget",
  deliveryPreference: "automation-consult-delivery",
  privacyConsent: "automation-consult-consent",
};

const FIELD_LABELS: Record<FieldName, string> = {
  consultationType: "相談種別",
  name: "お名前・担当者名",
  email: "返信用メールアドレス",
  organization: "会社・団体名",
  currentProblem: "現在困っていること",
  desiredSupport: "希望する支援",
  currentTools: "現在利用しているツール",
  timing: "希望時期",
  budget: "予算帯",
  deliveryPreference: "オンライン・現地等の希望",
  privacyConsent: "個人情報の取扱いへの同意",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStepOne(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.consultationType) errors.consultationType = "相談種別を選択してください。";
  const problemLength = form.currentProblem.trim().length;
  if (problemLength < 10) {
    errors.currentProblem = "困っていることを10文字以上で入力してください。";
  } else if (problemLength > 2_000) {
    errors.currentProblem = "困っていることは2,000文字以内で入力してください。";
  }
  const supportLength = form.desiredSupport.trim().length;
  if (supportLength < 10) {
    errors.desiredSupport = "希望する支援を10文字以上で入力してください。";
  } else if (supportLength > 2_000) {
    errors.desiredSupport = "希望する支援は2,000文字以内で入力してください。";
  }
  return errors;
}

function validateStepTwo(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const nameLength = form.name.trim().length;
  if (!nameLength) errors.name = "お名前・担当者名を入力してください。";
  else if (nameLength > 80) errors.name = "お名前・担当者名は80文字以内で入力してください。";

  const email = form.email.trim();
  if (!email) errors.email = "返信用メールアドレスを入力してください。";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = "有効なメールアドレスを入力してください。";
  }

  if (form.organization.trim().length > 120) {
    errors.organization = "会社・団体名は120文字以内で入力してください。";
  }
  if (form.currentTools.trim().length > 500) {
    errors.currentTools = "利用中のツールは500文字以内で入力してください。";
  }
  if (!form.timing) errors.timing = "希望時期を選択してください。";
  if (!form.privacyConsent) {
    errors.privacyConsent = "個人情報の取扱いを確認し、同意してください。";
  }
  return errors;
}

function createIdempotencyKey(): string {
  const prefix = Date.now().toString(36);
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}.${crypto.randomUUID()}`;
  }
  return `${prefix}.automation-${Math.random().toString(36).slice(2, 20)}`;
}

function analyticsClassification(form: FormState) {
  return {
    page: SERVICE_PATH as "/services/automation",
    ...(form.consultationType ? { consultation_type: form.consultationType } : {}),
    ...(form.budget ? { budget_band: form.budget } : {}),
  };
}

function safeFailureMessage(code?: string): string {
  switch (code) {
    case "rate_limited":
      return "短時間に送信が集中しています。時間をおいてから、もう一度お試しください。";
    case "delivery_not_configured":
      return "現在、相談受付の準備中です。運営側の設定完了後に、もう一度お試しください。";
    case "delivery_failed":
      return "通知を送信できなかったため、受付は完了していません。時間をおいて再度お試しください。";
    case "idempotency_conflict":
      return "送信内容が更新されています。内容を確認して、もう一度送信してください。";
    case "payload_too_large":
      return "入力内容が長すぎます。要点を短くして、もう一度お試しください。";
    case "invalid_origin":
      return "このページから送信を確認できませんでした。ページを再読み込みしてお試しください。";
    default:
      return "送信を完了できませんでした。入力内容は受付されていません。時間をおいて再度お試しください。";
  }
}

function ErrorSummary({
  errors,
  summaryRef,
}: {
  errors: FieldErrors;
  summaryRef: React.RefObject<HTMLDivElement | null>;
}) {
  const entries = Object.entries(errors) as [FieldName, string][];
  if (!entries.length) return null;
  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      aria-labelledby="automation-error-summary-title"
      className="rounded-xl border-2 border-red-700 bg-red-50 p-4 text-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
    >
      <h3 id="automation-error-summary-title" className="font-bold">
        入力内容を確認してください
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {entries.map(([field, message]) => (
          <li key={field}>
            <a
              href={`#${FIELD_IDS[field]}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(FIELD_IDS[field])?.focus();
              }}
              className="inline-flex min-h-[44px] items-center underline decoration-2 underline-offset-2"
            >
              {FIELD_LABELS[field]}：{message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FieldError({ field, errors }: { field: FieldName; errors: FieldErrors }) {
  const message = errors[field];
  if (!message) return null;
  return (
    <p id={`${FIELD_IDS[field]}-error`} className="mt-1 text-sm font-semibold text-red-700">
      {message}
    </p>
  );
}

function describedBy(field: FieldName, errors: FieldErrors, hintId?: string) {
  return [hintId, errors[field] ? `${FIELD_IDS[field]}-error` : undefined]
    .filter(Boolean)
    .join(" ") || undefined;
}

export function AutomationConsultForm({
  initialConsultationType = "",
}: {
  initialConsultationType?: ConsultationType;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_FORM,
    consultationType: initialConsultationType,
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [successDeliveryMode, setSuccessDeliveryMode] = useState<
    "delivery" | "dry-run"
  >("delivery");
  const [failureMessage, setFailureMessage] = useState("");
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const formStartedRef = useRef(false);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialConsultationType) return;
    const prefill = parseAutomationConsultationTypePrefill(
      window.location.search,
    );
    if (!prefill) return;
    setForm((current) =>
      current.consultationType
        ? current
        : { ...current, consultationType: prefill },
    );
  }, [initialConsultationType]);

  useEffect(() => {
    if (Object.keys(errors).length > 0) errorSummaryRef.current?.focus();
  }, [errors]);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      const hasUnsavedInput = Object.entries(form).some(([field, value]) => {
        if (field === "website") return false;
        return typeof value === "boolean" ? value : value.trim().length > 0;
      });
      if (
        !formStartedRef.current ||
        !hasUnsavedInput ||
        submittingRef.current ||
        status === "success"
      ) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [form, status]);

  function markFormStarted() {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    trackAutomationEvent("automation_form_start", {
      ...analyticsClassification(form),
      success: true,
    });
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as FieldName];
      return next;
    });
    if (status === "error") {
      setStatus("idle");
      setFailureMessage("");
      idempotencyKeyRef.current = null;
    }
  }

  function reportValidation(validationErrors: FieldErrors) {
    setErrors(validationErrors);
    trackAutomationEvent("automation_form_validation_error", {
      ...analyticsClassification(form),
      success: false,
    });
  }

  function goToStepTwo() {
    const validationErrors = validateStepOne(form);
    if (Object.keys(validationErrors).length) {
      reportValidation(validationErrors);
      return;
    }
    setErrors({});
    setStep(2);
    requestAnimationFrame(() => stepHeadingRef.current?.focus());
  }

  function goToStepOne() {
    setErrors({});
    setStep(1);
    requestAnimationFrame(() => stepHeadingRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      goToStepTwo();
      return;
    }
    if (submittingRef.current) return;

    const validationErrors = {
      ...validateStepOne(form),
      ...validateStepTwo(form),
    };
    if (Object.keys(validationErrors).length) {
      reportValidation(validationErrors);
      return;
    }

    submittingRef.current = true;
    setErrors({});
    setFailureMessage("");
    setStatus("sending");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = createIdempotencyKey();

    try {
      const response = await fetch("/api/automation-consult", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        signal: controller.signal,
        body: JSON.stringify({
          consultationType: form.consultationType,
          name: form.name.trim(),
          email: form.email.trim(),
          organization: form.organization.trim() || undefined,
          currentProblem: form.currentProblem.trim(),
          desiredSupport: form.desiredSupport.trim(),
          currentTools: form.currentTools.trim() || undefined,
          timing: form.timing,
          budget: form.budget || undefined,
          deliveryPreference: form.deliveryPreference || undefined,
          privacyConsent: true,
          website: form.website,
          sourcePage: SERVICE_PATH,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            deliveryMode?: unknown;
            error?: { code?: string; fieldErrors?: Record<string, string | string[]> };
          }
        | null;

      if (!response.ok || !data?.ok) {
        const serverErrors: FieldErrors = {};
        if (data?.error?.fieldErrors) {
          for (const [key, value] of Object.entries(data.error.fieldErrors)) {
            if (!(key in FIELD_IDS)) continue;
            const message = Array.isArray(value) ? value[0] : value;
            if (typeof message === "string" && message.length <= 200) {
              serverErrors[key as FieldName] = message;
            }
          }
        }
        if (Object.keys(serverErrors).length) reportValidation(serverErrors);
        setFailureMessage(safeFailureMessage(data?.error?.code));
        setStatus("error");
        if (data?.error?.code === "idempotency_conflict") idempotencyKeyRef.current = null;
        return;
      }

      trackAutomationEvent("automation_form_success", {
        ...analyticsClassification(form),
        success: true,
      });
      setForm(INITIAL_FORM);
      setErrors({});
      setSuccessDeliveryMode(
        data.deliveryMode === "dry-run" ? "dry-run" : "delivery",
      );
      setStatus("success");
      idempotencyKeyRef.current = null;
    } catch {
      setFailureMessage(
        "通信が完了しなかったため、受付状況を確認できません。少し待ってから同じ内容で再度お試しください。",
      );
      setStatus("error");
    } finally {
      window.clearTimeout(timeout);
      submittingRef.current = false;
    }
  }

  if (status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-6 text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:p-8"
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-700" aria-hidden="true" />
        <h2 className="mt-3 text-2xl font-bold">
          {successDeliveryMode === "dry-run"
            ? "入力内容を検証しました"
            : "相談を受け付けました"}
        </h2>
        {successDeliveryMode === "dry-run" ? (
          <>
            <p className="mt-3 leading-7">
              この検証環境では、入力・送信元・重複送信防止・送信回数・メール構造までを確認しました。
            </p>
            <p className="mt-2 text-sm font-semibold leading-6">
              実際のメール送信、外部保存、正式な相談受付は行っていません。
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 leading-7">
              ご入力のメールアドレスへ受付メールを送信しました。返信時期や連絡方法は、受付メールの案内をご確認ください。
            </p>
            <p className="mt-2 text-sm leading-6">
              機密資料や追加の個人情報は、運営者から安全な共有方法をご案内するまで送らないでください。
            </p>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setStep(1);
            setStatus("idle");
            setSuccessDeliveryMode("delivery");
            formStartedRef.current = false;
          }}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-700 bg-white px-5 py-3 text-sm font-bold text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        >
          {successDeliveryMode === "dry-run"
            ? "別の検証入力を試す"
            : "別の相談を入力する"}
        </button>
      </div>
    );
  }

  const inputClass =
    "mt-1 min-h-[44px] w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-base text-slate-950 shadow-sm outline-none placeholder:text-slate-500 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 disabled:bg-slate-100";

  return (
    <form
      data-automation-consult-ready={isReady ? "true" : "false"}
      noValidate
      aria-busy={!isReady || status === "sending"}
      onSubmit={handleSubmit}
      onFocusCapture={markFormStarted}
      className="space-y-6"
    >
      <div role="group" aria-labelledby="automation-form-progress">
        <p
          id="automation-form-progress"
          className="text-sm font-bold text-slate-800"
          aria-live="polite"
        >
          ステップ {step} / 2
        </p>
        <ol className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <li
            aria-current={step === 1 ? "step" : undefined}
            className={`rounded-lg border px-3 py-2 font-semibold ${
              step === 1
                ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            1. ご相談内容
          </li>
          <li
            aria-current={step === 2 ? "step" : undefined}
            className={`rounded-lg border px-3 py-2 font-semibold ${
              step === 2
                ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                : "border-slate-300 bg-white text-slate-700"
            }`}
          >
            2. 返信先・条件
          </li>
        </ol>
      </div>

      <ErrorSummary errors={errors} summaryRef={errorSummaryRef} />

      <section aria-labelledby={`automation-form-step-${step}`}>
        <h2
          ref={stepHeadingRef}
          id={`automation-form-step-${step}`}
          tabIndex={-1}
          className="text-xl font-bold text-slate-950 focus:outline-none"
        >
          {step === 1 ? "相談したい内容を教えてください" : "返信先と希望条件を教えてください"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          <span className="font-bold text-red-700">必須</span> と表示した項目だけ入力してください。
        </p>

        {step === 1 ? (
          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor={FIELD_IDS.consultationType} className="block text-sm font-bold text-slate-900">
                相談種別 <span className="text-red-700">（必須）</span>
              </label>
              <select
                id={FIELD_IDS.consultationType}
                value={form.consultationType}
                onChange={(event) =>
                  updateField("consultationType", event.target.value as ConsultationType)
                }
                aria-invalid={Boolean(errors.consultationType)}
                aria-describedby={describedBy("consultationType", errors)}
                className={inputClass}
              >
                <option value="">選択してください</option>
                {CONSULTATION_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldError field="consultationType" errors={errors} />
            </div>

            <div>
              <label htmlFor={FIELD_IDS.currentProblem} className="block text-sm font-bold text-slate-900">
                現在困っていること <span className="text-red-700">（必須）</span>
              </label>
              <textarea
                id={FIELD_IDS.currentProblem}
                value={form.currentProblem}
                onChange={(event) => updateField("currentProblem", event.target.value)}
                rows={5}
                maxLength={2_000}
                aria-invalid={Boolean(errors.currentProblem)}
                aria-describedby={describedBy(
                  "currentProblem",
                  errors,
                  "automation-consult-problem-hint",
                )}
                className={`${inputClass} min-h-32`}
                placeholder="例：毎週、複数のExcelを手作業でまとめており、集計に3時間かかっています。"
              />
              <p id="automation-consult-problem-hint" className="mt-1 text-sm leading-6 text-slate-600">
                会社名、顧客名、現場名、個人名などは伏せ、作業の流れと困りごとだけを入力してください。
              </p>
              <FieldError field="currentProblem" errors={errors} />
            </div>

            <div>
              <label htmlFor={FIELD_IDS.desiredSupport} className="block text-sm font-bold text-slate-900">
                自動化・講習・資料作成の希望 <span className="text-red-700">（必須）</span>
              </label>
              <textarea
                id={FIELD_IDS.desiredSupport}
                value={form.desiredSupport}
                onChange={(event) => updateField("desiredSupport", event.target.value)}
                rows={5}
                maxLength={2_000}
                aria-invalid={Boolean(errors.desiredSupport)}
                aria-describedby={describedBy(
                  "desiredSupport",
                  errors,
                  "automation-consult-support-hint",
                )}
                className={`${inputClass} min-h-32`}
                placeholder="例：CSVをまとめ、定型の月次レポートを作れるようにしたいです。"
              />
              <p id="automation-consult-support-hint" className="mt-1 text-sm leading-6 text-slate-600">
                まだ決まっていない場合は「何を自動化できるか一緒に整理したい」と入力できます。
              </p>
              <FieldError field="desiredSupport" errors={errors} />
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={FIELD_IDS.name} className="block text-sm font-bold text-slate-900">
                  お名前・担当者名 <span className="text-red-700">（必須）</span>
                </label>
                <input
                  id={FIELD_IDS.name}
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={describedBy("name", errors)}
                  className={inputClass}
                />
                <FieldError field="name" errors={errors} />
              </div>
              <div>
                <label htmlFor={FIELD_IDS.email} className="block text-sm font-bold text-slate-900">
                  返信用メールアドレス <span className="text-red-700">（必須）</span>
                </label>
                <input
                  id={FIELD_IDS.email}
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  autoComplete="email"
                  maxLength={254}
                  spellCheck={false}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={describedBy("email", errors)}
                  className={inputClass}
                />
                <FieldError field="email" errors={errors} />
              </div>
            </div>

            <div>
              <label htmlFor={FIELD_IDS.organization} className="block text-sm font-bold text-slate-900">
                会社・団体名 <span className="font-normal text-slate-600">（任意）</span>
              </label>
              <input
                id={FIELD_IDS.organization}
                value={form.organization}
                onChange={(event) => updateField("organization", event.target.value)}
                autoComplete="organization"
                maxLength={120}
                aria-invalid={Boolean(errors.organization)}
                aria-describedby={describedBy("organization", errors)}
                className={inputClass}
              />
              <FieldError field="organization" errors={errors} />
            </div>

            <div>
              <label htmlFor={FIELD_IDS.currentTools} className="block text-sm font-bold text-slate-900">
                現在利用しているツール <span className="font-normal text-slate-600">（任意）</span>
              </label>
              <textarea
                id={FIELD_IDS.currentTools}
                value={form.currentTools}
                onChange={(event) => updateField("currentTools", event.target.value)}
                rows={3}
                maxLength={500}
                aria-invalid={Boolean(errors.currentTools)}
                aria-describedby={describedBy(
                  "currentTools",
                  errors,
                  "automation-consult-tools-hint",
                )}
                className={`${inputClass} min-h-24`}
                placeholder="例：Excel、Googleフォーム、Microsoft 365"
              />
              <p id="automation-consult-tools-hint" className="mt-1 text-sm leading-6 text-slate-600">
                アカウント名、URL、ファイル名、顧客名、認証情報は入力しないでください。
              </p>
              <FieldError field="currentTools" errors={errors} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor={FIELD_IDS.timing} className="block text-sm font-bold text-slate-900">
                  希望時期 <span className="text-red-700">（必須）</span>
                </label>
                <select
                  id={FIELD_IDS.timing}
                  value={form.timing}
                  onChange={(event) => updateField("timing", event.target.value as Timing)}
                  aria-invalid={Boolean(errors.timing)}
                  aria-describedby={describedBy("timing", errors)}
                  className={inputClass}
                >
                  <option value="">選択してください</option>
                  {TIMING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError field="timing" errors={errors} />
              </div>
              <div>
                <label htmlFor={FIELD_IDS.budget} className="block text-sm font-bold text-slate-900">
                  予算帯 <span className="font-normal text-slate-600">（任意）</span>
                </label>
                <select
                  id={FIELD_IDS.budget}
                  value={form.budget}
                  onChange={(event) => updateField("budget", event.target.value as Budget)}
                  className={inputClass}
                >
                  {BUDGET_OPTIONS.map((option) => (
                    <option key={option.value || "none"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor={FIELD_IDS.deliveryPreference} className="block text-sm font-bold text-slate-900">
                オンライン・現地等の希望 <span className="font-normal text-slate-600">（任意）</span>
              </label>
              <select
                id={FIELD_IDS.deliveryPreference}
                value={form.deliveryPreference}
                onChange={(event) =>
                  updateField("deliveryPreference", event.target.value as DeliveryPreference)
                }
                className={inputClass}
              >
                {DELIVERY_OPTIONS.map((option) => (
                  <option key={option.value || "none"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                現地対応は地域・日程・内容を確認して可否をご案内します。
              </p>
            </div>

            <label
              htmlFor={FIELD_IDS.privacyConsent}
              className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-slate-400 bg-slate-50 p-4 text-sm leading-6 text-slate-800"
            >
              <input
                id={FIELD_IDS.privacyConsent}
                type="checkbox"
                checked={form.privacyConsent}
                onChange={(event) => updateField("privacyConsent", event.target.checked)}
                aria-invalid={Boolean(errors.privacyConsent)}
                aria-describedby={describedBy(
                  "privacyConsent",
                  errors,
                  "automation-consult-consent-hint",
                )}
                className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
              />
              <span>
                <span className="font-bold">
                  個人情報の取扱いに同意する <span className="text-red-700">（必須）</span>
                </span>
                <span id="automation-consult-consent-hint" className="mt-1 block">
                  相談への回答と見積案内のために入力内容を利用すること、および
                  <Link
                    href="/privacy"
                    className="mx-1 font-bold underline decoration-2 underline-offset-2"
                  >
                    プライバシーポリシー
                  </Link>
                  を確認しました。
                </span>
                <FieldError field="privacyConsent" errors={errors} />
              </span>
            </label>

            <div className="sr-only" aria-hidden="true">
              <label htmlFor="automation-consult-website">ウェブサイト</label>
              <input
                id="automation-consult-website"
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
          </div>
        )}
      </section>

      {status === "error" && (
        <div
          role="alert"
          className="rounded-xl border-2 border-red-700 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-950"
        >
          {failureMessage}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step === 2 ? (
          <button
            type="button"
            onClick={goToStepOne}
            disabled={!isReady || status === "sending"}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-500 bg-white px-5 py-3 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            前の入力へ戻る
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        {step === 1 ? (
          <button
            type="button"
            onClick={goToStepTwo}
            disabled={!isReady}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            返信先の入力へ進む
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!isReady || status === "sending"}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? (
              <>
                <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                送信中です
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                内容に同意して無料相談を送信
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-sm leading-6 text-slate-600">
        送信後に費用は発生しません。正式見積への同意前に制作・設定を開始することはありません。
      </p>
    </form>
  );
}

export default AutomationConsultForm;

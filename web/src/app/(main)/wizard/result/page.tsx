"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  UserCheck,
  Stethoscope,
  Beaker,
  GraduationCap,
  FileText,
  Banknote,
  ArrowLeft,
  MessageSquareHeart,
  Crown,
  Lock,
  Info,
  Calculator,
  ArrowRight,
} from "lucide-react";
import matrix from "@/data/compliance-matrix.json";
import { PDFPrintHeader, PDFExportButton } from "@/components/wizard/PDFExport";

// compliance-matrix.json の業種ID → 助成金計算機の IndustryType への対応
// 助成金計算機にない業種は最も近いカテゴリにフォールバック。
const INDUSTRY_TO_CALCULATOR: Record<string, string> = {
  construction: "construction",
  manufacturing: "manufacturing",
  transport: "transport",
  healthcare: "healthcare",
  service: "service",
  it: "service",
};

type Condition = {
  industries?: string[];
  minHeadcount?: number;
  maxHeadcount?: number;
  requiresAnyHazard?: string[];
};

type Rule = {
  id: string;
  title?: string;
  name?: string;
  summary?: string;
  purpose?: string;
  amount?: string;
  url?: string;
  operator?: string;
  lawRef?: string;
  frequency?: string;
  duration?: string;
  submitTo?: string;
  deadline?: string;
  note?: string;
  condition: Condition;
};

function evalRule(
  rule: Rule,
  industry: string,
  headcount: number,
  hazards: string[]
): boolean {
  const c = rule.condition;
  if (c.industries && c.industries.length > 0 && !c.industries.includes(industry)) {
    return false;
  }
  if (typeof c.minHeadcount === "number" && headcount < c.minHeadcount) {
    return false;
  }
  if (typeof c.maxHeadcount === "number" && headcount > c.maxHeadcount) {
    return false;
  }
  if (c.requiresAnyHazard && c.requiresAnyHazard.length > 0) {
    const hit = c.requiresAnyHazard.some((h) => hazards.includes(h));
    if (!hit) return false;
  }
  return true;
}

function ResultView() {
  const sp = useSearchParams();
  const industry = sp.get("industry") ?? "";
  const size = sp.get("size") ?? "";
  const hazards = (sp.get("hazards") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const industryData = matrix.industries.find((i) => i.id === industry);
  const sizeData = matrix.sizes.find((s) => s.id === size);
  const headcount = sizeData?.min ?? 0;
  const isInputValid = !!industryData && !!sizeData;

  const appointments = matrix.appointments.filter((r) =>
    evalRule(r as Rule, industry, headcount, hazards)
  );
  const healthChecks = matrix.healthChecks.filter((r) =>
    evalRule(r as Rule, industry, headcount, hazards)
  );
  const envMeasurements = matrix.envMeasurements.filter((r) =>
    evalRule(r as Rule, industry, headcount, hazards)
  );
  const specialEducations = matrix.specialEducations.filter((r) =>
    evalRule(r as Rule, industry, headcount, hazards)
  );
  const documents = matrix.documents.filter((r) =>
    evalRule(r as Rule, industry, headcount, hazards)
  );
  const subsidies = matrix.subsidies.filter((r) =>
    evalRule(r as Rule, industry, headcount, hazards)
  );

  if (!isInputValid) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="text-sm font-bold">入力情報が不足しています</p>
          <p className="mt-2 text-xs">
            業種と規模を選択してから診断結果をご確認ください。
          </p>
          <Link
            href="/wizard"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            ウィザードに戻る
          </Link>
        </div>
      </main>
    );
  }

  const hazardLabels = hazards
    .map((id) => matrix.hazards.find((h) => h.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const calculatorIndustry = INDUSTRY_TO_CALCULATOR[industry] ?? "other";
  const calculatorEmployees = sizeData.min ?? 1;
  const calculatorHref = `/subsidies/calculator?industry=${calculatorIndustry}&employees=${calculatorEmployees}`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8 print:max-w-none print:px-0">
      {/* PDF用ヘッダー（印刷時のみ表示） */}
      <PDFPrintHeader
        industryLabel={industryData.label}
        sizeLabel={sizeData.label}
        hazardLabels={hazardLabels}
      />

      {/* ヘッダー（画面表示用） */}
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">
              診断結果
            </h1>
            <p className="mt-0.5 text-sm leading-snug text-slate-500">
              貴事業場の安衛法上の主な義務をまとめました
            </p>
          </div>
        </div>
      </header>

      {/* 入力サマリー */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          入力内容
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold text-slate-500">業種</dt>
            <dd className="mt-1 text-sm font-bold text-slate-900">
              {industryData.label}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-slate-500">規模</dt>
            <dd className="mt-1 text-sm font-bold text-slate-900">
              {sizeData.label}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-slate-500">取扱物質・作業</dt>
            <dd className="mt-1 text-sm font-bold text-slate-900">
              {hazards.length === 0
                ? "該当なし"
                : hazards
                    .map((id) => matrix.hazards.find((h) => h.id === id)?.label)
                    .filter(Boolean)
                    .join(" / ")}
            </dd>
          </div>
        </dl>
      </section>

      {/* 必要な選任 */}
      <ResultSection
        icon={UserCheck}
        iconColor="bg-emerald-600"
        title="必要な選任"
        emptyMessage="この規模・業種では選任義務はありません（10人未満等）"
        items={appointments.map((r) => ({
          id: r.id,
          title: r.title ?? "",
          summary: r.summary,
          lawRef: r.lawRef,
          deadline: r.deadline,
          note: r.note,
        }))}
      />

      {/* 必要な健診 */}
      <ResultSection
        icon={Stethoscope}
        iconColor="bg-blue-600"
        title="必要な健康診断"
        emptyMessage="該当する健診はありません"
        items={healthChecks.map((r) => ({
          id: r.id,
          title: r.title ?? "",
          summary: r.summary,
          lawRef: r.lawRef,
          deadline: r.frequency,
          note: r.note,
        }))}
      />

      {/* 作業環境測定 */}
      {envMeasurements.length > 0 && (
        <ResultSection
          icon={Beaker}
          iconColor="bg-amber-500"
          title="必要な作業環境測定"
          emptyMessage=""
          items={envMeasurements.map((r) => ({
            id: r.id,
            title: r.title ?? "",
            summary: r.summary,
            lawRef: r.lawRef,
            deadline: r.frequency,
            note: r.note,
          }))}
        />
      )}

      {/* 特別教育 */}
      {specialEducations.length > 0 && (
        <ResultSection
          icon={GraduationCap}
          iconColor="bg-violet-600"
          title="必要な特別教育・技能講習"
          emptyMessage=""
          items={specialEducations.map((r) => ({
            id: r.id,
            title: r.title ?? "",
            summary: r.summary,
            lawRef: r.lawRef,
            deadline: r.duration,
            note: undefined,
          }))}
        />
      )}

      {/* 提出書類 */}
      <ResultSection
        icon={FileText}
        iconColor="bg-slate-700"
        title="提出書類（労基署・所轄署）"
        emptyMessage="現時点で必須となる定期提出書類はありません"
        items={documents.map((r) => ({
          id: r.id,
          title: r.title ?? "",
          summary: r.submitTo ? `提出先：${r.submitTo}` : undefined,
          lawRef: r.lawRef,
          deadline: r.deadline,
          note: r.note,
        }))}
      />

      {/* 助成金候補 */}
      {subsidies.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
              <Banknote className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              助成金候補
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              {subsidies.length}件
            </span>
          </div>
          <ul className="space-y-3">
            {subsidies.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
              >
                <p className="text-sm font-bold text-slate-900">{s.name}</p>
                <p className="mt-1 text-xs text-slate-600">{s.purpose}</p>
                <dl className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-slate-700 sm:grid-cols-2">
                  <div>
                    <dt className="inline font-semibold text-slate-500">補助額：</dt>
                    <dd className="inline">{s.amount}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-slate-500">所管：</dt>
                    <dd className="inline">{s.operator}</dd>
                  </div>
                </dl>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                  >
                    公式ページを見る →
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-400">
            ※ 助成金は年度・予算により公募状況が変動します。申請前に必ず最新の公募要領をご確認ください。
          </p>
        </section>
      )}

      {/* これに使える助成金は…（計算機への一気通貫導線） */}
      <section className="mt-8 print:hidden">
        <Link
          href={calculatorHref}
          className="flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 shadow-sm transition hover:border-amber-400 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Calculator className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                これに使える助成金は…
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 sm:text-base">
                {industryData.label}・{sizeData.label}の条件で支給額を試算する
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                エイジフレンドリー補助金・人材確保等支援助成金など、申請可能な制度と概算支給額を1分で確認できます。
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm">
            助成金を試算する
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      </section>

      {/* アクション（CTA） */}
      <section className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3 print:hidden">
        <Link
          href="/contact"
          className="flex flex-col rounded-2xl border border-emerald-300 bg-emerald-600 p-5 text-white shadow-sm transition hover:bg-emerald-700"
        >
          <MessageSquareHeart className="h-5 w-5" />
          <p className="mt-2 text-sm font-bold">無料相談を申し込む</p>
          <p className="mt-1 text-[11px] text-emerald-100">
            労働安全コンサルタントが個別事案に回答
          </p>
        </Link>
        <PDFExportButton />
        <Link
          href="/pricing"
          className="flex flex-col rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm transition hover:bg-amber-100"
        >
          <Crown className="h-5 w-5 text-amber-700" />
          <p className="mt-2 text-sm font-bold text-amber-900">
            Standard契約してチェックリスト保存
          </p>
          <p className="mt-1 text-[11px] text-amber-800">
            診断結果を保存・更新通知・複数事業場管理
          </p>
        </Link>
      </section>

      {/* 戻る・注意書き */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/wizard"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          条件を変更する
        </Link>
        <p className="text-[11px] text-slate-400">
          診断ロジックは安衛法のあらまし（{matrix.lastUpdated}時点）に準拠
        </p>
      </div>

      <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-6 text-slate-500">
        <Info className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
        本診断は主要な選任義務・健診・測定・教育・提出書類を機械的に判定するものです。
        個別の事案（出向・派遣・複数事業場・特殊作業条件等）については、
        所轄労働基準監督署または労働安全コンサルタントへご相談ください。
      </p>
    </main>
  );
}

type ResultItem = {
  id: string;
  title: string;
  summary?: string;
  lawRef?: string;
  deadline?: string;
  note?: string;
};

function ResultSection({
  icon: Icon,
  iconColor,
  title,
  items,
  emptyMessage,
}: {
  icon: typeof ShieldCheck;
  iconColor: string;
  title: string;
  items: ResultItem[];
  emptyMessage: string;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
        {items.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
            {items.length}件
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
          <Lock className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          {emptyMessage}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-bold text-slate-900">{item.title}</p>
              {item.summary && (
                <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
              )}
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                {item.lawRef && (
                  <div>
                    <dt className="inline font-semibold text-slate-500">根拠：</dt>
                    <dd className="inline">{item.lawRef}</dd>
                  </div>
                )}
                {item.deadline && (
                  <div>
                    <dt className="inline font-semibold text-slate-500">期限・頻度：</dt>
                    <dd className="inline">{item.deadline}</dd>
                  </div>
                )}
              </dl>
              {item.note && (
                <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] leading-5 text-slate-500">
                  {item.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function WizardResultPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl px-4 py-10 text-center text-sm text-slate-500">
          診断結果を読み込み中...
        </main>
      }
    >
      <ResultView />
    </Suspense>
  );
}

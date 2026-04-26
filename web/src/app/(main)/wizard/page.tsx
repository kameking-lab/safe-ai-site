"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ListChecks,
  ArrowRight,
  ChevronLeft,
  Check,
  Building2,
  Users,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import matrix from "@/data/compliance-matrix.json";

const STEPS = [
  { id: 1, label: "業種", icon: Building2 },
  { id: 2, label: "規模", icon: Users },
  { id: 3, label: "取扱物質・作業", icon: AlertTriangle },
  { id: 4, label: "結果確認", icon: Sparkles },
] as const;

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [industry, setIndustry] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [hazards, setHazards] = useState<string[]>([]);

  const canProceed =
    (step === 1 && industry !== "") ||
    (step === 2 && size !== "") ||
    step === 3 ||
    step === 4;

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const toggleHazard = (id: string) => {
    setHazards((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  const submit = () => {
    const params = new URLSearchParams({
      industry,
      size,
      hazards: hazards.join(","),
    });
    router.push(`/wizard/result?${params.toString()}`);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* ヘッダー */}
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 shadow-sm">
            <ListChecks className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">
                コンプライアンス診断
              </h1>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                NEW
              </span>
            </div>
            <p className="mt-0.5 text-sm leading-snug text-slate-500">
              業種・規模・取扱物質を選ぶだけで、必要な選任・健診・提出書類を自動表示
            </p>
          </div>
        </div>
      </header>

      {/* ステップインジケータ */}
      <ol
        className="mt-6 grid grid-cols-4 gap-2"
        aria-label="ウィザードステップ"
      >
        {STEPS.map((s) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <li
              key={s.id}
              className={`flex flex-col items-center rounded-xl border p-2 text-center sm:p-3 ${
                active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : done
                    ? "border-emerald-200 bg-white text-emerald-700"
                    : "border-slate-200 bg-white text-slate-400"
              }`}
              aria-current={active ? "step" : undefined}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 sm:text-sm ${
                  active
                    ? "bg-emerald-600 text-white"
                    : done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className="mt-1 text-[11px] font-semibold sm:text-xs">
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* ステップ本体 */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {step === 1 && (
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              ステップ1：業種を選んでください
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              安衛法の業種区分により、必要な選任義務・統括安全衛生管理者の閾値が変わります
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {matrix.industries.map((opt) => {
                const selected = industry === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIndustry(opt.id)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/40"
                    }`}
                    aria-pressed={selected}
                  >
                    <span>{opt.label}</span>
                    {selected && <Check className="h-4 w-4 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              ステップ2：事業場の規模を選んでください
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              常時使用する労働者数（パート・アルバイト含む）。事業場ごとに判定します
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {matrix.sizes.map((opt) => {
                const selected = size === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSize(opt.id)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/40"
                    }`}
                    aria-pressed={selected}
                  >
                    <span>{opt.label}</span>
                    {selected && <Check className="h-4 w-4 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              ステップ3：取扱物質・作業（複数選択可）
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              該当するものをすべて選択してください。該当なしの場合はそのまま「次へ」
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-2 text-xs font-bold text-slate-500">
                  化学物質・粉じん
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {matrix.hazards
                    .filter((h) => h.category === "chemical")
                    .map((opt) => {
                      const selected = hazards.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleHazard(opt.id)}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                            selected
                              ? "border-amber-500 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50/40"
                          }`}
                          aria-pressed={selected}
                        >
                          <span>{opt.label}</span>
                          {selected && <Check className="h-4 w-4 text-amber-600" />}
                        </button>
                      );
                    })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold text-slate-500">
                  危険作業
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {matrix.hazards
                    .filter((h) => h.category === "work")
                    .map((opt) => {
                      const selected = hazards.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleHazard(opt.id)}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                            selected
                              ? "border-blue-500 bg-blue-50 text-blue-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
                          }`}
                          aria-pressed={selected}
                        >
                          <span>{opt.label}</span>
                          {selected && <Check className="h-4 w-4 text-blue-600" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              ステップ4：入力内容を確認
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              この内容で診断結果を表示します
            </p>
            <dl className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50 text-sm">
              <div className="flex items-start gap-3 px-4 py-3">
                <dt className="w-24 shrink-0 font-semibold text-slate-500">業種</dt>
                <dd className="flex-1 font-semibold text-slate-900">
                  {matrix.industries.find((i) => i.id === industry)?.label ?? "未選択"}
                </dd>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <dt className="w-24 shrink-0 font-semibold text-slate-500">規模</dt>
                <dd className="flex-1 font-semibold text-slate-900">
                  {matrix.sizes.find((s) => s.id === size)?.label ?? "未選択"}
                </dd>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <dt className="w-24 shrink-0 font-semibold text-slate-500">取扱物質・作業</dt>
                <dd className="flex-1 font-semibold text-slate-900">
                  {hazards.length === 0
                    ? "なし"
                    : hazards
                        .map((id) => matrix.hazards.find((h) => h.id === id)?.label)
                        .filter(Boolean)
                        .join(" / ")}
                </dd>
              </div>
            </dl>
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-6 text-emerald-900">
              <p className="font-semibold">診断結果について</p>
              <p className="mt-1">
                本診断は労働安全衛生法・同施行令・関連規則の主要な選任義務・健診・測定・教育・提出書類を
                厚労省「労働安全衛生法のあらまし」に基づき機械的に判定します。AIによる生成ではありません。
                個別の事案については労働基準監督署または労働安全コンサルタントにご確認ください。
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ナビゲーションボタン */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={step === 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          戻る
        </button>
        {step < 4 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canProceed}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            次へ
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!industry || !size}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <ShieldCheck className="h-4 w-4" />
            診断結果を見る
          </button>
        )}
      </div>

      {/* 補足情報 */}
      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <h2 className="font-bold text-slate-900">この診断でわかること</h2>
        <ul className="mt-3 space-y-1 text-xs leading-6">
          <li>● 安全管理者・衛生管理者・産業医・作業主任者など必要な選任</li>
          <li>● 一般定期健診・特殊健診・じん肺健診など必要な健康診断</li>
          <li>● 有機溶剤・特化物・粉じん・石綿の作業環境測定義務</li>
          <li>● フルハーネス・フォーク・玉掛け・クレーンなどの特別教育</li>
          <li>● 労基署への提出書類と提出期限</li>
          <li>● 中小企業向けの助成金候補</li>
        </ul>
        <p className="mt-3 text-[11px] text-slate-400">
          根拠：労働安全衛生法・同施行令・有機則・特化則・粉じん則・石綿則・じん肺法
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/laws"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            法改正情報
          </Link>
          <Link
            href="/subsidies"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            助成金ガイド
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            個別相談
          </Link>
        </div>
      </section>
    </main>
  );
}

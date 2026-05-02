"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Star, RefreshCw } from "lucide-react";
import { EQUIPMENT_CATEGORIES, getCategoryById, type RefineAnswers } from "@/config/equipment-categories";
import { recommendItems } from "@/lib/equipment-finder/recommendations";
import { trackAffiliateClick } from "@/lib/track-events";

type Phase = "category" | "refine" | "result";

export function EquipmentFinderClient() {
  const [phase, setPhase] = useState<Phase>("category");
  const [categoryId, setCategoryId] = useState<string>("");
  const [answers, setAnswers] = useState<RefineAnswers>({});

  const category = useMemo(
    () => (categoryId ? getCategoryById(categoryId) : undefined),
    [categoryId]
  );

  const recommended = useMemo(() => {
    if (phase !== "result" || !category) return [];
    return recommendItems(category, answers, 12);
  }, [phase, category, answers]);

  function chooseCategory(id: string) {
    setCategoryId(id);
    setAnswers({});
    setPhase("refine");
  }

  function setAnswer(qId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  function reset() {
    setPhase("category");
    setCategoryId("");
    setAnswers({});
  }

  if (phase === "category") {
    return (
      <section>
        <div className="mb-3">
          <p className="text-xs font-bold text-emerald-700">STEP 1</p>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">保護具の種類を選んでください</h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">12カテゴリから選択 → 種類別に3〜6問で絞り込み → おすすめ商品を表示します。</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {EQUIPMENT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => chooseCategory(c.id)}
              className="group flex flex-col items-start gap-1 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"
            >
              <span className="text-2xl" aria-hidden>
                {c.icon}
              </span>
              <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">{c.label}</span>
              <span className="text-[11px] leading-snug text-slate-500">{c.description}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (phase === "refine" && category) {
    const allAnswered = category.refineQuestions
      .filter((q) => !q.optional)
      .every((q) => answers[q.id]);
    return (
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPhase("category")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            種類選択へ戻る
          </button>
          <div className="text-right">
            <p className="text-xs font-bold text-emerald-700">STEP 2</p>
            <p className="text-sm font-bold text-slate-900">
              {category.icon} {category.label} の絞り込み
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {category.refineQuestions.map((q, idx) => (
            <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-500">
                Q{idx + 1} / {category.refineQuestions.length}
                {q.optional ? "（任意）" : ""}
              </p>
              <h3 className="mt-1 text-sm font-bold text-slate-900 sm:text-base">{q.label}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer(q.id, opt.value)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold sm:text-sm ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50"
                      }`}
                      aria-pressed={selected}
                    >
                      <span>{opt.label}</span>
                      {opt.hint && <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{opt.hint}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setPhase("result")}
            disabled={!allAnswered}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            おすすめ商品を見る
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  }

  if (phase === "result" && category) {
    return (
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-emerald-700">STEP 3 / RESULT</p>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              {category.icon} {category.label} のおすすめ
            </h2>
            <p className="text-xs text-slate-500">回答に基づきスコアリング上位 {recommended.length} 件を表示</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPhase("refine")}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              絞り込みを変更
            </button>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              最初から
            </button>
          </div>
        </div>

        {recommended.length === 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            条件に合う商品が見つかりませんでした。「絞り込みを変更」で「問わない」に設定してください。
          </div>
        )}

        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {recommended.map((item) => (
            <li
              key={item.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold tracking-widest text-emerald-700">
                    {item.maker}
                  </p>
                  <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900">{item.name}</h3>
                  {item.subCategory && (
                    <p className="mt-1 text-[11px] text-slate-500">{item.subCategory}</p>
                  )}
                  {item.spec && (
                    <p className="mt-1 inline-block rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                      {item.spec}
                    </p>
                  )}
                </div>
                {item.score > 0 && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    マッチ {item.score}pt
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                {item.priceLabel && <span className="font-bold text-slate-800">{item.priceLabel}</span>}
                {item.rating !== undefined && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600">
                    <Star className="h-3 w-3 fill-current" />
                    {item.rating.toFixed(1)}
                    {item.reviewCount !== undefined && (
                      <span className="text-slate-500">（{item.reviewCount}件）</span>
                    )}
                  </span>
                )}
              </div>

              {item.recommendReason && (
                <p className="mt-2 text-xs leading-5 text-slate-700">{item.recommendReason}</p>
              )}

              {item.matchedAnswers.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {item.matchedAnswers.map((m) => (
                    <li
                      key={m}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                    >
                      ✓ {m}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {item.affiliate?.amazonUrl && (
                  <a
                    href={item.affiliate.amazonUrl}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    onClick={() =>
                      trackAffiliateClick({
                        productId: item.id,
                        productName: item.name,
                        network: "amazon",
                        url: item.affiliate?.amazonUrl ?? "",
                        page: "/equipment-finder",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
                  >
                    Amazonで見る →
                  </a>
                )}
                {item.affiliate?.rakutenUrl && (
                  <a
                    href={item.affiliate.rakutenUrl}
                    target="_blank"
                    rel="sponsored noopener noreferrer"
                    onClick={() =>
                      trackAffiliateClick({
                        productId: item.id,
                        productName: item.name,
                        network: "rakuten",
                        url: item.affiliate?.rakutenUrl ?? "",
                        page: "/equipment-finder",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600"
                  >
                    楽天で見る →
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return null;
}

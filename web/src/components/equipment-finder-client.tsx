"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Star, RefreshCw, FlaskConical } from "lucide-react";
import { EQUIPMENT_CATEGORIES, getCategoryById, type RefineAnswers } from "@/config/equipment-categories";
import { recommendItems } from "@/lib/equipment-finder/recommendations";
import { trackAffiliateClick } from "@/lib/track-events";
import { findChemicalEquipmentProfile } from "@/lib/chemical-equipment-mapping";

type Phase = "category" | "refine" | "result";

type IncomingContext =
  | {
      kind: "chemical";
      chemicalName: string;
      hazards: string[];
      categories: string[];
      gasMaskAbsorber?: "有機ガス" | "ハロゲン" | "硫化水素" | "アンモニア";
    }
  | {
      kind: "accident";
      accidentTitle: string;
      categories: string[];
    }
  | null;

export function EquipmentFinderClient() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("category");
  const [categoryId, setCategoryId] = useState<string>("");
  const [answers, setAnswers] = useState<RefineAnswers>({});
  const appliedContextRef = useRef<string | null>(null);

  // 受信コンテキストの解析（化学物質RAから or 事故DBから）
  const incoming: IncomingContext = useMemo(() => {
    if (!searchParams) return null;
    const chemical = searchParams.get("chemical");
    if (chemical) {
      const profile = findChemicalEquipmentProfile(chemical);
      const hazardsParam = searchParams.get("hazards");
      const categoriesParam = searchParams.get("categories");
      const hazards = hazardsParam
        ? hazardsParam.split(",").filter(Boolean)
        : profile?.hazards ?? [];
      const categories = categoriesParam
        ? categoriesParam.split(",").filter(Boolean)
        : profile?.recommendedCategories ?? [];
      return {
        kind: "chemical",
        chemicalName: chemical,
        hazards,
        categories,
        gasMaskAbsorber: profile?.gasMaskAbsorber,
      };
    }
    const fromAccident = searchParams.get("fromAccident");
    if (fromAccident) {
      const categoriesParam = searchParams.get("categories");
      const categories = categoriesParam ? categoriesParam.split(",").filter(Boolean) : [];
      return { kind: "accident", accidentTitle: fromAccident, categories };
    }
    return null;
  }, [searchParams]);

  // クエリで categories が指定されていれば最初のカテゴリを自動選択して refine へ
  useEffect(() => {
    if (!incoming) return;
    if (appliedContextRef.current === JSON.stringify(incoming)) return;
    if (phase !== "category") return;
    const first = incoming.categories.find((c) => getCategoryById(c));
    if (!first) return;
    appliedContextRef.current = JSON.stringify(incoming);
    // 化学物質由来で gasMaskAbsorber が指定されていれば防毒マスクの初期回答を入れる
    const initialAnswers: RefineAnswers =
      incoming.kind === "chemical" &&
      incoming.gasMaskAbsorber &&
      first === "gas-mask"
        ? { gasType: incoming.gasMaskAbsorber }
        : {};
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 受信クエリパラメータからの初期化は副作用扱いが妥当
    setCategoryId(first);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 同上
    setAnswers(initialAnswers);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 同上
    setPhase("refine");
  }, [incoming, phase]);

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

  const contextBanner = incoming ? <IncomingContextBanner ctx={incoming} /> : null;

  if (phase === "category") {
    const recommendedSet = new Set(incoming?.categories ?? []);
    return (
      <section>
        {contextBanner}
        <div className="mb-3">
          <p className="text-xs font-bold text-emerald-700">STEP 1</p>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">保護具の種類を選んでください</h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">12カテゴリから選択 → 種類別に3〜6問で絞り込み → おすすめ商品を表示します。</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {EQUIPMENT_CATEGORIES.map((c) => {
            const isRecommended = recommendedSet.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => chooseCategory(c.id)}
                className={`group relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isRecommended
                    ? "border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-200 hover:border-emerald-500"
                    : "border-slate-200 bg-white hover:border-emerald-400"
                }`}
              >
                {isRecommended && (
                  <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    推奨
                  </span>
                )}
                <span className="text-2xl" aria-hidden>
                  {c.icon}
                </span>
                <span className={`text-sm font-bold group-hover:text-emerald-700 ${isRecommended ? "text-emerald-800" : "text-slate-900"}`}>
                  {c.label}
                </span>
                <span className="text-[11px] leading-snug text-slate-500">{c.description}</span>
              </button>
            );
          })}
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
        {contextBanner}
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
        {contextBanner}
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

function IncomingContextBanner({ ctx }: { ctx: NonNullable<IncomingContext> }) {
  if (ctx.kind === "chemical") {
    return (
      <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-blue-900">
              「{ctx.chemicalName}」の取扱いに必要な保護具
            </p>
            <p className="mt-0.5 text-[11px] text-blue-900/80">
              化学物質リスクアセスメントから連携。推奨カテゴリにバッジを付けています。
            </p>
            {ctx.hazards.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1">
                {ctx.hazards.map((h) => (
                  <li
                    key={h}
                    className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-800 ring-1 ring-blue-200"
                  >
                    ⚠ {h}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 sm:p-4">
      <p className="text-xs font-bold text-rose-900">
        「{ctx.accidentTitle}」の再発防止に必要な保護具
      </p>
      <p className="mt-0.5 text-[11px] text-rose-900/80">
        事故DBから連携。推奨カテゴリにバッジを付けています。
      </p>
    </div>
  );
}

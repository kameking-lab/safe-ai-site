"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import equipmentDb from "@/data/safety-equipment-db.json";
import { recommendEquipment, type ScoredEquipment } from "@/lib/equipment-recommendation";
import { trackAffiliateClick } from "@/lib/track-events";

const hazardLabels = equipmentDb.hazardLabels as Record<string, string>;
const industryLabels = equipmentDb.industryLabels as Record<string, string>;

const SEASONS = [
  { id: "all", label: "通年" },
  { id: "summer", label: "夏（5〜9月）" },
  { id: "winter", label: "冬（11〜3月）" },
] as const;

const BUDGETS = [
  { id: "low", label: "1万円以下", cap: 10000 },
  { id: "mid", label: "1万〜5万円", cap: 50000 },
  { id: "high", label: "5万円以上", cap: 500000 },
  { id: "any", label: "予算問わず", cap: undefined as number | undefined },
] as const;

type Step = 1 | 2 | 3 | 4;

export function EquipmentFinderClient() {
  const [step, setStep] = useState<Step>(1);
  const [industry, setIndustry] = useState<string>("");
  const [hazard, setHazard] = useState<string>("");
  const [season, setSeason] = useState<string>("all");
  const [budget, setBudget] = useState<string>("any");

  const result = useMemo(() => {
    if (step !== 4) return null;
    const budgetCfg = BUDGETS.find((b) => b.id === budget) ?? BUDGETS[3];
    return recommendEquipment({
      industry: industry || undefined,
      hazard: hazard || undefined,
      season,
      budgetCap: budgetCfg.cap,
    });
  }, [step, industry, hazard, season, budget]);

  function reset() {
    setStep(1);
    setIndustry("");
    setHazard("");
    setSeason("all");
    setBudget("any");
  }

  return (
    <div className="space-y-4">
      {/* プログレス */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-emerald-500" : "bg-slate-200"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500">Q1 / 3</p>
          <h2 className="mt-1 text-base font-bold text-slate-900">業種を選んでください</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(industryLabels).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setIndustry(id);
                  setStep(2);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500">Q2 / 3</p>
          <h2 className="mt-1 text-base font-bold text-slate-900">主な危険源は？</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(hazardLabels)
              .filter(([id]) => id !== "all")
              .map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setHazard(id);
                    setStep(3);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
                >
                  {label}
                </button>
              ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-3 text-xs text-slate-500 underline"
          >
            ← 業種を選び直す
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500">Q3 / 3</p>
          <h2 className="mt-1 text-base font-bold text-slate-900">季節と予算は？</h2>

          <div className="mt-3">
            <p className="text-xs font-bold text-slate-700">季節</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeason(s.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    season === s.id
                      ? "border-emerald-500 bg-emerald-600 text-white"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold text-slate-700">予算（1点あたり）</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBudget(b.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    budget === b.id
                      ? "border-emerald-500 bg-emerald-600 text-white"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              結果を見る →
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              ← 危険源を選び直す
            </button>
          </div>
        </section>
      )}

      {step === 4 && result && (
        <section className="space-y-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
            <p className="text-xs font-bold text-emerald-800">レコメンド条件</p>
            <p className="mt-1 text-xs text-slate-700">
              業種: <strong>{industryLabels[industry] ?? "未指定"}</strong> ／ 危険源:{" "}
              <strong>{hazardLabels[hazard] ?? "未指定"}</strong> ／ 季節:{" "}
              <strong>{SEASONS.find((s) => s.id === season)?.label}</strong> ／ 予算:{" "}
              <strong>{BUDGETS.find((b) => b.id === budget)?.label}</strong>
            </p>
            <p className="mt-1 text-[11px] text-emerald-900">
              候補 {result.totalCandidates.toLocaleString()} 点から、4軸スコア（業種30+危険源30+季節15+予算15+評価10）で上位を提示。
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 rounded-md border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              条件を変更する
            </button>
          </div>

          {result.top.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              該当商品が見つかりませんでした。条件をゆるめて再検索してください。
            </div>
          ) : (
            <>
              <h3 className="text-sm font-bold text-slate-900">⭐ AIの一推し（上位5点）</h3>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {result.top.map((it) => (
                  <RecommendCard key={it.id} item={it} highlight />
                ))}
              </ul>

              {result.others.length > 0 && (
                <>
                  <h3 className="mt-4 text-sm font-bold text-slate-900">そのほかのおすすめ（10点）</h3>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {result.others.map((it) => (
                      <RecommendCard key={it.id} item={it} />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          <p className="text-[11px] text-slate-500">
            ※ アフィリエイトリンク（もしも経由）。発生報酬は研究プロジェクト運営費（事故DB拡充・AI推論コスト・法令データ更新）に充てます。
          </p>

          {/* /goods への誘導: 1,050点の全商品カタログを案内 */}
          <div className="mt-3 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-900">📚 もっと商品を比較したい方へ</p>
              <p className="mt-1 text-xs text-slate-700">
                1,050点超のカテゴリ別カタログで、墜落制止・防塵マスク・ヘルメットなどを横断検索できます。
              </p>
            </div>
            <Link
              href="/goods"
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 sm:mt-0 sm:shrink-0"
            >
              安全用品カタログを開く →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function RecommendCard({ item, highlight }: { item: ScoredEquipment; highlight?: boolean }) {
  return (
    <li
      className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm ${
        highlight ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">
          {item.categoryIcon}
        </span>
        <span className="text-[10px] font-bold text-slate-500">{item.categoryName}</span>
        <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          {item.score}/100
        </span>
      </div>
      <Link href={`/equipment/${item.id}`} className="mt-2 text-sm font-bold text-slate-900 hover:underline">
        {item.name}
      </Link>
      <p className="mt-1 text-[11px] text-slate-600">{item.spec}</p>
      {item.recommendReason ? (
        <p className="mt-1 text-[11px] leading-5 text-slate-700">{item.recommendReason}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-xs font-bold text-emerald-700">{item.priceLabel}</p>
        {typeof item.rating === "number" ? (
          <span className="text-[11px] text-amber-700">★ {item.rating.toFixed(1)}</span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={item.affiliate.amazonUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="rounded-md bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600"
          onClick={() =>
            trackAffiliateClick({
              productId: item.id,
              productName: item.name,
              network: "amazon",
              url: item.affiliate.amazonUrl,
              page: "/equipment-finder",
            })
          }
        >
          Amazonで見る
        </a>
        <a
          href={item.affiliate.rakutenUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="rounded-md bg-rose-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-600"
          onClick={() =>
            trackAffiliateClick({
              productId: item.id,
              productName: item.name,
              network: "rakuten",
              url: item.affiliate.rakutenUrl,
              page: "/equipment-finder",
            })
          }
        >
          楽天で見る
        </a>
        <Link
          href={`/equipment/${item.id}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
        >
          詳細
        </Link>
      </div>
    </li>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Pin } from "lucide-react";
import { searchMhlwSimilarStrict, getMhlwDeathsTotal, type ScoredMhlwCase } from "@/lib/mhlw-similar-cases";
import { loadProfile, INDUSTRY_LABELS, type CompanyProfile } from "@/lib/company-profile";
import type { AccidentCase } from "@/lib/types/domain";

// C-1: 事故データセット（生 約340KB）を静的 import すると /accidents・/laws の
// ページバンドルに同梱されて LCP を悪化させるため、必要時に dynamic import する。
async function loadAccidentCases(): Promise<AccidentCase[]> {
  const mod = await import("@/data/mock/accident-cases");
  return mod.getAccidentCasesDataset();
}

const INDUSTRIES_FOR_PROFILE: Record<string, string[]> = {
  construction: ["建設", "足場", "高所", "型枠"],
  manufacturing: ["製造", "プレス", "機械", "溶接"],
  healthcare: ["医療", "介護"],
  transport: ["運輸", "トラック", "荷役"],
  it: ["情報", "サーバー"],
  forestry: ["林業", "伐木"],
  logistics: ["倉庫", "ピッキング"],
  other: [],
};

function buildProfileQuery(profile: CompanyProfile): string {
  const parts: string[] = [];
  parts.push(...(INDUSTRIES_FOR_PROFILE[profile.industry] ?? []));
  parts.push(...profile.machines.slice(0, 3));
  parts.push(...profile.chemicals.slice(0, 3));
  parts.push(...profile.workKeywords.slice(0, 3));
  return parts.filter(Boolean).join(" ");
}

function CrossTab() {
  const [all, setAll] = useState<AccidentCase[]>([]);
  // C-1: クロス集計はファーストビューの下にあるため、マウント直後ではなく
  // セクションが画面に近づいた時にデータチャンク(生約340KB)をロードする。
  // IntersectionObserver 非対応環境では従来どおり即ロードにフォールバック。
  const rootRef = useRef<HTMLElement | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  useEffect(() => {
    if (nearViewport) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // IntersectionObserver 非対応環境のみの即ロードフォールバック（1回きり）
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNearViewport(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNearViewport(true);
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nearViewport]);
  useEffect(() => {
    if (!nearViewport) return;
    let active = true;
    void loadAccidentCases().then((cases) => {
      if (active) setAll(cases);
    });
    return () => {
      active = false;
    };
  }, [nearViewport]);
  // 業種 × 事故型 のクロス集計
  const matrix = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    const types = new Set<string>();
    const cats = new Set<string>();
    for (const c of all) {
      cats.add(c.workCategory);
      const t = c.type ?? "未分類";
      types.add(t);
      const row = map.get(c.workCategory) ?? new Map();
      row.set(t, (row.get(t) ?? 0) + 1);
      map.set(c.workCategory, row);
    }
    return {
      categories: Array.from(cats).sort(),
      types: Array.from(types).sort(),
      counts: map,
    };
  }, [all]);

  return (
    <section ref={rootRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">業種 × 事故型 クロス集計（収録事例ベース）</h3>
      <p className="mt-1 text-[11px] text-slate-500">
        サイト収録の{all.length}件を業種と事故型の2軸で集計。クリックで該当条件のフィルタへ。
      </p>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="border-b border-slate-200 bg-slate-50 px-2 py-1 text-left">業種＼事故型</th>
              {matrix.types.map((t) => (
                <th key={t} className="border-b border-slate-200 bg-slate-50 px-2 py-1 text-center">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.categories.map((cat) => (
              <tr key={cat}>
                <th className="border-b border-slate-100 px-2 py-1 text-left font-semibold text-slate-700">
                  {cat}
                </th>
                {matrix.types.map((t) => {
                  const n = matrix.counts.get(cat)?.get(t) ?? 0;
                  return (
                    <td
                      key={t}
                      className={`border-b border-slate-100 px-2 py-1 text-center ${
                        n > 0 ? "bg-amber-50/60 font-bold text-amber-800" : "text-slate-300"
                      }`}
                    >
                      {n || "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * MHLW 死亡災害ケースに「最も近い」サイト収録事例（詳細ページあり）を探す。
 * 段階的フォールバック: 事故型一致 → 業種一致 → 説明テキスト部分一致 → 業種カテゴリ近接 → 任意の1件。
 * Top5 カードを必ず詳細ページに遷移可能にするため、null を返さず常に1件返す。
 */
function findRelatedCuratedCase(
  mhlw: ScoredMhlwCase,
  curated: AccidentCase[]
): { case: AccidentCase; matchLevel: "type" | "industry" | "keyword" | "loose" | "fallback" } | null {
  if (curated.length === 0) return null;

  // 1. 事故型 厳密一致
  if (mhlw.type) {
    const byType = curated.find((c) => c.type && mhlw.type?.includes(c.type.slice(0, 2)));
    if (byType) return { case: byType, matchLevel: "type" };
  }

  // 2. 業種 厳密一致
  if (mhlw.industry) {
    const byIndustry = curated.find((c) => c.workCategory && mhlw.industry?.includes(c.workCategory));
    if (byIndustry) return { case: byIndustry, matchLevel: "industry" };
  }

  // 3. 事故説明テキストとサマリーのキーワード部分一致
  if (mhlw.description) {
    const tokens = mhlw.description
      .replace(/[、。\s]+/g, " ")
      .split(" ")
      .filter((t) => t.length >= 2)
      .slice(0, 6);
    const byKeyword = curated.find((c) =>
      tokens.some((t) => c.summary.includes(t) || c.title.includes(t))
    );
    if (byKeyword) return { case: byKeyword, matchLevel: "keyword" };
  }

  // 4. 業種カテゴリの先頭2文字で部分一致（製造業/建設業など）
  if (mhlw.industry) {
    const prefix = mhlw.industry.slice(0, 2);
    const byLoose = curated.find((c) => c.workCategory.includes(prefix));
    if (byLoose) return { case: byLoose, matchLevel: "loose" };
  }

  // 5. 最終フォールバック: 任意の1件（ユーザーを少なくとも事故DB内のページへ）
  return { case: curated[0], matchLevel: "fallback" };
}

function ProfileRecommend({ profile }: { profile: CompanyProfile | null }) {
  const query = profile ? buildProfileQuery(profile) : "";
  // C-1: 死亡災害DB・事故データセットとも検索実行時の dynamic import（非同期）
  const [result, setResult] = useState<{ cases: ScoredMhlwCase[]; mode: "strict" | "loose" | "none" }>({
    cases: [],
    mode: "none",
  });
  const [curated, setCurated] = useState<AccidentCase[]>([]);
  const [deathsTotal, setDeathsTotal] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (!profile?.wizardCompleted || !query) return;
    void Promise.all([
      searchMhlwSimilarStrict(query, profile.industry, 5),
      loadAccidentCases(),
      getMhlwDeathsTotal(),
    ]).then(([searchResult, cases, total]) => {
      if (!active) return;
      setResult(searchResult);
      setCurated(cases);
      setDeathsTotal(total);
    });
    return () => {
      active = false;
    };
  }, [profile, query]);

  if (!profile?.wizardCompleted) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-emerald-900"><Pin className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />自社類似事故Top5（プロファイル連動）</h3>
        <p className="mt-1 text-[11px] text-emerald-800">
          自社プロファイルを設定するとTop5が表示されます。
        </p>
        <Link
          href="/profile"
          className="mt-2 inline-flex min-h-[44px] items-center rounded-full border border-emerald-400 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
        >
          /profile を開く →
        </Link>
      </section>
    );
  }

  const cases = result.cases;
  const isLoose = result.mode === "loose";

  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-rose-900">
          <Pin className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />自社類似事故 Top{cases.length}（プロファイル: {INDUSTRY_LABELS[profile.industry]}）
        </h3>
        <Link
          href="/profile"
          className="inline-flex min-h-[44px] items-center rounded-full border border-rose-300 bg-white px-3 text-[11px] font-bold text-rose-800 hover:bg-rose-100"
        >
          自社設定 →
        </Link>
      </div>
      <p className="mt-1 text-[11px] text-rose-800">
        厚労省 死亡災害DB{deathsTotal !== null ? ` ${deathsTotal.toLocaleString()}件` : ""}から、業種・主要機械・化学物質キーワードで重み付け検索した実例。
      </p>
      {isLoose && (
        <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />業種厳密一致では該当なし。業種制限を外して全件から関連度順で表示しています。
        </p>
      )}
      {cases.length === 0 ? (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
          該当事例なし。プロファイルにより詳しい主要機械・化学物質を追加してください。
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {cases.map((c, i) => {
            const related = findRelatedCuratedCase(c, curated);
            const detailHref = related
              ? `/accidents/${related.case.id}`
              : `/accidents?q=${encodeURIComponent([c.type, c.industry].filter(Boolean).join(" "))}`;
            const linkLabel = (() => {
              if (!related) return "→ 類似事例を事故DBで探す";
              switch (related.matchLevel) {
                case "type":
                case "industry":
                  return "→ 関連事例の詳細を見る";
                case "keyword":
                  return "→ 近い事例の詳細を見る";
                case "loose":
                case "fallback":
                  return "→ 近接業種の事例を見る";
              }
            })();
            return (
              <li key={c.id} className="rounded-lg border border-rose-100 bg-white p-3 text-xs shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  {c.type && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {c.type}
                    </span>
                  )}
                  {c.industry && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                      {c.industry}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {c.year}{c.month ? `-${String(c.month).padStart(2, "0")}` : ""}
                  </span>
                  {related && (related.matchLevel === "loose" || related.matchLevel === "fallback" || related.matchLevel === "keyword") && (
                    <span
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800"
                      title={
                        related.matchLevel === "fallback"
                          ? "厳密一致なし。サイト収録事例から代表例を表示"
                          : related.matchLevel === "loose"
                          ? "近接業種の収録事例を表示"
                          : "キーワード部分一致の収録事例を表示"
                      }
                    >
                      {related.matchLevel === "keyword" ? "近い" : "近接"}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-slate-700 leading-relaxed">{c.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Link
                    href={detailHref}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-rose-300 bg-white px-2 text-[11px] font-bold text-rose-800 hover:bg-rose-50"
                  >
                    {linkLabel}
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function AccidentExtrasPanel() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile());
    setMounted(true);
    const onChange = () => setProfile(loadProfile());
    window.addEventListener("company-profile-changed", onChange);
    return () => window.removeEventListener("company-profile-changed", onChange);
  }, []);

  return (
    <div className="space-y-4">
      <div className="min-h-[280px] sm:min-h-[320px]">
        {mounted ? (
          <ProfileRecommend profile={profile} />
        ) : (
          <div
            className="h-[280px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50/60 sm:h-[320px]"
            aria-hidden="true"
          />
        )}
      </div>
      <CrossTab />
    </div>
  );
}

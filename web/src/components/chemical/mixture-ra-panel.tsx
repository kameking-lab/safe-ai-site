"use client";

import { useCallback, useMemo, useState } from "react";
import { FlaskConical, Plus, X, Loader2, Save, Sparkles } from "lucide-react";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import { searchMergedChemicalsSlim as searchMergedChemicals } from "@/lib/mhlw-chemicals-slim";
import { REGULATION_TAGS, normalizeTags } from "@/lib/regulation-tag-labels";
import {
  soilContaminationForCas,
  airPollutionForCas,
  waterPollutionForCas,
} from "@/lib/chemical/extra-regulations";
import {
  aggregateMixture,
  hazardsFromFlags,
  type MixtureComponentInput,
} from "@/lib/chemical/mixture-ra";
import { saveChemicalRaRecord, isChemicalRaCloudEnabled } from "@/lib/chemical/ra-cloud";

/**
 * P2-4 混合物RA。複数成分を選び濃度を入力 → 各成分の実データ（規制法・有害性）を和集合で集約し、
 * AI（Gemini）で混合時の注意を提案。数値ばく露計算は行わない（創作回避）。
 * 既存単成分RAパネルには非干渉のスタンドアロン・セクション。クラウド保管（type=mixture）・印刷対応。
 */
const CATEGORY_FAMILY: Record<string, string> = {
  osha: "労働安全衛生法 特別則",
  nite: "GHS分類（NITE）",
  prtr: "化管法（PRTR・SDS）",
  chashin: "化審法",
  "poison-waste": "毒劇法/廃掃法",
  cwc: "化学兵器禁止法",
};

interface Row {
  key: string;
  chem: MergedChemical;
  percent: string;
}

function resolveComponent(chem: MergedChemical, percent: string): MixtureComponentInput {
  const cas = chem.cas ?? "";
  const families: string[] = [];
  if (cas) {
    // スリム索引の details.limits は concentration-limits の regulationTags を保持している
    for (const t of normalizeTags(chem.details?.limits?.regulationTags)) {
      const fam = CATEGORY_FAMILY[REGULATION_TAGS[t].category];
      if (fam && !families.includes(fam)) families.push(fam);
    }
    if (soilContaminationForCas(cas) && !families.includes("土壌汚染対策法")) families.push("土壌汚染対策法");
    if (airPollutionForCas(cas) && !families.includes("大気汚染防止法")) families.push("大気汚染防止法");
    if (waterPollutionForCas(cas) && !families.includes("水質汚濁防止法")) families.push("水質汚濁防止法");
  }
  const num = parseFloat(percent);
  return {
    name: chem.primaryName,
    cas,
    weightPercent: isFinite(num) ? num : null,
    lawFamilies: families,
    hazards: hazardsFromFlags(chem.flags),
  };
}

export function MixtureRaPanel() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [advice, setAdvice] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const candidates = useMemo(() => (query.trim().length >= 1 ? searchMergedChemicals(query.trim(), 6) : []), [query]);

  const addChem = useCallback((chem: MergedChemical) => {
    setRows((prev) => {
      const key = chem.cas ?? chem.primaryName;
      if (prev.some((r) => r.key === key)) return prev;
      return [...prev, { key, chem, percent: "" }];
    });
    setQuery("");
    setAdvice(null);
  }, []);

  const components = useMemo(() => rows.map((r) => resolveComponent(r.chem, r.percent)), [rows]);
  const agg = useMemo(() => aggregateMixture(components), [components]);

  const askAi = useCallback(async () => {
    setAiBusy(true);
    setAiError(null);
    setAdvice(null);
    try {
      const res = await fetch("/api/chemical/mixture-suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          components: components.map((c) => ({ name: c.name, cas: c.cas, weightPercent: c.weightPercent })),
          lawFamilies: agg.lawFamilies,
          hazards: agg.hazards,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok || !(data as { ok?: boolean })?.ok) {
        setAiError("AI提案を取得できませんでした（時間をおいて再試行）。");
        return;
      }
      setAdvice((data as { advice: string }).advice);
    } catch {
      setAiError("通信エラーが発生しました。");
    } finally {
      setAiBusy(false);
    }
  }, [components, agg]);

  const onSave = useCallback(async () => {
    setSaveMsg(null);
    const label = `混合物: ${rows.map((r) => r.chem.primaryName).join(" + ")}`.slice(0, 120);
    await saveChemicalRaRecord({
      substance: label,
      cas: "",
      workContent: "混合物RA",
      exposureBand: agg.hasCarcinogen ? "発がん性成分あり" : "",
      payload: { type: "mixture", components, aggregate: agg, advice },
    });
    setSaveMsg(isChemicalRaCloudEnabled() ? "保存しました（端末＋クラウド）。" : "保存しました（端末）。");
  }, [rows, components, agg, advice]);

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:p-5 space-y-4 print:border-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FlaskConical className="h-5 w-5 text-violet-600" aria-hidden="true" />
          混合物RA（複数成分の合成リスク）
        </h2>
        {rows.length > 0 && (
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => void onSave()}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
            >
              <Save className="h-3 w-3" /> 保存
            </button>
            {saveMsg && <span className="text-[10px] text-emerald-700">{saveMsg}</span>}
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              🖨 印刷
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-600">
        塗料・洗浄剤・接着剤など複数成分を扱う作業向け。各成分の規制法・有害性を集約します。
        ばく露濃度の数値計算は行いません（最終分類は公式SDS・専門家に従ってください）。
      </p>

      {/* 成分追加 */}
      <div className="print:hidden">
        <label className="block text-xs font-semibold text-slate-700">成分を追加（物質名・CAS・別名で検索）</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例: トルエン / 108-88-3 / アセトン"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        {candidates.length > 0 && (
          <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
            {candidates.map((m) => (
              <li key={m.cas ?? m.primaryName}>
                <button
                  type="button"
                  onClick={() => addChem(m)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-violet-50"
                >
                  <Plus className="h-3 w-3 text-violet-500" />
                  {m.primaryName}
                  {m.cas && <span className="text-xs text-slate-400">CAS {m.cas}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 成分一覧 + 濃度 */}
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
              <span className="flex-1 text-sm font-medium text-slate-800">
                {r.chem.primaryName}
                {r.chem.cas && <span className="ml-1 text-xs text-slate-400">CAS {r.chem.cas}</span>}
              </span>
              <input
                inputMode="decimal"
                value={r.percent}
                onChange={(e) =>
                  setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, percent: e.target.value.replace(/[^0-9.]/g, "") } : x)))
                }
                placeholder="%"
                aria-label={`${r.chem.primaryName} の濃度%`}
                className="w-16 rounded border border-slate-300 px-2 py-1 text-right text-sm print:border-0"
              />
              <span className="text-xs text-slate-500">%</span>
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                aria-label="削除"
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 print:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 集約結果 */}
      {rows.length > 0 && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-900">
            合成リスク集約（{agg.componentCount}成分 / 合計 {agg.totalPercent}%）
          </p>
          {agg.warnings.map((w) => (
            <p key={w} className="text-xs font-semibold text-amber-700">⚠ {w}</p>
          ))}
          {agg.hasCarcinogen && (
            <p className="rounded bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
              発がんのおそれのある成分を含みます。ばく露最小化・特殊健診の検討を。
            </p>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-600">該当する規制法（和集合）</p>
            {agg.lawFamilies.length > 0 ? (
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {agg.lawFamilies.map((f) => (
                  <li key={f} className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">収録データ上、該当法令は確認できませんでした。</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">主な有害性（和集合）</p>
            {agg.hazards.length > 0 ? (
              <p className="mt-1 text-xs text-slate-700">{agg.hazards.join(" / ")}</p>
            ) : (
              <p className="text-xs text-slate-500">—</p>
            )}
          </div>

          {/* AI提案 */}
          <div className="print:hidden">
            <button
              type="button"
              onClick={() => void askAi()}
              disabled={aiBusy || rows.length < 2}
              className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {aiBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AIに混合時の注意を尋ねる
            </button>
            {rows.length < 2 && <span className="ml-2 text-[11px] text-slate-500">2成分以上で利用できます</span>}
            {aiError && <p className="mt-1 text-xs text-rose-700">{aiError}</p>}
          </div>
          {advice && (
            <div className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
              {advice}
            </div>
          )}
          <p className="text-[11px] text-slate-400">
            ※ 集約は各成分の収録データの和集合です。混合物としての正式なGHS分類・ばく露評価は公式SDS・専門家の判断によります。
          </p>
        </div>
      )}
    </section>
  );
}

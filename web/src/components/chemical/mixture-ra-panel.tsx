"use client";

import { useCallback, useMemo, useState } from "react";
import { FlaskConical, Plus, X, Loader2, Save, Printer, AlertTriangle } from "lucide-react";
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
import { saveChemicalRaRecord } from "@/lib/chemical/ra-cloud";

/**
 * P2-4 混合物RA。複数成分を選び濃度を入力 → 各成分の実データ（規制法・有害性）を和集合で集約し、
 * 成分の入力整理と収録済み規制情報の和集合だけを表示する。作業条件を検証できないため、
 * 外部AIによる換気・PPE・混触助言は行わない。保存内容も評価結果ではなく入力整理メモ。
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
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [humanReviewConfirmed, setHumanReviewConfirmed] = useState(false);

  const candidates = useMemo(() => (query.trim().length >= 1 ? searchMergedChemicals(query.trim(), 6) : []), [query]);

  const addChem = useCallback((chem: MergedChemical) => {
    setRows((prev) => {
      const key = chem.cas ?? chem.primaryName;
      if (prev.some((r) => r.key === key)) return prev;
      return [...prev, { key, chem, percent: "" }];
    });
    setQuery("");
  }, []);

  const components = useMemo(() => rows.map((r) => resolveComponent(r.chem, r.percent)), [rows]);
  const agg = useMemo(() => aggregateMixture(components), [components]);
  const completeForReview =
    rows.length >= 2 &&
    components.every((component) =>
      Boolean(component.cas) &&
      typeof component.weightPercent === "number" &&
      Number.isFinite(component.weightPercent) &&
      component.weightPercent > 0 &&
      component.weightPercent <= 100
    ) &&
    Math.abs(agg.totalPercent - 100) <= 0.01;

  const onSave = useCallback(async () => {
    setSaveMsg(null);
    if (!completeForReview || !humanReviewConfirmed) {
      setSaveMsg("全成分・合計100%と最新SDSを人が確認してから保存してください。");
      return;
    }
    setSaveBusy(true);
    try {
      const label = `混合物: ${rows.map((r) => r.chem.primaryName).join(" + ")}`.slice(0, 120);
      const result = await saveChemicalRaRecord({
        substance: label,
        cas: "",
        workContent: "混合物RA",
        exposureBand: agg.hasCarcinogen ? "発がん性成分あり" : "",
        payload: {
          type: "mixture",
          components: components.map((component) => ({
            name: component.name,
            cas: component.cas,
            concentration: component.weightPercent,
            unit: "wt%",
          })),
          humanReviewConfirmed: true,
          humanReviewAt: new Date().toISOString(),
        },
      });
      setSaveMsg(
        result.localStatus === "saved-locally"
          ? "この端末だけに保存しました。クラウドへは送信していません。"
          : "端末内への保存に失敗しました。空き容量とブラウザ設定を確認してください。",
      );
    } catch {
      setSaveMsg("保存に失敗しました。");
    } finally {
      setSaveBusy(false);
    }
  }, [rows, components, agg, completeForReview, humanReviewConfirmed]);

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
              disabled={saveBusy || !completeForReview || !humanReviewConfirmed}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {saveBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} {saveBusy ? "保存中…" : "保存"}
            </button>
            {saveMsg && <span className="text-[10px] text-emerald-700">{saveMsg}</span>}
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!completeForReview || !humanReviewConfirmed}
              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Printer className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />印刷
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-600">
        塗料・洗浄剤・接着剤など複数成分を扱う作業向け。各成分の規制法・有害性を集約します。
        ばく露濃度の数値計算は行いません（最終分類は公式SDS・専門家に従ってください）。
      </p>
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
        営業秘密の配合、未公開製品名、会社名・現場名は入力しないでください。成分不明の製品は評価せず、製品固有の最新SDSを入手してください。単位は質量%として扱い、体積%・ppmを暗黙変換しません。
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
                  className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-violet-50"
                >
                  <Plus className="h-3 w-3 text-violet-500" />
                  {m.primaryName}
                  {m.cas && <span className="text-xs text-slate-600">CAS {m.cas}</span>}
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
                {r.chem.cas && <span className="ml-1 text-xs text-slate-600">CAS {r.chem.cas}</span>}
              </span>
              <input
                inputMode="decimal"
                value={r.percent}
                onChange={(e) =>
                  setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, percent: e.target.value.replace(/[^0-9.]/g, "") } : x)))
                }
                placeholder="%"
                aria-label={`${r.chem.primaryName} の濃度%`}
                className="min-h-[44px] w-20 rounded border border-slate-300 px-2 py-2 text-right text-sm print:border-0"
              />
              <span className="text-xs text-slate-500">wt%</span>
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                aria-label="削除"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 print:hidden"
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
            <p key={w} className="text-xs font-semibold text-amber-700"><AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />{w}</p>
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

          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-6 text-amber-950">
            この画面は成分、CAS、質量%と収録済み規制情報の入力整理メモです。取扱量、時間、頻度、
            換気、温度、飛散、皮膚接触、保護具を評価していないため、安全ランクや換気・PPEの助言は出しません。
            製品固有の最新SDSを確認し、公式CREATE-SIMPLE等の公式手順と実測値を用いて、化学物質管理者または専門家が最終評価してください。
          </div>
          <p className="text-[11px] text-slate-600">
            ※ 集約は各成分の収録データの和集合です。混合物としての正式なGHS分類・ばく露評価は公式SDS・専門家の判断によります。
          </p>
          <label className="flex min-h-[44px] items-center gap-2 rounded border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-900 print:hidden">
            <input
              type="checkbox"
              checked={humanReviewConfirmed}
              onChange={(event) => setHumanReviewConfirmed(event.target.checked)}
              className="h-5 w-5"
            />
            製品固有の最新SDS、全成分、質量%合計100%を人が確認しました（評価完了の確認ではありません）
          </label>
        </div>
      )}
    </section>
  );
}

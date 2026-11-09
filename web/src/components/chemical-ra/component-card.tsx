"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { CS_GHS_KEYS, type CsOelSet, type CsPropertyType, type CsSubstance, type CsVolatility } from "@/lib/create-simple/types";
import { toPascals } from "@/lib/create-simple/calc";
import { GHS_LABEL, PROPERTY_TYPE_LABEL, VOLATILITY_LABEL, formatNumber, ghsCategoryLabel } from "@/lib/create-simple/labels";
import { ChoiceChips } from "./choice-chips";

const OEL_LABEL: Record<keyof CsOelSet, string> = {
  cs8: "8時間濃度基準値",
  csShort: "短時間濃度基準値",
  jsoh: "日本産業衛生学会 許容濃度",
  jsohCeiling: "日本産業衛生学会 最大許容濃度",
  tlvTwa: "ACGIH TLV-TWA",
  tlvStel: "ACGIH TLV-STEL",
  tlvC: "ACGIH TLV-C",
  mak: "DFG MAK",
  makPeak: "DFG Peak limitation",
  other8: "その他（8時間）",
  otherShort: "その他（短時間）",
};

export function ComponentCard({
  substance,
  productType,
  contentText,
  temperature,
  volatilityOverridden,
  onContentChange,
  onVolatilityChange,
  onPropertyTypeChange,
  onRemove,
}: {
  substance: CsSubstance | null;
  productType: CsPropertyType;
  contentText: string;
  temperature: number | null;
  volatilityOverridden: boolean;
  onContentChange: (text: string) => void;
  onVolatilityChange: (v: CsVolatility) => void;
  onPropertyTypeChange: (v: CsPropertyType) => void;
  onRemove: () => void;
}) {
  const [editingVolatility, setEditingVolatility] = useState(false);
  if (!substance) return null;
  const pt = substance.propertyType;
  // 蒸気圧 0.5 Pa 以上の固体を液体製品で扱う場合は蒸気として評価する（設計基準 図表10・11）
  const vaporPa = substance.vaporPressure ? toPascals(substance.vaporPressure.value, substance.vaporPressure.unit) : 0;
  const isPowder = pt === 2 && !(productType === 1 && vaporPa >= 0.5);
  const volOptions = pt === 2 && isPowder
    ? ([1, 2, 3] as CsVolatility[]).map((v) => ({ value: v, label: VOLATILITY_LABEL[2][v] }))
    : ([1, 2, 3, 4] as CsVolatility[]).map((v) => ({ value: v, label: VOLATILITY_LABEL[1][v] }));
  const ghsEntries = CS_GHS_KEYS.filter((k) => substance.ghs[k] !== undefined);
  const oelEntries = (Object.keys(OEL_LABEL) as Array<keyof CsOelSet>).filter((k) => substance.oel[k]);
  const contentId = `cs-content-${substance.cas ?? substance.name}`;
  const contentInvalid = contentText.trim() !== "" && !(Number(contentText.normalize("NFKC")) > 0 && Number(contentText.normalize("NFKC")) <= 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-slate-950 dark:text-white">{substance.name}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {substance.cas ? `CAS ${substance.cas}` : "手入力"}
            {pt !== null && `・${PROPERTY_TYPE_LABEL[pt]}`}
            {substance.boilingPoint !== null && `・沸点 ${formatNumber(substance.boilingPoint)}℃`}
            {substance.flashPoint !== null && `・引火点 ${formatNumber(substance.flashPoint)}℃`}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${substance.name}を外す`}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-700"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label htmlFor={contentId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
          含有率
        </label>
        <input
          id={contentId}
          inputMode="decimal"
          value={contentText}
          onChange={(e) => onContentChange(e.target.value)}
          aria-invalid={contentInvalid || contentText.trim() === ""}
          placeholder="SDSの値"
          className="min-h-11 w-24 rounded-lg border border-slate-300 bg-white px-3 text-base dark:border-slate-600 dark:bg-slate-950 dark:text-white"
        />
        <span className="text-sm text-slate-700 dark:text-slate-200">%</span>
        {(contentInvalid || contentText.trim() === "") && (
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">0より大きく100以下で入力</span>
        )}
      </div>

      {pt === null && (
        <div className="mt-3">
          <ChoiceChips<CsPropertyType>
            label="この物質の状態（データにないため選んでください）"
            columns={3}
            required
            options={[
              { value: 1, label: "液体" },
              { value: 2, label: "粉体" },
              { value: 3, label: "気体" },
            ]}
            value={null}
            onChange={onPropertyTypeChange}
          />
        </div>
      )}

      {pt !== null && pt !== 3 && substance.volatility !== null && !editingVolatility && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="font-bold text-slate-900 dark:text-slate-100">{isPowder ? "飛散性" : "揮発性"}</span>
          <span className="min-w-0 flex-1 text-slate-800 dark:text-slate-100">
            {VOLATILITY_LABEL[isPowder ? 2 : 1][substance.volatility]}
            {!volatilityOverridden && (
              <span className="block text-xs text-slate-600 dark:text-slate-400">
                {temperature !== null && pt === 1 && substance.boilingPoint !== null && substance.volatility !== 4
                  ? `沸点と取扱温度 ${formatNumber(temperature)}℃ から自動`
                  : "沸点・蒸気圧から自動"}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setEditingVolatility(true)}
            className="min-h-11 rounded-lg px-3 text-sm font-bold text-emerald-800 underline underline-offset-4 dark:text-emerald-300"
          >
            変更
          </button>
        </div>
      )}
      {pt !== null && pt !== 3 && (substance.volatility === null || editingVolatility) && (
        <div className="mt-3">
          <ChoiceChips<CsVolatility>
            label={isPowder ? "飛散性" : "揮発性"}
            description={isPowder ? "粉の状態を選んでください。" : "沸点がわからない場合は「中揮発性」を選びます。"}
            required
            options={volOptions}
            value={substance.volatility}
            onChange={(v) => {
              onVolatilityChange(v);
              setEditingVolatility(false);
            }}
            columns={1}
          />
        </div>
      )}

      {(ghsEntries.length > 0 || oelEntries.length > 0) && (
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-slate-800 dark:text-slate-100">
            GHS分類・ばく露限界値（{ghsEntries.length + oelEntries.length}件）
          </summary>
          <dl className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {oelEntries.map((k) => (
              <div key={k} className="flex justify-between gap-2 border-b border-slate-200 py-1 dark:border-slate-700">
                <dt className="text-slate-600 dark:text-slate-300">{OEL_LABEL[k]}</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">
                  {formatNumber(substance.oel[k]!.value)} {substance.oel[k]!.unit}
                </dd>
              </div>
            ))}
            {ghsEntries.map((k) => (
              <div key={k} className="flex justify-between gap-2 border-b border-slate-200 py-1 dark:border-slate-700">
                <dt className="text-slate-600 dark:text-slate-300">{GHS_LABEL[k]}</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">{ghsCategoryLabel(k, substance.ghs[k]!)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {ghsEntries.length === 0 && oelEntries.length === 0 && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">GHS分類・ばく露限界値のデータがありません（区分なしとして判定します）。</p>
      )}
    </div>
  );
}

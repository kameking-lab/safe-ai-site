"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Database, ExternalLink, Gauge } from "lucide-react";
import {
  regulatoryLabels,
  relatedLawTexts,
  type MergedChemical,
} from "@/lib/mhlw-chemicals";

/**
 * 厚労省由来の物質詳細カード。
 * 濃度基準値・SDS義務・皮膚等障害・がん原性・規制区分・関連法令を表示。
 * 任意で測定濃度を入力すると 8h 基準値との比較を表示する。
 */
export function MhlwChemicalInfoCard({ chemical }: { chemical: MergedChemical }) {
  const reg = regulatoryLabels(chemical.flags);
  const laws = relatedLawTexts(chemical.flags);
  const limit8h = chemical.details?.limit8h;
  const limitShort = chemical.details?.limitShort;
  const link = chemical.details?.link;

  const [measured, setMeasured] = useState("");
  const verdict = useMemo(() => evaluateConcentration(measured, limit8h), [measured, limit8h]);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
        <Database className="h-3.5 w-3.5" aria-hidden="true" />
        厚生労働省データ（MHLW 1,389 物質）
      </div>
      <h3 className="mt-1 text-base font-bold text-slate-900">{chemical.primaryName}</h3>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
        {chemical.cas && (
          <span className="rounded-md bg-white px-1.5 py-0.5 font-mono">CAS {chemical.cas}</span>
        )}
        {chemical.aliases.slice(0, 3).map((a) => (
          <span key={a} className="text-slate-500">別名: {a}</span>
        ))}
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-lg bg-white p-3">
          <dt className="flex items-center gap-1 font-semibold text-amber-700">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            濃度基準値（八時間）
          </dt>
          <dd className="mt-1 text-base font-bold text-slate-900">
            {limit8h ?? <span className="text-slate-400 text-sm font-normal">未設定</span>}
          </dd>
        </div>
        <div className="rounded-lg bg-white p-3">
          <dt className="flex items-center gap-1 font-semibold text-amber-700">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            濃度基準値（短時間）
          </dt>
          <dd className="mt-1 text-base font-bold text-slate-900">
            {limitShort ?? <span className="text-slate-400 text-sm font-normal">未設定</span>}
          </dd>
        </div>
      </dl>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
        <FlagBadge label="SDS交付義務" on={chemical.flags.label_sds} />
        <FlagBadge label="濃度基準値設定" on={chemical.flags.concentration} />
        <FlagBadge label="皮膚等障害" on={chemical.flags.skin} />
        <FlagBadge label="がん原性" on={chemical.flags.carcinogenic} />
      </div>

      {reg.length > 0 && (
        <div className="mt-3 rounded-lg bg-white p-3">
          <p className="flex items-center gap-1 text-xs font-semibold text-slate-600">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            規制区分
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
            {reg.map((r) => (
              <li key={r} className="flex items-start gap-1">
                <span className="text-emerald-500">▸</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {laws.length > 0 && (
        <div className="mt-3 rounded-lg bg-white p-3">
          <p className="text-xs font-semibold text-slate-600">関連法令</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
            {laws.map((l) => (
              <li key={l} className="flex items-start gap-1">
                <span className="text-blue-500">§</span>
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}

      {chemical.details?.uses && (
        <p className="mt-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">主な用途:</span> {chemical.details.uses}
        </p>
      )}

      {limit8h && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">
            測定濃度を入力して 8 時間基準値（{limit8h}）と比較
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={measured}
              onChange={(e) => setMeasured(e.target.value)}
              placeholder={`例: ${limit8h.replace(/[^\d.]/g, "") || "10"}`}
              className="min-h-[36px] w-32 rounded-md border border-amber-300 bg-white px-2 py-1 text-sm"
            />
            <span className="text-xs text-amber-900">
              {limit8h.replace(/[\d.\s－]/g, "") || "ppm"}（基準値と同じ単位で入力）
            </span>
          </div>
          {verdict && (
            <p
              className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
                verdict.exceeded
                  ? "bg-rose-100 text-rose-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {verdict.exceeded ? (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              ) : null}
              {verdict.message}
            </p>
          )}
        </div>
      )}

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          厚労省 公式 SDS PDF
        </a>
      )}
    </div>
  );
}

function FlagBadge({ label, on }: { label: string; on: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${
        on ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"
      }`}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-xs font-bold">{on ? "該当" : "—"}</span>
    </div>
  );
}

function evaluateConcentration(
  measuredRaw: string,
  limit8h: string | undefined
): { exceeded: boolean; message: string } | null {
  if (!measuredRaw.trim() || !limit8h) return null;
  const measured = parseFloat(measuredRaw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(measured)) return null;
  // 全角数字 / カタカナ数字を半角化して数値抽出
  const normalized = limit8h
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[一二三四五六七八九〇]/g, (c) => "一二三四五六七八九〇".indexOf(c).toString());
  const m = normalized.match(/[\d.]+/);
  if (!m) return null;
  const limit = parseFloat(m[0]);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const ratio = measured / limit;
  if (measured > limit) {
    return {
      exceeded: true,
      message: `基準値超過 (${ratio.toFixed(2)}倍) ／ 直ちに作業改善が必要`,
    };
  }
  if (ratio >= 0.5) {
    return {
      exceeded: false,
      message: `基準値の ${(ratio * 100).toFixed(0)}% ／ 余裕は小さめ。改善検討を`,
    };
  }
  return {
    exceeded: false,
    message: `基準値の ${(ratio * 100).toFixed(0)}% ／ 基準値内`,
  };
}

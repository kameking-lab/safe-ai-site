"use client";

import { ArrowRight } from "lucide-react";
import { CS_ROUTE_LABEL, summarize, worstLevel, type CsImprovement, type CsPlan, type CsRoute } from "@/lib/create-simple/improvements";
import { PHYSICAL_CLASS_LABEL, RISK_LEVEL_LABEL, RISK_LEVEL_MEANING, SKIP_REASON_LABEL, formatNumber } from "@/lib/create-simple/labels";
import type { CsAssessmentResult, CsComponentResult, CsConditions, CsRiskLevel } from "@/lib/create-simple/types";

export function levelTone(level: CsRiskLevel): string {
  switch (level) {
    case "IV":
      return "bg-rose-700 text-white";
    case "III":
      return "bg-orange-500 text-white";
    case "II-B":
      return "bg-amber-400 text-slate-950";
    case "II":
    case "II-A":
      return "bg-yellow-200 text-slate-950";
    default:
      return "bg-emerald-600 text-white";
  }
}

export function LevelBadge({ level, size = "md" }: { level: CsRiskLevel; size?: "md" | "lg" }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-black ${levelTone(level)} ${
        size === "lg" ? "min-w-16 px-3 py-1 text-3xl" : "min-w-10 px-2 py-0.5 text-base"
      }`}
    >
      {RISK_LEVEL_LABEL[level]}
    </span>
  );
}

const ROUTES: CsRoute[] = ["inhalation8h", "inhalationShort", "dermal", "total", "physical"];

function ComponentDetail({ r }: { r: CsComponentResult }) {
  const unit = r.unit ?? "";
  const rows: Array<{ label: string; level: CsRiskLevel | null; detail: string }> = [];
  if (r.inhalation.status === "ok") {
    const limit = r.oel8h !== null ? `ばく露限界値 ${formatNumber(r.oel8h)} ${unit}` : r.acrMax !== null ? `管理目標濃度 ${formatNumber(r.acrMax * 0.1)}〜${formatNumber(r.acrMax)} ${unit}（GHS区分から）` : "";
    const range = r.inhalation.exposure8h === 0 ? `0 ${unit}` : r.inhalation.exposure8h >= 5000 ? `${formatNumber(r.inhalation.exposure8h * 0.1)} ${unit}〜` : `${formatNumber(r.inhalation.exposure8h * 0.1)}〜${formatNumber(r.inhalation.exposure8h)} ${unit}`;
    rows.push({ label: "吸入（8時間）", level: r.inhalation.level8h, detail: `推定 ${range}／${limit}` });
    rows.push({
      label: "吸入（短時間）",
      level: r.inhalation.levelShort,
      detail: `推定 ${formatNumber(r.inhalation.exposureShort)} ${unit}${r.oelShort !== null ? `／短時間の限界値 ${formatNumber(r.oelShort)} ${unit}` : ""}`,
    });
  } else if (r.inhalation.status === "skipped" && r.inhalation.reason !== "not-target") {
    rows.push({ label: "吸入", level: null, detail: SKIP_REASON_LABEL[r.inhalation.reason] });
  }
  if (r.dermal.status === "ok") {
    rows.push({ label: "経皮吸収", level: r.dermal.level, detail: `吸収量 ${formatNumber(r.dermal.absorption)} mg/日／経皮ばく露限界値 ${formatNumber(r.dermal.oelDermal)} mg/日` });
  } else if (
    r.dermal.reason !== "not-target" &&
    !(r.inhalation.status === "skipped" && r.inhalation.reason === r.dermal.reason)
  ) {
    rows.push({ label: "経皮吸収", level: null, detail: SKIP_REASON_LABEL[r.dermal.reason] });
  }
  if (r.total.status === "ok") rows.push({ label: "合計（吸入＋経皮）", level: r.total.level, detail: "" });
  if (r.physical.status === "ok") {
    const classes = Object.entries(r.physical.byClass)
      .map(([k, v]) => `${PHYSICAL_CLASS_LABEL[k as keyof typeof PHYSICAL_CLASS_LABEL]} ${RISK_LEVEL_LABEL[(({ 4: "IV", 3: "III", 2: "II", 1: "I" }) as const)[v as 1 | 2 | 3 | 4]]}`)
      .join("、");
    rows.push({ label: "危険性（爆発・火災等）", level: r.physical.level, detail: classes || "該当する危険性の区分なし" });
  } else if (r.physical.reason !== "not-target") {
    rows.push({ label: "危険性", level: null, detail: SKIP_REASON_LABEL[r.physical.reason] });
  }
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="font-black text-slate-950 dark:text-white">{r.name}</p>
      {r.regulations.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-1">
          {r.regulations.map((x) => (
            <span key={x} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {x}
            </span>
          ))}
        </p>
      )}
      <dl className="mt-2 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-2">
            <dt className="w-28 shrink-0 text-xs font-bold text-slate-700 dark:text-slate-200">{row.label}</dt>
            <dd className="flex min-w-0 flex-1 items-start gap-2">
              {row.level ? <LevelBadge level={row.level} /> : <span className="text-xs text-slate-600">—</span>}
              {row.detail && <span className="text-xs text-slate-600 dark:text-slate-300">{row.detail}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ChangeList({ item }: { item: Pick<CsImprovement, "changes"> }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {item.changes.map((c) => (
        <span key={c.route} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
          {CS_ROUTE_LABEL[c.route]}
          <LevelBadge level={c.from} />
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          <LevelBadge level={c.to} />
        </span>
      ))}
    </span>
  );
}

export function ResultView({
  result,
  improvements,
  plan,
  onApply,
}: {
  result: CsAssessmentResult;
  improvements: CsImprovement[];
  plan: CsPlan | null;
  onApply: (conditions: CsConditions) => void;
}) {
  const summary = summarize(result);
  const worst = worstLevel(summary);
  const engineering = improvements.filter((i) => i.category !== "respirator");
  const respirators = improvements.filter((i) => i.category === "respirator");
  const planChanges = plan
    ? ROUTES.flatMap((route) => {
        const from = plan.before[route];
        const to = plan.after[route];
        return from && to && from !== to ? [{ route, from, to }] : [];
      })
    : [];

  return (
    <div className="mt-3 space-y-4">
      {worst && (
        <div className="flex items-center gap-3">
          <LevelBadge level={worst} size="lg" />
          <div>
            <p className="text-base font-black text-slate-950 dark:text-white">{RISK_LEVEL_MEANING[worst]}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">いちばん高いリスクレベル</p>
          </div>
        </div>
      )}
      <ul aria-label="経路別のリスクレベル" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ROUTES.map((route) => {
          const level = summary[route];
          return (
            <li key={route} className="rounded-xl border border-slate-200 p-2 text-center dark:border-slate-700">
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{CS_ROUTE_LABEL[route]}</p>
              <p className="mt-1">{level ? <LevelBadge level={level} /> : <span className="text-sm text-slate-400">—</span>}</p>
            </li>
          );
        })}
      </ul>

      {(engineering.length > 0 || plan) && (
        <div>
          <h3 className="text-base font-black text-slate-950 dark:text-white">レベルを下げるには</h3>
          {plan && planChanges.length > 0 && (
            <div className="mt-2 rounded-xl border-2 border-emerald-600 bg-emerald-50 p-3 dark:bg-emerald-500/10">
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">次の{plan.steps.length}つを組み合わせると</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-800 dark:text-slate-100">
                {plan.steps.map((s) => (
                  <li key={s.id}>{s.label}</li>
                ))}
              </ol>
              <div className="mt-2">
                <ChangeList item={{ changes: planChanges }} />
              </div>
              <button
                type="button"
                onClick={() => onApply(plan.conditions)}
                className="mt-2 min-h-11 rounded-lg bg-emerald-700 px-3 text-sm font-bold text-white hover:bg-emerald-800"
              >
                この条件で判定し直す
              </button>
            </div>
          )}
          <ul className="mt-2 space-y-2">
            {engineering.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                <div className="mt-1">
                  <ChangeList item={item} />
                </div>
                <button
                  type="button"
                  onClick={() => onApply(item.conditions)}
                  className="mt-2 min-h-11 rounded-lg border border-emerald-700 px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300"
                >
                  この条件にする
                </button>
              </li>
            ))}
          </ul>
          {respirators.length > 0 && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-sm font-bold text-slate-900 dark:text-white">上の対策をしたうえで、呼吸用保護具を使う場合（マスク内の濃度）</p>
              <ul className="mt-2 space-y-2">
                {respirators.map((item) => (
                  <li key={item.id}>
                    <p className="text-sm text-slate-800 dark:text-slate-100">{item.label}</p>
                    <ChangeList item={item} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result.healthDescriptions.length + result.physicalDescriptions.length > 0 && (
        <div>
          <h3 className="text-base font-black text-slate-950 dark:text-white">判定に応じた対応</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-800 dark:text-slate-100">
            {[...result.healthDescriptions, ...result.physicalDescriptions].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-base font-black text-slate-950 dark:text-white">物質ごとの内訳</h3>
        {result.components.map((r, i) => (
          <ComponentDetail key={`${r.cas ?? r.name}-${i}`} r={r} />
        ))}
      </div>
    </div>
  );
}

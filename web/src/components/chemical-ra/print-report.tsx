import { CS_ROUTE_LABEL, summarize, type CsImprovement, type CsRoute } from "@/lib/create-simple/improvements";
import {
  AMOUNT_LABEL,
  CONTACT_AREA_LABEL,
  GLOVE_LABEL,
  GLOVE_TRAINING_LABEL,
  PROPERTY_TYPE_LABEL,
  RISK_LEVEL_LABEL,
  SKIP_REASON_LABEL,
  VENTILATION_LABEL,
  WORKING_HOURS_LABEL,
  formatNumber,
  volatilityLabel,
} from "@/lib/create-simple/labels";
import type { CsAssessmentInput, CsAssessmentResult } from "@/lib/create-simple/types";

const ROUTES: CsRoute[] = ["inhalation8h", "inhalationShort", "dermal", "total", "physical"];

/** 印刷・PDF 保存用の記録（画面では非表示） */
export function PrintReport({
  title,
  input,
  result,
  improvements,
}: {
  title: string;
  input: CsAssessmentInput;
  result: CsAssessmentResult;
  improvements: CsImprovement[];
}) {
  const c = input.conditions;
  const summary = summarize(result);
  const cell = "border border-slate-400 px-2 py-1 align-top";
  return (
    <section data-cs-print-report className="hidden text-[11px] leading-snug text-black print:block">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body:has([data-cs-print-report]) { padding: 0 !important; min-height: 0 !important; background: white !important; }
          body:has([data-cs-print-report])::before,
          body:has([data-cs-print-report]) nav,
          body:has([data-cs-print-report]) header,
          body:has([data-cs-print-report]) [data-site-footer] { display: none !important; }
          body:has([data-cs-print-report]) main,
          body:has([data-cs-print-report]) main *:has([data-cs-print-report]) { padding: 0 !important; margin: 0 !important; min-height: 0 !important; max-width: none !important; background: white !important; }
          body:has([data-cs-print-report]) img[src*="mascot"],
          body:has([data-cs-print-report]) [data-pet-companion] { display: none !important; }
          [data-cs-print-report] { color: #0f172a; font-size: 10px; line-height: 1.5; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          [data-cs-print-report] h1 { border-top: 6px solid #047857; border-bottom: 1px solid #047857; padding: 8px 0; color: #064e3b; font-size: 19px; letter-spacing: .04em; }
          [data-cs-print-report] h2 { background: #e0f2fe; border-left: 5px solid #0369a1; padding: 4px 8px; color: #0c4a6e; break-after: avoid; }
          [data-cs-print-report] h2:nth-of-type(2) { background: #fff7ed; border-color: #c2410c; color: #7c2d12; }
          [data-cs-print-report] table { font-size: 9px; }
          [data-cs-print-report] th, [data-cs-print-report] td { border: 1px solid #64748b; padding: 5px; overflow-wrap: anywhere; }
          [data-cs-print-report] th { background: #e2e8f0; color: #0f172a; font-weight: 700; }
          [data-cs-print-report] thead { display: table-header-group; }
          [data-cs-print-report] tr, [data-cs-print-report] li { break-inside: avoid; }
          [data-cs-print-report] tbody tr:nth-child(even) td { background: #f8fafc; }
          [data-cs-print-report] [data-risk-level] { border: 1px solid #475569; border-left-width: 4px; border-radius: 3px; padding: 2px 5px; font-weight: 800; white-space: nowrap; color: #0f172a; }
          [data-cs-print-report] [data-risk-level="I"] { background: #d1fae5; border-left-color: #047857; }
          [data-cs-print-report] [data-risk-level^="II"] { background: #fef3c7; border-left-color: #a16207; }
          [data-cs-print-report] [data-risk-level="III"] { background: #ffedd5; border-left-color: #c2410c; }
          [data-cs-print-report] [data-risk-level="IV"] { background: #ffe4e6; border-left-color: #be123c; }
          [data-cs-print-report] .cs-print-summary { display: flex; flex-wrap: wrap; gap: 7px 12px; margin: 8px 0; }
        }
      `}</style>
      <h1 className="text-lg font-bold">化学物質リスクアセスメント記録</h1>
      <p className="mt-1">
        作業名: {title}／実施日: {new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}／実施者: ＿＿＿＿＿＿
      </p>
      <h2 className="mt-3 font-bold">作業条件</h2>
      <table className="mt-1 w-full border-collapse">
        <tbody>
          <tr>
            <th className={cell}>製品の状態</th>
            <td className={cell}>{PROPERTY_TYPE_LABEL[c.productType]}</td>
            <th className={cell}>取扱量</th>
            <td className={cell}>{AMOUNT_LABEL[c.productType][c.amountLevel]}</td>
          </tr>
          <tr>
            <th className={cell}>換気</th>
            <td className={cell}>
              レベル{c.ventilation} {VENTILATION_LABEL[c.ventilation]}
              {(c.ventilation === "D" || c.ventilation === "E") && (c.controlVelocityConfirmed ? "（制御風速確認済み）" : "（制御風速未確認）")}
            </td>
            <th className={cell}>作業時間・頻度</th>
            <td className={cell}>
              {WORKING_HOURS_LABEL[c.workingHours]}・{c.frequencyType === "weekly" ? `週${c.frequencyDays}日` : `月${c.frequencyDays}日`}
            </td>
          </tr>
          <tr>
            <th className={cell}>飛散しやすい作業</th>
            <td className={cell}>{c.spray ? "あり" : "なし"}</td>
            <th className={cell}>濃度の変動</th>
            <td className={cell}>{c.exposureVariation === "large" ? "大きい" : "小さい"}</td>
          </tr>
          <tr>
            <th className={cell}>皮膚に付く範囲</th>
            <td className={cell}>{c.contactArea !== null ? CONTACT_AREA_LABEL[c.contactArea] : "未回答"}</td>
            <th className={cell}>手袋</th>
            <td className={cell}>
              {GLOVE_LABEL[c.glove]}
              {c.glove === "resistant" && `（${GLOVE_TRAINING_LABEL[c.gloveTraining]}）`}
            </td>
          </tr>
          <tr>
            <th className={cell}>取扱温度</th>
            <td className={cell}>{c.processTemperature === null ? "室温" : `${c.processTemperature}℃`}</td>
            <th className={cell}>着火源除去／爆発性雰囲気防止</th>
            <td className={cell}>
              {c.ignitionSourceRemoved ? "実施" : "未実施"}／{c.explosiveAtmospherePrevented ? "実施" : "未実施"}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-3 font-bold">判定結果</h2>
      <div className="cs-print-summary">
        {ROUTES.map(r=>summary[r]?<span key={r}>{CS_ROUTE_LABEL[r]} <span data-risk-level={summary[r]}>{RISK_LEVEL_LABEL[summary[r]!]}</span></span>:null)}
      </div>
      <table className="mt-1 w-full border-collapse">
        <thead>
          <tr>
            <th className={cell}>物質（含有率）</th>
            <th className={cell}>揮発性/飛散性</th>
            <th className={cell}>ばく露限界値</th>
            <th className={cell}>推定ばく露濃度</th>
            <th className={cell}>吸入 8h/短時間</th>
            <th className={cell}>経皮</th>
            <th className={cell}>合計</th>
            <th className={cell}>危険性</th>
          </tr>
        </thead>
        <tbody>
          {result.components.map((r, i) => {
            const unit = r.unit ?? "";
            return (
              <tr key={`${r.name}-${i}`}>
                <td className={cell}>
                  {r.name}
                  {r.cas ? `（CAS ${r.cas}）` : ""} {input.components[i]?.contentPercent}%
                  {r.regulations.length > 0 && <div>{r.regulations.join("・")}</div>}
                </td>
                <td className={cell}>{volatilityLabel(r.propertyType, r.volatility)}</td>
                <td className={cell}>
                  {r.oel8h !== null ? `${formatNumber(r.oel8h)} ${unit}` : r.acrMax !== null ? `管理目標濃度 ${formatNumber(r.acrMax * 0.1)}〜${formatNumber(r.acrMax)} ${unit}` : "-"}
                  {r.oelShort !== null && <div>短時間 {formatNumber(r.oelShort)} {unit}</div>}
                </td>
                <td className={cell}>
                  {r.inhalation.status === "ok"
                    ? `${formatNumber(r.inhalation.exposure8h * 0.1)}〜${formatNumber(r.inhalation.exposure8h)} ${unit}／短時間 ${formatNumber(r.inhalation.exposureShort)} ${unit}`
                    : r.inhalation.reason === "not-target"
                      ? "-"
                      : SKIP_REASON_LABEL[r.inhalation.reason]}
                </td>
                <td className={cell}>
                  {r.inhalation.status === "ok"
                    ? <><span data-risk-level={r.inhalation.level8h}>{RISK_LEVEL_LABEL[r.inhalation.level8h]}</span>／{r.inhalation.levelShort ? <span data-risk-level={r.inhalation.levelShort}>{RISK_LEVEL_LABEL[r.inhalation.levelShort]}</span> : "-"}</>
                    : "-"}
                </td>
                <td className={cell}>
                  {r.dermal.status === "ok" ? <><span data-risk-level={r.dermal.level}>{RISK_LEVEL_LABEL[r.dermal.level]}</span>（{formatNumber(r.dermal.absorption)}/{formatNumber(r.dermal.oelDermal)} mg/日）</> : "-"}
                </td>
                <td className={cell}>{r.total.status === "ok" ? <span data-risk-level={r.total.level}>{RISK_LEVEL_LABEL[r.total.level]}</span> : "-"}</td>
                <td className={cell}>{r.physical.status === "ok" ? <span data-risk-level={r.physical.level}>{RISK_LEVEL_LABEL[r.physical.level]}</span> : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {[...result.healthDescriptions, ...result.physicalDescriptions].length > 0 && (
        <>
          <h2 className="mt-3 font-bold">判定に応じた対応</h2>
          <ul className="mt-1 list-disc pl-5">
            {[...result.healthDescriptions, ...result.physicalDescriptions].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      )}
      {improvements.length > 0 && (
        <>
          <h2 className="mt-3 font-bold">リスクを下げる対策（同じ計算で再評価）</h2>
          <ul className="mt-1 list-disc pl-5">
            {improvements.map((item) => (
              <li key={item.id}>
                {item.label}: {item.changes.map((ch) => `${CS_ROUTE_LABEL[ch.route]} ${RISK_LEVEL_LABEL[ch.from]}→${RISK_LEVEL_LABEL[ch.to]}`).join("、")}
              </li>
            ))}
          </ul>
        </>
      )}
      <h2 className="mt-3 font-bold">実施する対策・期限・担当</h2>
      <div className="mt-1 h-24 border border-slate-400" />
      <p className="mt-2">厚生労働省 CREATE-SIMPLE の手法に基づく計算（安全AIポータル）</p>
    </section>
  );
}

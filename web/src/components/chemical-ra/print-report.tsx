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
    <section className="hidden text-[11px] leading-snug text-black print:block" aria-hidden="true">
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
      <p className="mt-1">
        {ROUTES.map((r) => (summary[r] ? `${CS_ROUTE_LABEL[r]} ${RISK_LEVEL_LABEL[summary[r]!]}` : null))
          .filter(Boolean)
          .join("／")}
      </p>
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
                    ? `${RISK_LEVEL_LABEL[r.inhalation.level8h]}／${r.inhalation.levelShort ? RISK_LEVEL_LABEL[r.inhalation.levelShort] : "-"}`
                    : "-"}
                </td>
                <td className={cell}>
                  {r.dermal.status === "ok" ? `${RISK_LEVEL_LABEL[r.dermal.level]}（${formatNumber(r.dermal.absorption)}/${formatNumber(r.dermal.oelDermal)} mg/日）` : "-"}
                </td>
                <td className={cell}>{r.total.status === "ok" ? RISK_LEVEL_LABEL[r.total.level] : "-"}</td>
                <td className={cell}>{r.physical.status === "ok" ? RISK_LEVEL_LABEL[r.physical.level] : "-"}</td>
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

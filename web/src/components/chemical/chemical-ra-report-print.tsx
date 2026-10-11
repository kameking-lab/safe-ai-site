/**
 * 化学物質の参考情報・入力条件を持ち出す印刷専用パーツ。
 *
 * 自社情報・記録日・記録者の手書き欄と
 * 確認印枠（実施者・管理者・統括安全衛生責任者）を、印刷時のみ表示する（hidden print:block）。
 * ブラウザ印刷/PDF保存時に、GHS分類と入力条件・未評価事項を表示する。
 * 記入は印刷後の手書き運用を想定（入力強制なし＝「現場に何かさせない」方針を遵守）。
 */

import type { ChemicalRaResponse } from "@/app/api/chemical-ra/route";
import { GhsPictogram } from "./ghs-pictogram";
import { collectGhsSymbols, GHS_SYMBOL_LABEL } from "@/lib/chemical/ghs-pictogram-map";
import { GHS_PARTIAL_COVERAGE_NOTICE } from "@/lib/chemical/ghs-coverage";
import type { ChemicalRaAssessmentSnapshot } from "@/lib/chemical/ra-cloud";
import { SNAPSHOT_MISSING_LABEL } from "@/lib/chemical/ra-record-labels";

function todayJa(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** ISO日時を「YYYY年M月D日」に。不正値なら今日。 */
function formatRecordDate(iso?: string): string {
  if (!iso) return todayJa();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayJa();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 印刷時のみ出る記録様式ヘッダ（会社名・実施者は手書き欄）。
 * recordDateIso を渡すと「記録日」をその日付で固定する（台帳からの再印刷でも
 * 保存当時の日付を保つ）。未指定なら当日。
 */
export function ChemicalRaReportHeader({ recordDateIso, includeCoverageNotice = true }: { recordDateIso?: string; includeCoverageNotice?: boolean } = {}) {
  return (
    <div className="hidden print:block border border-slate-400 p-3 mb-3 text-[11px] text-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">化学物質の参考情報・条件記録</p>
        <p>記録日: {formatRecordDate(recordDateIso)}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
        <p>事業場名: ____________________________</p>
        <p>所属・部署: __________________________</p>
        <p>記録者氏名: __________________________</p>
        <p>対象作業場所: ________________________</p>
      </div>
      <p className="mt-1 text-[10px] text-slate-600">
        ※ 収録分類と入力条件の参考記録です。正式なRA結果ではありません。
      </p>
      {includeCoverageNotice && <p className="mt-1 text-[10px] text-slate-600">{GHS_PARTIAL_COVERAGE_NOTICE}</p>}
    </div>
  );
}

/** 印刷時のみ出る確認印枠（実施者・管理者・統括安全衛生責任者）。 */
export function ChemicalRaSignoffBoxes() {
  const roles = ["実施者", "化学物質管理者", "統括安全衛生責任者"];
  return (
    <div className="hidden print:block mt-3">
      <p className="text-[11px] font-bold text-slate-900 mb-1">確認欄（評価完了の証明ではありません）</p>
      <div className="grid grid-cols-3 gap-2">
        {roles.map((r) => (
          <div key={r} className="border border-slate-400 h-20 flex flex-col">
            <span className="text-[10px] text-slate-700 px-1 py-0.5 border-b border-slate-300">{r}</span>
            <span className="flex-1" aria-hidden="true" />
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-slate-600">
        ※ 社内参考資料として保存してください。法定記録は種類ごとの保存要件を別途確認してください。
      </p>
    </div>
  );
}


/** 画面の操作UIを混ぜず、同じ分類をA4の参照記録に保持する。 */
export function ChemicalRaPrintReport({ result, recordDateIso, snapshot }: {
  result: ChemicalRaResponse;
  recordDateIso?: string;
  snapshot?: ChemicalRaAssessmentSnapshot | null;
}) {
  const symbols = collectGhsSymbols(result.ghsHazards);
  // 分類の出典は画面と同じCAS一致条件。別物質のURLを転載しない。
  const sources = (result.sourceLinks ?? []).filter((source) => result.casNumber &&
    source.url === `https://www.chem-info.nite.go.jp/chem/ghs/m-nite-${result.casNumber}.html`);
  const signal = result.ghsHazards.some((hazard) => hazard.signal === "危険")
    ? "危険"
    : result.ghsHazards.some((hazard) => hazard.signal === "警告") ? "警告" : "分類情報未確認";
  return (
    <article data-chemical-ra-print-report="" data-testid="chemical-ra-print-report" className="hidden print:block">
      <div className="chemical-ra-print-record-header">
        <ChemicalRaReportHeader recordDateIso={recordDateIso} includeCoverageNotice={false} />
      </div>
      <section className="chemical-ra-print-identity" aria-label="対象物質とGHS絵表示">
        <h1>{result.chemicalName}</h1>
        <p className="chemical-ra-print-cas">CAS番号: {result.casNumber || "未確認"}</p>
        <p className="chemical-ra-print-signal"><strong>{signal}</strong> <span>収録済みGHS分類の注意喚起語</span></p>
        {symbols.length > 0 ? (
          <div className="chemical-ra-print-symbols">
            {symbols.map((symbol) => (
              <div key={symbol}>
                <GhsPictogram symbol={symbol} />
                <span>{GHS_SYMBOL_LABEL[symbol]}</span>
              </div>
            ))}
          </div>
        ) : <p>絵表示の表示データがありません。危険性の有無は未確認です。</p>}
      </section>
      <section className="chemical-ra-print-conditions" aria-label="入力条件と未評価事項">
        <h2>入力した条件（評価値ではありません）</h2>
        {snapshot ? <>
          <dl>
            <dt>作業内容</dt><dd>{snapshot.workContent || "未入力"}</dd>
            <dt>作業時間</dt><dd>{snapshot.durationHours === null ? "未入力" : `${snapshot.durationHours} 時間/日`}</dd>
            <dt>換気</dt><dd>{snapshot.ventilation === "local" ? "局所排気" : snapshot.ventilation === "general" ? "全体換気" : snapshot.ventilation === "none" ? "なし" : "未確認"}</dd>
            {(snapshot.engineeringControls.generalVentilation !== "unknown" || snapshot.engineeringControls.localExhaust !== "unknown") && <><dt>換気設備</dt><dd>全体換気: {snapshot.engineeringControls.generalVentilation === "yes" ? "あり" : snapshot.engineeringControls.generalVentilation === "no" ? "なし" : "未確認"} / 局所排気: {snapshot.engineeringControls.localExhaust === "yes" ? "あり" : snapshot.engineeringControls.localExhaust === "no" ? "なし" : "未確認"}（入力内容。能力・効果は未評価）</dd></>}
            <dt>取扱量</dt><dd>{snapshot.amount === "small" ? "少量" : snapshot.amount === "medium" ? "中量" : snapshot.amount === "large" ? "多量" : "未確認"}（入力した区分。実際の数量は未評価）</dd>
            <dt>SDS確認</dt><dd>{snapshot.sds.status === "confirmed" ? "確認したとの入力" : "未確認"} / 発行日: {snapshot.sds.issuedOn || "未入力"} / 成分・製品版: {snapshot.sds.componentVersion || "未入力"}</dd>
            <dt>測定濃度</dt><dd>{snapshot.measuredConcentration.value ?? "未入力"} {snapshot.measuredConcentration.unit ?? "単位未入力"}（入力値。ここでは評価していません）</dd>
            {snapshot.frequency && <><dt>作業頻度</dt><dd>{{ "one-off": "単発", daily: "毎日", weekly: "毎週", monthly: "毎月", "less-than-monthly": "月1回未満" }[snapshot.frequency]}</dd></>}
            {snapshot.useTemperatureC !== null && <><dt>使用温度</dt><dd>{snapshot.useTemperatureC} ℃</dd></>}
            {snapshot.dispersion && <><dt>飛散・発散</dt><dd>{{ none: "なしとの入力", dust: "粉じん", mist: "ミスト", spray: "スプレー", vapor: "蒸気", other: "その他" }[snapshot.dispersion]}</dd></>}
            {snapshot.skinContact !== "unknown" && <><dt>皮膚接触</dt><dd>{snapshot.skinContact === "yes" ? "あり" : "なしとの入力"}</dd></>}
            {snapshot.ppe.description && <><dt>保護具</dt><dd>{snapshot.ppe.description} / 適合性: {snapshot.ppe.suitability === "confirmed" ? "確認したとの入力" : "未確認"}</dd></>}
            {snapshot.substitution !== "unknown" && <><dt>代替物の検討</dt><dd>{snapshot.substitution === "considered" ? "検討済みとの入力" : snapshot.substitution === "not-considered" ? "未検討" : "対象外との入力"}（適否は未評価）</dd></>}
            {snapshot.controls.existing && <><dt>既存対策</dt><dd>{snapshot.controls.existing}</dd></>}
            {snapshot.controls.additional && <><dt>追加対策案</dt><dd>{snapshot.controls.additional}（効果は未評価）</dd></>}
            {(snapshot.action.owner || snapshot.action.dueOn || snapshot.action.reassessmentOn) && <><dt>対応予定</dt><dd>担当: {snapshot.action.owner || "未入力"} / 期限: {snapshot.action.dueOn || "未入力"} / 再評価: {snapshot.action.reassessmentOn || "未入力"}</dd></>}
          </dl>
          <p><strong>不足・未確認:</strong> {snapshot.missingFields.length ? snapshot.missingFields.map((field) => SNAPSHOT_MISSING_LABEL[field]).join("、") : "保存用の条件欄は入力済み。リスク評価の完了を意味しません。"}</p>
        </> : <p>保存時の作業条件を復元できません。作業時間・換気・数量・SDS・測定値を再確認してください。</p>}
        <p><strong>未評価:</strong> ばく露量・リスクレベル・対策後の残留リスク・製品や保護具の適合性。本記録は正式なRA結果ではありません。最新SDSと公式CREATE-SIMPLE等で評価してください。</p>
        <p>分類の原典取得日時: 未収録（最新原典を確認） / 条件の記録日時: {snapshot?.capturedAt ?? "未確認"}</p>
      </section>
      <table className="chemical-ra-print-ghs" aria-labelledby="chemical-ra-print-ghs-title">
        <colgroup><col className="chemical-ra-print-category-column" /><col /><col className="chemical-ra-print-signal-column" /></colgroup>
        <thead>
          <tr><th colSpan={3}>
            <h2 id="chemical-ra-print-ghs-title">GHSハザード分類（一部収録・{result.ghsHazards.length}項目）</h2>
            <p className="chemical-ra-print-repeat-identity">{result.chemicalName} / CAS番号: {result.casNumber || "未確認"}</p>
            <p className="chemical-ra-print-coverage" data-testid="chemical-ra-print-coverage">{GHS_PARTIAL_COVERAGE_NOTICE}</p>
          </th></tr>
          <tr><th scope="col">危険性・有害性</th><th scope="col">収録されている分類</th><th scope="col">注意喚起語</th></tr>
        </thead>
        <tbody>
          {result.ghsHazards.length > 0 ? result.ghsHazards.map((hazard, index) => (
            <tr key={index}>
              <th scope="row">{hazard.category}</th>
              <td>{hazard.classification}</td>
              <td><strong>{hazard.signal}</strong></td>
            </tr>
          )) : <tr><td colSpan={3}>表示できる分類がありません。危険性の有無は未確認です。最新の製品SDSで確認してください。</td></tr>}
        </tbody>
      </table>
      {sources.length > 0 && (
        <section className="chemical-ra-print-sources" aria-label="分類の参照資料">
          <h2>参照資料</h2>
          {sources.map((source) => (
            <p key={source.url}><a href={source.url}>{source.label}</a><span>{source.url}</span></p>
          ))}
        </section>
      )}
      <div className="chemical-ra-print-signoff"><ChemicalRaSignoffBoxes /></div>
    </article>
  );
}

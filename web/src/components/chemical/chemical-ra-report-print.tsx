/**
 * 化学物質RA A4実施レポート 印刷専用パーツ（Phase B P1-1）。
 *
 * 厚労省「リスクアセスメント等記録様式」相当のヘッダ（自社情報・実施日・実施者）と
 * 確認印枠（実施者・管理者・統括安全衛生責任者）を、印刷時のみ表示する（hidden print:block）。
 * 画面表示は変えず（既存RA結果UIに非干渉）、ブラウザ印刷/PDF保存時にA4記録様式として整う。
 * 記入は印刷後の手書き運用を想定（入力強制なし＝「現場に何かさせない」方針を遵守）。
 */

import type { ChemicalRaResponse } from "@/app/api/chemical-ra/route";
import { GhsPictogram } from "./ghs-pictogram";
import { collectGhsSymbols, GHS_SYMBOL_LABEL } from "@/lib/chemical/ghs-pictogram-map";
import { GHS_PARTIAL_COVERAGE_NOTICE } from "@/lib/chemical/ghs-coverage";

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
 * recordDateIso を渡すと「実施日」をその日付で固定する（台帳から保存済み記録を再印刷する場合に、
 * 当日ではなく実施当時の日付を保つ）。未指定なら当日（新規実施時）。
 */
export function ChemicalRaReportHeader({ recordDateIso, includeCoverageNotice = true }: { recordDateIso?: string; includeCoverageNotice?: boolean } = {}) {
  return (
    <div className="hidden print:block border border-slate-400 p-3 mb-3 text-[11px] text-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">化学物質リスクアセスメント 実施記録</p>
        <p>実施日: {formatRecordDate(recordDateIso)}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
        <p>事業場名: ____________________________</p>
        <p>所属・部署: __________________________</p>
        <p>実施者氏名: __________________________</p>
        <p>対象作業場所: ________________________</p>
      </div>
      <p className="mt-1 text-[10px] text-slate-600">
        ※ 本様式は収録済み公的情報の参考記録であり、正式なリスクアセスメント結果ではありません。最新SDS・実測値・公式CREATE-SIMPLEで確認してください。
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
      <p className="text-[11px] font-bold text-slate-900 mb-1">確認欄</p>
      <div className="grid grid-cols-3 gap-2">
        {roles.map((r) => (
          <div key={r} className="border border-slate-400 h-20 flex flex-col">
            <span className="text-[10px] text-slate-700 px-1 py-0.5 border-b border-slate-300">{r}</span>
            <span className="flex-1" aria-hidden="true" />
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-slate-600">
        ※ 記録は事業場で保存してください（特別管理物質に係る記録は30年保存等、法令に従う）。
      </p>
    </div>
  );
}


/** 画面の操作UIを混ぜず、同じ分類をA4の参照記録に保持する。 */
export function ChemicalRaPrintReport({ result, recordDateIso }: {
  result: ChemicalRaResponse;
  recordDateIso?: string;
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

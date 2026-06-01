/**
 * 化学物質RA A4実施レポート 印刷専用パーツ（Phase B P1-1）。
 *
 * 厚労省「リスクアセスメント等記録様式」相当のヘッダ（自社情報・実施日・実施者）と
 * 確認印枠（実施者・管理者・統括安全衛生責任者）を、印刷時のみ表示する（hidden print:block）。
 * 画面表示は変えず（既存RA結果UIに非干渉）、ブラウザ印刷/PDF保存時にA4記録様式として整う。
 * 記入は印刷後の手書き運用を想定（入力強制なし＝「現場に何かさせない」方針を遵守）。
 */

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
export function ChemicalRaReportHeader({ recordDateIso }: { recordDateIso?: string } = {}) {
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
        ※ 本様式は安衛法第57条の3に基づくリスクアセスメント結果の記録用です。CREATE-SIMPLE準拠の簡易評価を含みます。
      </p>
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

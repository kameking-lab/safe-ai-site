/**
 * 管理区分判定 A4評価記録 印刷専用パーツ。
 *
 * 作業環境測定の結果に基づく評価（管理区分判定）は、安衛則第65条の2・作業環境
 * 測定基準等に基づき記録として保存する義務があり（特別管理物質に係る記録は30年保存）、
 * 第3管理区分の場合は評価結果・改善措置を労働者に周知する必要がある。
 *
 * 本ツールは判定結果のみを表示する電卓だったため、衛生管理者が記録化するには
 * スクリーンショットや転記が必要だった。ブラウザ印刷/PDF保存時のみ、評価記録様式
 * （事業場名・実施者の手書き欄＋測定値の内訳＋確認欄）を表示して記録に使える形に整える。
 * 画面表示には非干渉（hidden print:block）。記入は印刷後の手書き運用を想定（入力強制なし）。
 */

function todayJa(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** "YYYY-MM-DD" を「YYYY年M月D日」に。空・不正値なら空文字。 */
export function formatMeasuredOn(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export interface ClassJudgeRecordMeta {
  /** 単位作業場所の名称（任意） */
  workplace: string;
  /** 測定対象物質名（任意） */
  substance: string;
  /** 測定実施年月日（"YYYY-MM-DD"・任意） */
  measuredOn: string;
  /** 測定対象カテゴリ名 */
  categoryName: string;
  /** 単位 */
  unit: string;
  /** 管理濃度 */
  managementConc: number;
  /** A測定値（幾何平均） */
  aValue: number;
  /** A測定 幾何標準偏差（任意） */
  aGsd?: number;
  useBMeasurement: boolean;
  /** B測定値 */
  bValue?: number;
}

/** 印刷時のみ出る評価記録ヘッダ（事業場名・実施者は手書き欄）。 */
export function ClassJudgeRecordHeader({ meta }: { meta: ClassJudgeRecordMeta }) {
  const measuredOnJa = formatMeasuredOn(meta.measuredOn);
  return (
    <div className="hidden print:block border border-slate-400 p-3 mb-3 text-[11px] text-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">作業環境測定結果 評価記録（管理区分判定）</p>
        <p>評価実施日: {todayJa()}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
        <p>事業場名: ____________________________</p>
        <p>所属・部署: __________________________</p>
        <p>評価実施者氏名: ______________________</p>
        <p>
          単位作業場所:{" "}
          {meta.workplace ? meta.workplace : "____________________"}
        </p>
        <p>
          測定対象物質:{" "}
          {meta.substance ? meta.substance : `${meta.categoryName}`}
        </p>
        <p>
          測定実施年月日:{" "}
          {measuredOnJa ? measuredOnJa : "______年__月__日"}
        </p>
      </div>
      <p className="mt-1 text-[10px] text-slate-600">
        ※ 本様式は作業環境測定の評価結果（管理区分）の記録用です。法令上の最終判定は作業環境測定機関・労働衛生コンサルタントにご確認ください。
      </p>
    </div>
  );
}

/** 印刷時のみ出る測定値の内訳表（判定の根拠を記録に残す）。 */
export function ClassJudgeInputTable({ meta }: { meta: ClassJudgeRecordMeta }) {
  const rows: Array<[string, string]> = [
    ["管理濃度", `${meta.managementConc} ${meta.unit}`],
    ["A測定値（幾何平均）", `${meta.aValue} ${meta.unit}`],
    ["A測定 幾何標準偏差(GSD)", meta.aGsd ? `${meta.aGsd}` : "（未入力：平均値のみで簡易判定）"],
  ];
  if (meta.useBMeasurement && meta.bValue !== undefined) {
    rows.push(["B測定値（最高濃度点）", `${meta.bValue} ${meta.unit}`]);
  }
  return (
    <div className="hidden print:block mt-3 text-[11px] text-slate-900">
      <p className="mb-1 font-bold">測定値の内訳（判定の根拠）</p>
      <table className="w-full border-collapse">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th className="w-1/2 border border-slate-400 px-2 py-1 text-left font-medium">
                {k}
              </th>
              <td className="border border-slate-400 px-2 py-1">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 印刷時のみ出る確認欄＋保存・周知の注記。 */
export function ClassJudgeSignoff() {
  const roles = ["評価実施者", "衛生管理者", "統括安全衛生責任者"];
  return (
    <div className="hidden print:block mt-3 text-slate-900">
      <p className="text-[11px] font-bold mb-1">確認欄</p>
      <div className="grid grid-cols-3 gap-2">
        {roles.map((r) => (
          <div key={r} className="border border-slate-400 h-20 flex flex-col">
            <span className="text-[10px] text-slate-700 px-1 py-0.5 border-b border-slate-300">
              {r}
            </span>
            <span className="flex-1" aria-hidden="true" />
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-slate-600">
        ※ 評価結果と改善措置は記録として保存してください（特別管理物質に係る記録は30年保存等、法令に従う）。
        第3管理区分の場合は、評価結果と改善措置を労働者に周知してください（安衛則第65条の2等）。
      </p>
    </div>
  );
}

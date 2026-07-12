/**
 * 建設計算 提出用計算書（A4帳票）— registry 定義から自動生成する共通基盤。
 *
 * 設計原則:
 * - どの計算機でも registry の `ConstructionCalculator` + 決定論 `compute()` の出力
 *   （`CalcOutcome`）だけから、元請提出・記録綴りに耐えるA4計算書を組み立てる。
 *   計算機ごとの手作り帳票は作らない（新計算機は registry 登録だけで本帳票が付く）。
 * - 記載必須項目（社長要求）: 表題・作成日時・入力条件一覧・使用計算式と代入過程・
 *   判定結果・根拠（条文/基準/出典・版）・注意事項・免責・作成者/確認者の記入欄・
 *   サイト名とURL。
 * - 画面では既定で非表示（`hidden print:block`）。KY用紙（ky-print-sheet.tsx）と
 *   同じ黒罫線の表組みで、globals.css の @media print（@page A4・button非表示等）に乗る。
 * - このコンポーネントは入力値に依存するため CalculatorPanel（client）内で描画するが、
 *   出力HTMLは値・outcome から純粋に決まる（副作用なし）。スナップショットで書式を固定する。
 */

import type { CalcOutcome, CalcValues, ConstructionCalculator } from "@/lib/construction-calc/schema";
import { CALC_DISCLAIMER } from "@/lib/construction-calc/schema";
import { SITE_NAME, SITE_URL } from "@/lib/seo-metadata";

const th = "border border-black bg-slate-100 px-2 py-1 text-left align-top font-bold";
const td = "border border-black px-2 py-1 align-top";

/** select フィールドは value→label へ、number は「値＋単位」へ整形する */
function inputRows(calc: ConstructionCalculator, values: CalcValues): { label: string; value: string }[] {
  return calc.fields.map((f) => {
    const v = values[f.id];
    if (f.kind === "number") {
      return { label: f.label, value: `${v}${f.unit}` };
    }
    const opt = f.options.find((o) => o.value === String(v));
    return { label: f.label, value: opt?.label ?? String(v) };
  });
}

/** 判定トーンの日本語ラベル（帳票では色に頼らず文言で残す） */
function toneLabel(tone: CalcOutcome["tone"]): string {
  switch (tone) {
    case "safe":
      return "適合";
    case "danger":
      return "不適合";
    default:
      return "要確認・条件付き";
  }
}

export function CalcReportSheet({
  calc,
  values,
  outcome,
  /** 作成日時（印刷実行時に client 側で確定した文字列。SSRしないので水和ズレなし） */
  printedAt,
}: {
  calc: ConstructionCalculator;
  values: CalcValues;
  outcome: CalcOutcome;
  printedAt: string;
}) {
  const rows = inputRows(calc, values);
  const resultValue = outcome.value !== undefined ? `${outcome.value}${outcome.unit ?? ""}` : "";

  return (
    <div
      className="calc-report-root mx-auto bg-white text-[9.5pt] leading-relaxed text-black print:text-black"
      style={{ width: "186mm", maxWidth: "100%" }}
    >
      {/* 表題・サイト名・作成日時 */}
      <header className="mb-2 border-b-2 border-black pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[15pt] font-bold leading-tight">計算書</p>
            <p className="mt-0.5 text-[11pt] font-bold">{calc.title}</p>
          </div>
          <div className="shrink-0 text-right text-[8.5pt] leading-snug">
            <p className="font-bold">{SITE_NAME}</p>
            <p>{SITE_URL}</p>
            <p className="mt-1">作成日時：{printedAt}</p>
          </div>
        </div>
        <p className="mt-1 text-[8.5pt] text-slate-700">{calc.summary}</p>
      </header>

      {/* 入力条件一覧 */}
      <section className="mb-2">
        <h2 className="mb-1 text-[10pt] font-bold">1. 入力条件</h2>
        <table className="w-full table-fixed border-collapse">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th className={`${th} w-[40%]`}>{r.label}</th>
                <td className={`${td} w-[60%]`}>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 判定結果 */}
      <section className="mb-2">
        <h2 className="mb-1 text-[10pt] font-bold">2. 判定結果</h2>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <th className={`${th} w-[40%]`}>判定</th>
              <td className={`${td} w-[60%] font-bold`}>
                {toneLabel(outcome.tone)}（{outcome.headline}）
                {resultValue && <span className="ml-2">— {resultValue}</span>}
              </td>
            </tr>
            <tr>
              <th className={th}>結論</th>
              <td className={td}>{outcome.summary}</td>
            </tr>
          </tbody>
        </table>
        {outcome.items.length > 0 && (
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr>
                <th className={`${th} w-[40%]`}>項目</th>
                <th className={`${th} w-[45%]`}>値</th>
                <th className={`${th} w-[15%] text-center`}>判定</th>
              </tr>
            </thead>
            <tbody>
              {outcome.items.map((item) => (
                <tr key={item.label}>
                  <td className={td}>
                    {item.label}
                    {item.note && <span className="block text-[8pt] text-slate-600">（{item.note}）</span>}
                  </td>
                  <td className={td}>{item.value}</td>
                  <td className={`${td} text-center`}>{item.tone ? toneLabel(item.tone) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 使用計算式と代入過程 */}
      <section className="mb-2">
        <h2 className="mb-1 text-[10pt] font-bold">3. 計算式と代入過程</h2>
        <ol className="list-decimal space-y-0.5 border border-black px-5 py-2 pl-7">
          {outcome.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      {/* 根拠（条文・基準・出典・版） */}
      <section className="mb-2">
        <h2 className="mb-1 text-[10pt] font-bold">4. 根拠（法令・基準・出典）</h2>
        <ul className="space-y-1 border border-black px-4 py-2">
          {calc.basis.map((b) => (
            <li key={b.label}>
              <span className="font-bold">{b.label}</span>
              <span className="block text-[8.5pt] text-slate-700">{b.description}</span>
              {b.egovUrl && <span className="block text-[8pt] text-slate-600">原文：{b.egovUrl}</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* 注意事項（固定＋この条件固有の警告） */}
      <section className="mb-2">
        <h2 className="mb-1 text-[10pt] font-bold">5. 注意事項</h2>
        <ul className="list-disc space-y-0.5 border border-black px-6 py-2">
          {outcome.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
          {calc.cautions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      {/* 免責 */}
      <section className="mb-2">
        <h2 className="mb-1 text-[10pt] font-bold">6. 免責</h2>
        <p className="border border-black px-3 py-2 text-[8.5pt] leading-snug">{CALC_DISCLAIMER}</p>
      </section>

      {/* 作成者・確認者の記入欄 */}
      <section>
        <h2 className="mb-1 text-[10pt] font-bold">7. 作成・確認</h2>
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-1/2 text-center`}>作成者（署名・印）</th>
              <th className={`${th} w-1/2 text-center`}>確認者（署名・印）</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={td} style={{ height: "22mm" }}>
                <span className="text-[8pt] text-slate-600">氏名：　　　　　　　　　　日付：</span>
              </td>
              <td className={td}>
                <span className="text-[8pt] text-slate-600">氏名：　　　　　　　　　　日付：</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <p className="mt-2 text-[8pt] text-slate-600">
        本計算書は {SITE_NAME}（{SITE_URL}）の建設計算コーナーで作成しました。計算は法令根拠つきの検証済み計算式（決定論）によります。
      </p>
    </div>
  );
}

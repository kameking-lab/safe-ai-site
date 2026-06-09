"use client";

/**
 * 多言語安全教育 教育実施記録パーツ。
 *
 * 教材ビルダーは教材を表示・印刷するだけで「誰に・いつ・何語で教育したか」を
 * 残せなかった。雇入れ時教育（安衛則第35条）・技能実習生の安全衛生教育は記録の
 * 保存／提示を求められるため、画面では任意入力フォーム、印刷時のみ実施記録様式
 * （実施日・実施者・使用言語＋受講者名簿＋署名欄）を出す。画面には非干渉。
 */

import {
  formatRecordDate,
  formatUsedLanguages,
  type RecordRow,
} from "@/lib/foreign-worker-training-record";
import {
  MATERIAL_INDUSTRY_LABELS_JA,
  MATERIAL_TOPIC_LABELS_JA,
  type MaterialIndustry,
  type MaterialLanguage,
  type MaterialTopic,
} from "@/types/foreign-worker";

export interface TrainingRecordMeta {
  /** 実施年月日（"YYYY-MM-DD"・任意） */
  date: string;
  /** 実施者（講師）氏名（任意） */
  instructor: string;
  /** 事業場・現場名（任意） */
  worksite: string;
}

/** 画面用：教育実施記録の任意入力フォーム（印刷時は隠す）。 */
export function TrainingRecordInputCard({
  meta,
  onChange,
  attendeesRaw,
  onAttendeesChange,
}: {
  meta: TrainingRecordMeta;
  onChange: (next: TrainingRecordMeta) => void;
  attendeesRaw: string;
  onAttendeesChange: (next: string) => void;
}) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4 print:hidden">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
        教育実施記録を作成（印刷して保管）
      </summary>
      <p className="mt-2 text-xs text-slate-600">
        雇入れ時教育（安衛則第35条）や技能実習生の安全衛生教育は、実施した記録の保存・提示を
        求められます。下記を入力して印刷すると、教材の末尾に「実施記録（受講者名簿・署名欄）」が
        付いた状態で出力できます（未入力でも空欄の様式として印刷できます）。
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">実施年月日</span>
          <input
            type="date"
            value={meta.date}
            onChange={(e) => onChange({ ...meta, date: e.target.value })}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">
            実施者（講師）氏名
          </span>
          <input
            type="text"
            value={meta.instructor}
            onChange={(e) => onChange({ ...meta, instructor: e.target.value })}
            placeholder="例：安全 太郎"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">
            事業場・現場名
          </span>
          <input
            type="text"
            value={meta.worksite}
            onChange={(e) => onChange({ ...meta, worksite: e.target.value })}
            placeholder="例：〇〇製作所 第2工場"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-semibold text-slate-600">
          受講者氏名（1行に1名・任意）
        </span>
        <textarea
          value={attendeesRaw}
          onChange={(e) => onAttendeesChange(e.target.value)}
          rows={4}
          placeholder={"例：\nグエン・バン・A\nチャン・ティ・B"}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-[11px] text-slate-500">
          入力した氏名は名簿に印字されます。国籍・在留資格・署名は印刷後に手書きで記入する欄になります。
        </span>
      </label>
    </details>
  );
}

/** 印刷時のみ出る記録ヘッダ（実施日・実施者・教材・使用言語）。 */
export function TrainingRecordPrintHeader({
  meta,
  industry,
  topic,
  langs,
}: {
  meta: TrainingRecordMeta;
  industry: MaterialIndustry;
  topic: MaterialTopic;
  langs: MaterialLanguage[];
}) {
  const dateJa = formatRecordDate(meta.date);
  return (
    <div className="hidden print:block border border-slate-400 p-3 mb-3 text-[11px] text-slate-900">
      <p className="text-sm font-bold">安全衛生教育 実施記録</p>
      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
        <p>実施年月日: {dateJa ? dateJa : "______年__月__日"}</p>
        <p>
          事業場・現場名:{" "}
          {meta.worksite ? meta.worksite : "____________________"}
        </p>
        <p>
          実施者（講師）:{" "}
          {meta.instructor ? meta.instructor : "____________________"}
        </p>
        <p>
          教材: {MATERIAL_INDUSTRY_LABELS_JA[industry]}／
          {MATERIAL_TOPIC_LABELS_JA[topic]}
        </p>
        <p className="col-span-2">使用言語: {formatUsedLanguages(langs)}</p>
      </div>
      <p className="mt-1 text-[10px] text-slate-600">
        ※ 雇入れ時教育（労働安全衛生法第59条・安衛則第35条）等の記録としてご活用ください。
        母国語で教育を行ったことの証跡として、使用言語を併記しています。
      </p>
    </div>
  );
}

/** 印刷時のみ出る受講者名簿（署名＝理解確認欄は手書き）。 */
export function TrainingRecordRoster({ rows }: { rows: RecordRow[] }) {
  return (
    <div className="hidden print:block mt-3 text-[11px] text-slate-900 break-inside-avoid">
      <p className="mb-1 font-bold">受講者名簿（署名＝教育内容を理解した確認）</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-8 border border-slate-400 px-1 py-1 text-center font-medium">
              No.
            </th>
            <th className="border border-slate-400 px-2 py-1 text-left font-medium">
              氏名
            </th>
            <th className="w-1/5 border border-slate-400 px-2 py-1 text-left font-medium">
              国籍
            </th>
            <th className="w-1/5 border border-slate-400 px-2 py-1 text-left font-medium">
              在留資格
            </th>
            <th className="w-1/4 border border-slate-400 px-2 py-1 text-left font-medium">
              署名（理解確認）
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.no} className="break-inside-avoid">
              <td className="border border-slate-400 px-1 py-1 text-center align-top h-7">
                {r.no}
              </td>
              <td className="border border-slate-400 px-2 py-1 align-top">
                {r.name}
              </td>
              <td className="border border-slate-400 px-2 py-1 align-top" />
              <td className="border border-slate-400 px-2 py-1 align-top" />
              <td className="border border-slate-400 px-2 py-1 align-top" />
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-slate-600">
        ※ 国籍・在留資格・署名は受講者本人が記入してください。本記録は事業場で保存してください。
      </p>
    </div>
  );
}

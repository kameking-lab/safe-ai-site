"use client";

import { useCallback } from "react";
import type {
  KyInstructionRecordState,
  KyInstructionRiskRow,
  KyInstructionParticipant,
} from "@/lib/types/operations";

/**
 * KY活動記録表 (危険予知活動) — 用紙ファースト型レイアウト
 *
 * 既存 KyInstructionRecordState を再利用しデータ互換を保つ。
 * 既存フィールドにマッピング:
 *  - 日付: workDateYear/Month/Day
 *  - 天候: weather
 *  - 現場名: reportStamps[0]
 *  - 作成者: reportStamps[1]
 *  - 作業内容: workRows[0].workDetail
 *  - 危険要因 ①〜④: riskRows[1..4].hazard
 *  - 重点危険 (◎): riskRows[i].targetLabel に "◎" を立てる
 *  - 対策 ①〜③: riskRows[1..3].reduction
 *  - 重点目標: closingNote
 *  - 指差呼称: riskRows[0].reduction (自由記述スロット)
 *  - 参加者 氏名/印: participants[i].name / participants[i].preWork
 */

const WEATHER_OPTIONS = ["晴", "曇", "雨", "雪", "強風", "猛暑"] as const;
const RISK_LABEL_NORMAL = "○";
const RISK_LABEL_FOCUS = "◎";

type SheetProps = {
  record: KyInstructionRecordState;
  patch: (p: Partial<KyInstructionRecordState>) => void;
  /** 完成形プレビュー (編集UI非表示) */
  previewMode?: boolean;
};

export function KyPaperSheet({ record, patch, previewMode = false }: SheetProps) {
  const updateRisk = useCallback(
    (i: number, partial: Partial<KyInstructionRiskRow>) => {
      const next = record.riskRows.map((r, idx) =>
        idx === i ? { ...r, ...partial } : r
      );
      patch({ riskRows: next });
    },
    [record.riskRows, patch]
  );

  const updateParticipant = useCallback(
    (i: number, partial: Partial<KyInstructionParticipant>) => {
      const next = record.participants.map((p, idx) =>
        idx === i ? { ...p, ...partial } : p
      );
      patch({ participants: next });
    },
    [record.participants, patch]
  );

  const updateWorkRow0 = useCallback(
    (workDetail: string) => {
      const next = record.workRows.map((r, idx) =>
        idx === 0 ? { ...r, workDetail } : r
      );
      patch({ workRows: next });
    },
    [record.workRows, patch]
  );

  const toggleFocus = useCallback(
    (i: number) => {
      const next = record.riskRows.map((r, idx) => {
        if (idx === i) {
          return {
            ...r,
            targetLabel:
              r.targetLabel === RISK_LABEL_FOCUS
                ? RISK_LABEL_NORMAL
                : RISK_LABEL_FOCUS,
          };
        }
        // 1つだけ◎にしたい場合は他を○に戻す
        return r.targetLabel === RISK_LABEL_FOCUS
          ? { ...r, targetLabel: RISK_LABEL_NORMAL }
          : r;
      });
      patch({ riskRows: next });
    },
    [record.riskRows, patch]
  );

  // riskRows: [0] は自由記述欄、[1..4] が ①〜④
  const dangerRows = record.riskRows.slice(1, 5);
  const participants = record.participants.slice(0, 8);
  const freeNoteRow = record.riskRows[0];
  const readOnly = previewMode;

  return (
    <article
      className="mx-auto w-full max-w-[820px] bg-white text-slate-900 shadow-lg ring-1 ring-slate-300 print:shadow-none print:ring-0"
      aria-label="KY活動記録表"
    >
      <div className="p-5 sm:p-7 print:p-4">
        {/* タイトル帯 */}
        <header className="flex items-end justify-between border-b-2 border-slate-700 pb-2">
          <h1 className="text-xl font-extrabold tracking-wide text-slate-900 sm:text-2xl">
            KY活動記録表
            <span className="ml-2 text-xs font-medium text-slate-500">
              （危険予知活動）
            </span>
          </h1>
          <div className="text-[10px] text-slate-500">
            4ラウンド法 / 朝礼3分で記入
          </div>
        </header>

        {/* 上部メタ情報 */}
        <section className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-b border-slate-400 pb-3 text-xs sm:grid-cols-5">
          <FieldCell label="日付">
            <DateField
              year={record.workDateYear}
              month={record.workDateMonth}
              day={record.workDateDay}
              onChange={(y, m, d) =>
                patch({ workDateYear: y, workDateMonth: m, workDateDay: d })
              }
              readOnly={readOnly}
            />
          </FieldCell>
          <FieldCell label="天候">
            <WeatherField
              value={record.weather}
              onChange={(weather) => patch({ weather })}
              readOnly={readOnly}
            />
          </FieldCell>
          <FieldCell label="現場名" className="col-span-2">
            <PaperInput
              value={record.reportStamps[0] ?? ""}
              onChange={(v) => {
                const next = [...record.reportStamps] as KyInstructionRecordState["reportStamps"];
                next[0] = v;
                patch({ reportStamps: next });
              }}
              placeholder="例: 〇〇ビル新築工事 1F"
              readOnly={readOnly}
            />
          </FieldCell>
          <FieldCell label="作成者">
            <PaperInput
              value={record.reportStamps[1] ?? ""}
              onChange={(v) => {
                const next = [...record.reportStamps] as KyInstructionRecordState["reportStamps"];
                next[1] = v;
                patch({ reportStamps: next });
              }}
              placeholder="氏名"
              readOnly={readOnly}
            />
          </FieldCell>
        </section>

        {/* 作業内容 */}
        <Section title="作業内容" round="">
          <PaperTextarea
            value={record.workRows[0]?.workDetail ?? ""}
            onChange={updateWorkRow0}
            placeholder="例: 2階スラブ配筋・型枠組立"
            rows={2}
            readOnly={readOnly}
          />
        </Section>

        {/* 1R: どんな危険が潜んでいるか */}
        <Section title="どんな危険が潜んでいるか?" round="1R 現状の把握">
          <ol className="space-y-1.5">
            {dangerRows.map((row, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-500 text-[10px] font-bold text-slate-700">
                  {numberKanji(i + 1)}
                </span>
                <PaperInput
                  value={row.hazard}
                  onChange={(v) => updateRisk(i + 1, { hazard: v })}
                  placeholder={`危険要因 ${i + 1}`}
                  readOnly={readOnly}
                />
              </li>
            ))}
          </ol>
        </Section>

        {/* 2R: 危険のポイント (◎をつける) */}
        <Section title="危険のポイント" round="2R 本質追究">
          <p className="mb-1.5 text-[10px] text-slate-500">
            最重要な要因に ◎ をつける
          </p>
          <ol className="space-y-1">
            {dangerRows.map((row, i) => {
              const focus = row.targetLabel === RISK_LABEL_FOCUS;
              return (
                <li key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFocus(i + 1)}
                    aria-pressed={focus}
                    disabled={readOnly}
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                      focus
                        ? "border-rose-600 bg-rose-50 text-rose-700"
                        : "border-slate-300 bg-white text-slate-400 hover:border-rose-400 hover:text-rose-500"
                    } print:border-slate-700 print:bg-white ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                    title={focus ? "重点危険を解除" : "重点危険に設定"}
                  >
                    {focus ? "◎" : "○"}
                  </button>
                  <span className="flex-1 truncate text-xs text-slate-700">
                    {numberKanji(i + 1)} {row.hazard || <em className="text-slate-300">未入力</em>}
                  </span>
                </li>
              );
            })}
          </ol>
        </Section>

        {/* 3R: 私達はこうする (対策) */}
        <Section title="私達はこうする" round="3R 対策の樹立">
          <ol className="space-y-1.5">
            {dangerRows.slice(0, 3).map((row, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500 bg-emerald-50 text-[10px] font-bold text-emerald-700 print:bg-white">
                  {numberKanji(i + 1)}
                </span>
                <PaperInput
                  value={row.reduction}
                  onChange={(v) => updateRisk(i + 1, { reduction: v })}
                  placeholder={`対策 ${i + 1}`}
                  readOnly={readOnly}
                />
              </li>
            ))}
          </ol>
        </Section>

        {/* 4R: 今日の重点目標 / 指差呼称 */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Section title="今日の重点目標" round="4R 目標設定" compact>
            <PaperTextarea
              value={record.closingNote}
              onChange={(closingNote) => patch({ closingNote })}
              placeholder="例: 親綱の2丁掛けを徹底する"
              rows={2}
              readOnly={readOnly}
            />
          </Section>
          <Section title="指差呼称" round="" compact>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-slate-700">「</span>
              <PaperInput
                value={freeNoteRow?.reduction ?? ""}
                onChange={(v) => updateRisk(0, { reduction: v })}
                placeholder="親綱2丁掛け"
                readOnly={readOnly}
              />
              <span className="whitespace-nowrap text-base font-bold text-slate-700">
                ヨシ!」
              </span>
            </div>
          </Section>
        </div>

        {/* 参加者 */}
        <Section title="参加者 (氏名 / 確認印)" round="">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
            {participants.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 border-b border-slate-300"
              >
                <PaperInput
                  value={p.name}
                  onChange={(v) => updateParticipant(i, { name: v })}
                  placeholder={`氏名${i + 1}`}
                  readOnly={readOnly}
                  className="text-xs"
                />
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-400 text-[9px] text-slate-400"
                  aria-label="確認印"
                >
                  {p.preWork ? (
                    <button
                      type="button"
                      onClick={() =>
                        readOnly ? undefined : updateParticipant(i, { preWork: "" })
                      }
                      disabled={readOnly}
                      className="text-rose-600"
                      title="印を取消"
                    >
                      ◯
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        readOnly ? undefined : updateParticipant(i, { preWork: "✓" })
                      }
                      disabled={readOnly}
                      title="確認印"
                    >
                      印
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* フッター */}
        <footer className="mt-5 flex items-end justify-between border-t border-slate-400 pt-2 text-[10px] text-slate-500">
          <span>※ 本記録表は朝礼時に全員で確認・唱和してください。</span>
          <span>安全AIポータル / KY活動記録</span>
        </footer>
      </div>
    </article>
  );
}

// ─── 小要素 ────────────────────────────────────────────────

function Section({
  title,
  round,
  compact,
  children,
}: {
  title: string;
  round: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={compact ? "mt-3" : "mt-4"}>
      <div className="mb-1.5 flex items-baseline gap-2 border-b border-slate-300 pb-0.5">
        <h2 className="text-sm font-bold text-slate-800">◆ {title}</h2>
        {round && (
          <span className="text-[10px] text-slate-500">{round}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function FieldCell({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-semibold text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function PaperInput({
  value,
  onChange,
  placeholder,
  readOnly,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}) {
  if (readOnly) {
    return (
      <div
        className={`min-h-[24px] w-full border-b border-slate-400 px-1 py-1 text-sm text-slate-900 ${className}`}
      >
        {value || <span className="text-slate-300">—</span>}
      </div>
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border-b border-slate-400 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-300 focus:border-emerald-600 focus:bg-amber-50 focus:outline-none print:border-slate-700 print:bg-white ${className}`}
    />
  );
}

function PaperTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="min-h-[44px] w-full whitespace-pre-wrap border-b border-slate-400 px-1 py-1 text-sm text-slate-900">
        {value || <span className="text-slate-300">—</span>}
      </div>
    );
  }
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none border-b border-slate-400 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-300 focus:border-emerald-600 focus:bg-amber-50 focus:outline-none print:border-slate-700 print:bg-white"
    />
  );
}

function DateField({
  year,
  month,
  day,
  onChange,
  readOnly,
}: {
  year: string;
  month: string;
  day: string;
  onChange: (y: string, m: string, d: string) => void;
  readOnly?: boolean;
}) {
  const value =
    year && month && day
      ? `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      : "";

  if (readOnly) {
    return (
      <div className="border-b border-slate-400 px-1 py-1 text-sm">
        {value ? `${year}/${month}/${day}` : <span className="text-slate-300">—</span>}
      </div>
    );
  }

  return (
    <input
      type="date"
      value={value}
      onChange={(e) => {
        const v = e.target.value; // YYYY-MM-DD
        if (!v) {
          onChange("", "", "");
          return;
        }
        const [y, m, d] = v.split("-");
        onChange(y, String(Number(m)), String(Number(d)));
      }}
      className="w-full border-b border-slate-400 bg-transparent px-1 py-1 text-sm text-slate-900 focus:border-emerald-600 focus:bg-amber-50 focus:outline-none print:border-slate-700 print:bg-white"
    />
  );
}

function WeatherField({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="border-b border-slate-400 px-1 py-1 text-sm">
        {value || <span className="text-slate-300">—</span>}
      </div>
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-b border-slate-400 bg-transparent px-1 py-1 text-sm text-slate-900 focus:border-emerald-600 focus:bg-amber-50 focus:outline-none print:border-slate-700 print:bg-white"
    >
      <option value="">—</option>
      {WEATHER_OPTIONS.map((w) => (
        <option key={w} value={w}>
          {w}
        </option>
      ))}
    </select>
  );
}

function numberKanji(n: number): string {
  return ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"][n - 1] ?? String(n);
}

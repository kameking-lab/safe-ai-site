"use client";

import {
  INDUSTRY_PRESETS,
  WEATHER_OPTIONS,
  type IndustryPreset,
  type Weather,
  type RequiredFields,
  type OptionalFields,
} from "@/lib/safety-diary/schema";

const INDUSTRY_LABELS: Record<IndustryPreset, string> = {
  construction: "建設",
  manufacturing: "製造",
  healthcare: "医療福祉",
  transport: "運輸",
  it: "IT",
  other: "その他",
};

export type DiaryPaperState = {
  industry: IndustryPreset;
  required: RequiredFields;
  optional: OptionalFields;
  /** 任意: 記入者氏名 (schema 外、画面表示のみ) */
  recorderName: string;
  /** 任意: 確認者氏名 */
  supervisorName: string;
};

type SheetProps = {
  state: DiaryPaperState;
  patch: (p: Partial<DiaryPaperState>) => void;
  patchRequired: (p: Partial<RequiredFields>) => void;
  patchOptional: (p: Partial<OptionalFields>) => void;
  previewMode?: boolean;
};

/**
 * 安全衛生日誌 — 用紙ファースト型レイアウト
 * 必須5項目 + 任意4項目 (パトロール・指示・翌日予定・記入者) を1枚に集約。
 */
export function DiaryPaperSheet({
  state,
  patch,
  patchRequired,
  patchOptional,
  previewMode = false,
}: SheetProps) {
  const readOnly = previewMode;
  const { required, optional, industry } = state;

  return (
    <article
      className="mx-auto w-full max-w-[820px] bg-white text-slate-900 shadow-lg ring-1 ring-slate-300 print:shadow-none print:ring-0"
      aria-label="安全衛生日誌"
    >
      <div className="p-5 sm:p-7 print:p-4">
        {/* タイトル帯 */}
        <header className="flex items-end justify-between border-b-2 border-slate-700 pb-2">
          <h1 className="text-xl font-extrabold tracking-wide text-slate-900 sm:text-2xl">
            安全衛生日誌
            <span className="ml-2 text-xs font-medium text-slate-500">
              （現場日次記録）
            </span>
          </h1>
          <div className="text-[10px] text-slate-500">
            必須5項目 / 任意4項目
          </div>
        </header>

        {/* 上部メタ */}
        <section className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-b border-slate-400 pb-3 text-xs sm:grid-cols-5">
          <FieldCell label="日付 *">
            <PaperDateInput
              value={required.date}
              onChange={(date) => patchRequired({ date })}
              readOnly={readOnly}
            />
          </FieldCell>
          <FieldCell label="天候 *">
            <PaperSelect
              value={required.weather}
              onChange={(w) => patchRequired({ weather: w as Weather })}
              options={WEATHER_OPTIONS.map((w) => ({ value: w, label: w }))}
              readOnly={readOnly}
            />
          </FieldCell>
          <FieldCell label="現場名 *" className="col-span-2">
            <PaperInput
              value={required.siteName}
              onChange={(v) => patchRequired({ siteName: v })}
              placeholder="例: 〇〇ビル新築工事 1F"
              readOnly={readOnly}
            />
          </FieldCell>
          <FieldCell label="業種">
            <PaperSelect
              value={industry}
              onChange={(v) => patch({ industry: v as IndustryPreset })}
              options={INDUSTRY_PRESETS.map((id) => ({
                value: id,
                label: INDUSTRY_LABELS[id],
              }))}
              readOnly={readOnly}
            />
          </FieldCell>
        </section>

        {/* 作業内容 */}
        <Section title="作業内容" required>
          <PaperTextarea
            value={required.workContent}
            onChange={(v) => patchRequired({ workContent: v })}
            placeholder="例: 2階スラブ配筋・型枠組立 / 外壁モルタル下地塗"
            rows={2}
            readOnly={readOnly}
          />
        </Section>

        {/* KY結果 */}
        <Section title="KY結果 (朝礼で出した危険・対策)" required>
          <PaperTextarea
            value={required.kyResult}
            onChange={(v) => patchRequired({ kyResult: v })}
            placeholder="例: 高所作業時はフルハーネス着用徹底 / 親綱の点検・2丁掛け"
            rows={4}
            readOnly={readOnly}
          />
        </Section>

        {/* ヒヤリハット */}
        <Section title="ヒヤリハット / 異常" required>
          <div className="flex items-center gap-3 text-xs">
            <NearMissToggle
              checked={required.nearMissOccurred === false}
              label="無し"
              onClick={() => patchRequired({ nearMissOccurred: false, nearMissDetail: undefined })}
              readOnly={readOnly}
              tone="ok"
            />
            <NearMissToggle
              checked={required.nearMissOccurred === true}
              label="有り"
              onClick={() => patchRequired({ nearMissOccurred: true })}
              readOnly={readOnly}
              tone="warn"
            />
          </div>
          {required.nearMissOccurred && (
            <div className="mt-2">
              <PaperTextarea
                value={required.nearMissDetail ?? ""}
                onChange={(v) => patchRequired({ nearMissDetail: v })}
                placeholder="ヒヤリハット内容を簡潔に記録"
                rows={2}
                readOnly={readOnly}
              />
            </div>
          )}
        </Section>

        {/* 安全活動・パトロール / 翌日予定 */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Section title="安全活動・パトロール所見" compact>
            <PaperTextarea
              value={optional.patrolRecord ?? ""}
              onChange={(v) => patchOptional({ patrolRecord: v })}
              placeholder="例: 午前10時 場内巡視。足場の手すり一部緩み、是正済"
              rows={3}
              readOnly={readOnly}
            />
          </Section>
          <Section title="翌日の予定" compact>
            <PaperTextarea
              value={optional.nextDayPlan ?? ""}
              onChange={(v) => patchOptional({ nextDayPlan: v })}
              placeholder="例: 3階スラブ配筋継続、午後 コンクリート打設"
              rows={3}
              readOnly={readOnly}
            />
          </Section>
        </div>

        {/* 安全指示事項 */}
        <Section title="安全指示事項" compact>
          <PaperTextarea
            value={optional.safetyInstructions ?? ""}
            onChange={(v) => patchOptional({ safetyInstructions: v })}
            placeholder="例: 雨天時は高所作業中止。電動工具の絶縁チェック実施"
            rows={2}
            readOnly={readOnly}
          />
        </Section>

        {/* 記入者・確認者 */}
        <section className="mt-5 grid grid-cols-2 gap-3 border-t-2 border-slate-700 pt-2">
          <FieldCell label="記入者">
            <PaperInput
              value={state.recorderName}
              onChange={(v) => patch({ recorderName: v })}
              placeholder="氏名"
              readOnly={readOnly}
            />
          </FieldCell>
          <FieldCell label="現場代理人 / 確認者">
            <div className="flex items-center gap-1.5">
              <PaperInput
                value={state.supervisorName}
                onChange={(v) => patch({ supervisorName: v })}
                placeholder="氏名"
                readOnly={readOnly}
              />
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-400 text-[9px] text-slate-400">
                印
              </span>
            </div>
          </FieldCell>
        </section>

        <footer className="mt-3 flex items-end justify-between border-t border-slate-300 pt-1.5 text-[10px] text-slate-500">
          <span>※ 必須5項目は赤 * 印。任意項目は空欄可。</span>
          <span>安全AIポータル / 安全衛生日誌</span>
        </footer>
      </div>
    </article>
  );
}

function Section({
  title,
  required,
  compact,
  children,
}: {
  title: string;
  required?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={compact ? "mt-3" : "mt-4"}>
      <div className="mb-1.5 flex items-baseline gap-2 border-b border-slate-300 pb-0.5">
        <h2 className="text-sm font-bold text-slate-800">◆ {title}</h2>
        {required && (
          <span className="text-[10px] font-bold text-rose-600">* 必須</span>
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="min-h-[24px] w-full border-b border-slate-400 px-1 py-1 text-sm text-slate-900">
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
      className="w-full border-b border-slate-400 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-300 focus:border-emerald-600 focus:bg-amber-50 focus:outline-none print:border-slate-700 print:bg-white"
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

function PaperDateInput({
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
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-b border-slate-400 bg-transparent px-1 py-1 text-sm text-slate-900 focus:border-emerald-600 focus:bg-amber-50 focus:outline-none print:border-slate-700 print:bg-white"
    />
  );
}

function PaperSelect({
  value,
  onChange,
  options,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  readOnly?: boolean;
}) {
  if (readOnly) {
    const label = options.find((o) => o.value === value)?.label ?? value;
    return (
      <div className="border-b border-slate-400 px-1 py-1 text-sm">
        {label || <span className="text-slate-300">—</span>}
      </div>
    );
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-b border-slate-400 bg-transparent px-1 py-1 text-sm text-slate-900 focus:border-emerald-600 focus:bg-amber-50 focus:outline-none print:border-slate-700 print:bg-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NearMissToggle({
  checked,
  label,
  onClick,
  readOnly,
  tone,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
  readOnly?: boolean;
  tone: "ok" | "warn";
}) {
  const selectedClass =
    tone === "warn"
      ? "border-amber-500 bg-amber-50 text-amber-800"
      : "border-emerald-500 bg-emerald-50 text-emerald-800";
  return (
    <button
      type="button"
      onClick={readOnly ? undefined : onClick}
      disabled={readOnly}
      aria-pressed={checked}
      className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-3 py-1 text-xs font-semibold transition ${
        checked
          ? selectedClass
          : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
      } print:bg-white`}
    >
      <span aria-hidden>{checked ? "●" : "○"}</span>
      {label}
    </button>
  );
}

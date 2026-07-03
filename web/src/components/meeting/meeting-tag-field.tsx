"use client";

/**
 * 各社マトリクスのタグ選択欄（必要資格・予想災害）。クラシック表示・canvas表示（第四弾）で共有。
 */
import { useState } from "react";

export function MeetingTagField({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="rounded border border-slate-300 p-1">
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-800">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-emerald-600 hover:text-emerald-900" aria-label="削除">×</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          onBlur={add}
          placeholder="＋"
          className="min-w-[3rem] flex-1 px-1 text-[11px] outline-none"
          aria-label="追加"
        />
      </div>
    </div>
  );
}

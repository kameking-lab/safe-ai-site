"use client";

import { useId } from "react";

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

/** 片手で押しやすい選択チップ（radio と同じ意味のボタン群） */
export function ChoiceChips<T extends string | number>({
  label,
  options,
  value,
  onChange,
  columns = 2,
  required = false,
  description,
}: {
  label: string;
  options: ReadonlyArray<ChipOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3;
  required?: boolean;
  description?: string;
}) {
  const id = useId();
  const grid = columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-3" : "grid-cols-2";
  const missing = required && value === null;
  return (
    <fieldset className="min-w-0" aria-describedby={description ? `${id}-d` : undefined}>
      <legend className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
        {label}
        {missing && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
            選択してください
          </span>
        )}
      </legend>
      {description && (
        <p id={`${id}-d`} className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
          {description}
        </p>
      )}
      <div role="radiogroup" aria-label={label} className={`mt-2 grid ${grid} gap-2`}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`flex min-h-12 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                selected
                  ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-600"
                  : "border-slate-300 bg-white text-slate-800 hover:border-emerald-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              }`}
            >
              <span>{option.label}</span>
              {option.hint && (
                <span className={`text-[11px] font-normal ${selected ? "text-emerald-50" : "text-slate-600 dark:text-slate-400"}`}>
                  {option.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function YesNoChips({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}) {
  return (
    <ChoiceChips<"yes" | "no">
      label={label}
      description={description}
      options={[
        { value: "yes", label: "はい" },
        { value: "no", label: "いいえ" },
      ]}
      value={value ? "yes" : "no"}
      onChange={(v) => onChange(v === "yes")}
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import { Type, Sun, Sparkles, X, Check } from "lucide-react";
import { useFurigana } from "@/contexts/furigana-context";
import { useEasyJapanese } from "@/contexts/easy-japanese-context";

const ONBOARDING_KEY = "anzen-onboarding-v1-seen";
const LARGE_FONT_KEY = "large-font-enabled";
const HIGH_CONTRAST_KEY = "high-contrast-enabled";

/**
 * 初回訪問時のアクセシビリティ設定モーダル。
 * ID_093（70代清掃員・孫がいないと文字大を見つけられない）の指摘に応じ、
 * 3つの主要アクセシビリティ設定（文字大・屋外モード・やさしい日本語）を
 * 最初に大きな選択肢として提示する。スキップ可能。
 */
export function FirstVisitOnboarding() {
  const [open, setOpen] = useState(false);
  const [largeFont, setLargeFont] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const { easyJapaneseEnabled, setEasyJapaneseEnabled } = useEasyJapaneseCompat();
  const { furiganaEnabled } = useFurigana();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem(ONBOARDING_KEY);
      if (!seen) setOpen(true);
    } catch {
      // localStorage利用不可の場合はスキップ
    }
  }, []);

  const save = () => {
    try {
      localStorage.setItem(LARGE_FONT_KEY, String(largeFont));
      localStorage.setItem(HIGH_CONTRAST_KEY, String(highContrast));
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      /* noop */
    }
    if (largeFont) document.documentElement.classList.add("large-font");
    if (highContrast) document.documentElement.classList.add("high-contrast");
    setOpen(false);
    // ページ全体で state を再評価させるためリロード
    window.location.reload();
  };

  const skip = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="onboarding-title"
            className="text-lg font-bold text-slate-900 sm:text-xl"
          >
            見やすい表示にしませんか？
          </h2>
          <button
            type="button"
            onClick={skip}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="スキップして閉じる"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-4 text-sm leading-relaxed text-slate-700">
            現場でも見やすくするために、以下をまとめて設定できます。
            あとからメニューでいつでも変更できます。
          </p>

          <ul className="space-y-3">
            <OptionRow
              id="opt-large"
              icon={<Type className="h-6 w-6 text-emerald-600" aria-hidden="true" />}
              title="文字を大きくする"
              description="本文とボタンを一回り大きく表示します。老眼の方におすすめ。"
              checked={largeFont}
              onChange={setLargeFont}
            />
            <OptionRow
              id="opt-contrast"
              icon={<Sun className="h-6 w-6 text-amber-600" aria-hidden="true" />}
              title="屋外でもハッキリ見える"
              description="直射日光下でも読めるよう、コントラストを強調します。"
              checked={highContrast}
              onChange={setHighContrast}
            />
            <OptionRow
              id="opt-easy"
              icon={<Sparkles className="h-6 w-6 text-blue-600" aria-hidden="true" />}
              title="やさしい日本語モード"
              description="専門用語を平易な表現に置き換えます。外国人の方・新人の方に。"
              checked={easyJapaneseEnabled}
              onChange={setEasyJapaneseEnabled}
            />
          </ul>

          <p className="mt-4 text-xs text-slate-500">
            ふりがな（{furiganaEnabled ? "ON" : "OFF"}）や多言語切替はヘッダー右上のボタンからいつでも切替できます。
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row-reverse">
          <button
            type="button"
            onClick={save}
            className="inline-flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Check className="h-5 w-5" aria-hidden="true" />
            この設定で始める
          </button>
          <button
            type="button"
            onClick={skip}
            className="inline-flex min-h-[56px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            スキップ
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  id,
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li>
      <label
        htmlFor={id}
        className={`flex min-h-[72px] cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
          checked
            ? "border-emerald-500 bg-emerald-50"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
        />
        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1">
          <span className="block text-base font-bold text-slate-900">{title}</span>
          <span className="mt-0.5 block text-xs text-slate-600">{description}</span>
        </span>
      </label>
    </li>
  );
}

/**
 * easy-japanese-context に setter が公開されていない場合も壊れないよう
 * safe な薄いラッパーを提供する。
 */
function useEasyJapaneseCompat() {
  const ctx = useEasyJapanese() as unknown as {
    easyJapaneseEnabled: boolean;
    toggleEasyJapanese: () => void;
    setEasyJapaneseEnabled?: (v: boolean) => void;
  };
  const setEasyJapaneseEnabled = (v: boolean) => {
    if (ctx.setEasyJapaneseEnabled) {
      ctx.setEasyJapaneseEnabled(v);
      return;
    }
    if (ctx.easyJapaneseEnabled !== v) ctx.toggleEasyJapanese();
  };
  return {
    easyJapaneseEnabled: ctx.easyJapaneseEnabled,
    setEasyJapaneseEnabled,
  };
}

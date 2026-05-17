"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MATERIAL_INDUSTRY_LABELS_JA,
  MATERIAL_INDUSTRY_LABELS_EN,
  MATERIAL_LANGUAGES,
  MATERIAL_LANGUAGE_LABELS,
  MATERIAL_LANGUAGE_LABELS_JA,
  MATERIAL_TOPIC_LABELS_JA,
  MATERIAL_TOPIC_LABELS_EN,
  type MaterialIndustry,
  type MaterialLanguage,
  type MaterialTopic,
  type SafetyMaterial,
} from "@/types/foreign-worker";

interface BuilderProps {
  /** Pre-filtered materials for the current industry only (~25 KB vs 148 KB for all). */
  materials: SafetyMaterial[];
  industries: MaterialIndustry[];
  topics: MaterialTopic[];
  /** The industry whose materials were pre-fetched server-side (drives URL navigation on change). */
  currentIndustry: MaterialIndustry;
}

const TEXT_DIR: Record<MaterialLanguage, "ltr"> = {
  "ja-easy": "ltr",
  en: "ltr",
  vi: "ltr",
  zh: "ltr",
  id: "ltr",
};

function LangCell({
  text,
  lang,
}: {
  text: string;
  lang: MaterialLanguage;
}) {
  return (
    <p
      lang={lang === "ja-easy" ? "ja" : lang}
      dir={TEXT_DIR[lang]}
      className="text-sm leading-relaxed text-slate-800"
    >
      {text}
    </p>
  );
}

export function SafetyTrainingBuilder({
  materials,
  industries,
  topics,
  currentIndustry,
}: BuilderProps) {
  const router = useRouter();
  const [topic, setTopic] = useState<MaterialTopic>(topics[0]);
  const [selectedLangs, setSelectedLangs] = useState<MaterialLanguage[]>([
    "ja-easy",
    "en",
    "vi",
  ]);

  const material = useMemo(
    () => materials.find((m) => m.topic === topic),
    [materials, topic],
  );

  function handleIndustryChange(next: MaterialIndustry) {
    router.push(`?industry=${next}`);
  }

  function toggleLang(l: MaterialLanguage) {
    setSelectedLangs((prev) =>
      prev.includes(l) ? prev.filter((p) => p !== l) : [...prev, l],
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 print:hidden">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">業種</span>
            <select
              value={currentIndustry}
              onChange={(e) => handleIndustryChange(e.target.value as MaterialIndustry)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {industries.map((i) => (
                <option key={i} value={i}>
                  {MATERIAL_INDUSTRY_LABELS_JA[i]} ({MATERIAL_INDUSTRY_LABELS_EN[i]})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">トピック</span>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value as MaterialTopic)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {topics.map((t) => (
                <option key={t} value={t}>
                  {MATERIAL_TOPIC_LABELS_JA[t]} ({MATERIAL_TOPIC_LABELS_EN[t]})
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-xs font-semibold text-slate-600">言語（複数選択可）</span>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {MATERIAL_LANGUAGES.map((l) => {
                const active = selectedLangs.includes(l);
                return (
                  <li key={l}>
                    <button
                      type="button"
                      onClick={() => toggleLang(l)}
                      aria-pressed={active}
                      className={
                        "rounded-full border px-3 py-1 text-xs transition " +
                        (active
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
                      }
                    >
                      {MATERIAL_LANGUAGE_LABELS_JA[l]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            印刷 / PDF出力
          </button>
        </div>
      </div>

      {!material ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          該当する教材が見つかりません。組み合わせを変更してください。
        </div>
      ) : (
        <article className="rounded-lg border border-slate-200 bg-white p-5 md:p-7 print:border-0 print:p-0">
          <header className="border-b border-slate-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              {MATERIAL_INDUSTRY_LABELS_EN[material.industry]} ·{" "}
              {MATERIAL_TOPIC_LABELS_EN[material.topic]}
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {MATERIAL_INDUSTRY_LABELS_JA[material.industry]}：
              {MATERIAL_TOPIC_LABELS_JA[material.topic]}
            </h2>
          </header>

          <section className="mt-4">
            <h3 className="text-sm font-bold text-slate-700">タイトル / Title</h3>
            <div className="mt-2 grid gap-2">
              {selectedLangs.map((l) => (
                <div key={l} className="rounded border border-slate-100 bg-slate-50 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {MATERIAL_LANGUAGE_LABELS_JA[l]} · {MATERIAL_LANGUAGE_LABELS[l]}
                  </p>
                  <LangCell text={material.title[l]} lang={l} />
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4">
            <h3 className="text-sm font-bold text-slate-700">導入 / Introduction</h3>
            <div className="mt-2 grid gap-2">
              {selectedLangs.map((l) => (
                <div key={l} className="rounded border border-slate-100 bg-slate-50 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {MATERIAL_LANGUAGE_LABELS_JA[l]}
                  </p>
                  <LangCell text={material.intro[l]} lang={l} />
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-bold text-slate-700">
              チェックリスト / Checklist
            </h3>
            <ol className="mt-2 space-y-3 list-decimal pl-5">
              {material.checklist.map((b) => (
                <li key={b.id}>
                  <div className="grid gap-1">
                    {selectedLangs.map((l) => (
                      <div key={l}>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {MATERIAL_LANGUAGE_LABELS_JA[l]}：
                        </span>
                        <LangCell text={b.text[l]} lang={l} />
                      </div>
                    ))}
                    {b.illustrationHint && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        🖼 イラスト推奨：{b.illustrationHint}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3">
            <h3 className="text-sm font-bold text-rose-900">
              緊急時の対応 / Emergency Response
            </h3>
            <ul className="mt-2 space-y-3">
              {material.emergency.map((b) => (
                <li key={b.id} className="border-t border-rose-200/60 pt-2 first:border-t-0 first:pt-0">
                  <div className="grid gap-1">
                    {selectedLangs.map((l) => (
                      <div key={l}>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                          {MATERIAL_LANGUAGE_LABELS_JA[l]}：
                        </span>
                        <LangCell text={b.text[l]} lang={l} />
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <footer className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-500">
            出典：{material.source}
          </footer>
        </article>
      )}
    </div>
  );
}

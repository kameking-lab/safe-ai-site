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
import {
  buildRecordRows,
  parseAttendeeNames,
} from "@/lib/foreign-worker-training-record";
import {
  IndustryPictogram,
  INDUSTRY_SHORT_LABELS_JA,
  TopicPictogram,
  TOPIC_SHORT_LABELS_JA,
} from "./topic-pictograms";
import {
  TrainingRecordInputCard,
  TrainingRecordPrintHeader,
  TrainingRecordRoster,
  type TrainingRecordMeta,
} from "./training-record";

/** 受講者名が少ない/未入力でも手書きできるよう確保する名簿の最低行数。 */
const MIN_ROSTER_ROWS = 10;

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
  const [recordMeta, setRecordMeta] = useState<TrainingRecordMeta>({
    date: "",
    instructor: "",
    worksite: "",
  });
  const [attendeesRaw, setAttendeesRaw] = useState("");

  const material = useMemo(
    () => materials.find((m) => m.topic === topic),
    [materials, topic],
  );

  const rosterRows = useMemo(
    () => buildRecordRows(parseAttendeeNames(attendeesRaw), MIN_ROSTER_ROWS),
    [attendeesRaw],
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
        {/* 柱0: 業種・トピックはピクトグラムのデカボタンで選ぶ（読まなくても選べる） */}
        <div className="space-y-4">
          <fieldset>
            <legend className="text-xs font-semibold text-slate-600">業種</legend>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {industries.map((i) => {
                const active = i === currentIndustry;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleIndustryChange(i)}
                    aria-pressed={active}
                    aria-label={`${MATERIAL_INDUSTRY_LABELS_JA[i]} (${MATERIAL_INDUSTRY_LABELS_EN[i]})`}
                    title={MATERIAL_INDUSTRY_LABELS_JA[i]}
                    className={
                      "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition " +
                      (active
                        ? "border-sky-700 bg-sky-700 text-white shadow-sm"
                        : "border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50")
                    }
                  >
                    <IndustryPictogram industry={i} className="h-7 w-7" />
                    <span className="text-xs font-bold leading-none">
                      {INDUSTRY_SHORT_LABELS_JA[i]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-semibold text-slate-600">トピック</legend>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {topics.map((t) => {
                const active = t === topic;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    aria-pressed={active}
                    aria-label={`${MATERIAL_TOPIC_LABELS_JA[t]} (${MATERIAL_TOPIC_LABELS_EN[t]})`}
                    title={MATERIAL_TOPIC_LABELS_JA[t]}
                    className={
                      "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition " +
                      (active
                        ? "border-sky-700 bg-sky-700 text-white shadow-sm"
                        : "border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50")
                    }
                  >
                    <TopicPictogram topic={t} className="h-7 w-7" />
                    <span className="text-xs font-bold leading-none">
                      {TOPIC_SHORT_LABELS_JA[t]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-semibold text-slate-600">
              言語（複数選択可）
            </legend>
            {/* 読む本人が見つけられるよう、ネイティブ表記を主・日本語表記を従にする */}
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {MATERIAL_LANGUAGES.map((l) => {
                const active = selectedLangs.includes(l);
                return (
                  <li key={l}>
                    <button
                      type="button"
                      onClick={() => toggleLang(l)}
                      aria-pressed={active}
                      className={
                        "min-h-[44px] rounded-xl border px-3.5 py-1.5 text-left transition " +
                        (active
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
                      }
                    >
                      <span className="block text-sm font-bold leading-tight">
                        {MATERIAL_LANGUAGE_LABELS[l]}
                      </span>
                      {l !== "ja-easy" && (
                        <span className="block text-[10px] leading-tight opacity-80">
                          {MATERIAL_LANGUAGE_LABELS_JA[l]}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            印刷 / PDF出力
          </button>
        </div>
      </div>

      <TrainingRecordInputCard
        meta={recordMeta}
        onChange={setRecordMeta}
        attendeesRaw={attendeesRaw}
        onAttendeesChange={setAttendeesRaw}
      />

      {!material ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          該当する教材が見つかりません。組み合わせを変更してください。
        </div>
      ) : (
        <article className="rounded-lg border border-slate-200 bg-white p-5 md:p-7 print:border-0 print:p-0">
          <TrainingRecordPrintHeader
            meta={recordMeta}
            industry={material.industry}
            topic={material.topic}
            langs={selectedLangs}
          />
          {/* 柱0: ピクトグラムは印刷物にも載せる — 文字が読めなくても何の教材か分かる */}
          <header className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <TopicPictogram
              topic={material.topic}
              title={MATERIAL_TOPIC_LABELS_JA[material.topic]}
              className="h-14 w-14 shrink-0 text-sky-800"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                {MATERIAL_INDUSTRY_LABELS_EN[material.industry]} ·{" "}
                {MATERIAL_TOPIC_LABELS_EN[material.topic]}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {MATERIAL_INDUSTRY_LABELS_JA[material.industry]}：
                {MATERIAL_TOPIC_LABELS_JA[material.topic]}
              </h2>
            </div>
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

          <TrainingRecordRoster rows={rosterRows} />
        </article>
      )}
    </div>
  );
}

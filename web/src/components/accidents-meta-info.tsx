"use client";

import { useLanguage } from "@/contexts/language-context";

interface AccidentsMetaInfoProps {
  total: number;
  mhlw: number;
  curated: number;
  synthetic: number;
}

export function AccidentsMetaInfo({ total, mhlw, curated, synthetic }: AccidentsMetaInfoProps) {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-600">
        {isEn ? `${total} cases (` : `収録 ${total} 件（`}
        <span className="font-semibold text-emerald-700">
          {isEn ? `MHLW ${mhlw}` : `厚労省 ${mhlw}`}
        </span>
        ／<span className="font-semibold text-sky-700">curated {curated}</span>
        {synthetic > 0 ? (
          <>
            ／
            <span className="font-semibold text-amber-700">
              {isEn ? `synthetic ${synthetic}` : `合成 ${synthetic}`}
            </span>
          </>
        ) : null}
        {isEn ? ")" : "）"}
      </span>
    </>
  );
}

export function AccidentsMetaCaption() {
  const { language } = useLanguage();
  const isEn = language === "en";
  if (isEn) {
    return (
      <p className="mt-1 text-[10px] text-slate-500">
        Breakdown: see{" "}
        <a href="/about/data-sources" className="underline hover:text-slate-700">
          Data sources
        </a>
        . <strong>MHLW</strong> = re-curated from the workplace-safety site,{" "}
        <strong>curated</strong> = open data restructured by the editorial team (proper nouns anonymized),{" "}
        <strong>synthetic</strong> = training-coverage supplements.
      </p>
    );
  }
  return (
    <p className="mt-1 text-[10px] text-slate-500">
      内訳の定義:{" "}
      <a href="/about/data-sources" className="underline hover:text-slate-700">
        データソース一覧
      </a>{" "}
      を参照。<strong>厚労省</strong> = 職場のあんぜんサイト由来の再収録、
      <strong>curated</strong> = 公開情報・統計を編集部が再構成（固有名詞匿名化）、
      <strong>合成</strong> = 教材用カバレッジ補完事例。
    </p>
  );
}

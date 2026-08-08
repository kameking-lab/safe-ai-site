import { AlertTriangle, ExternalLink } from "lucide-react";

const OFFICIAL_ACCIDENT_SEARCH_URL =
  "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_FND.aspx";

/**
 * Individual accident records remain quarantined until each local record can
 * be traced to its official primary source. The morning briefing must show an
 * explicit unavailable state instead of substituting an unverified example or
 * implying that no relevant accident exists.
 */
export function SignageAccidentEducation({
  lang = "ja",
}: {
  lang?: string;
  category?: string;
}) {
  if (lang !== "ja") return null;

  return (
    <section
      className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-5 text-slate-900 shadow-lg sm:p-6 print:border-slate-500 print:shadow-none"
      aria-labelledby="accident-education-status"
    >
      <h2
        id="accident-education-status"
        className="flex items-start gap-2 text-lg font-bold text-amber-950"
      >
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        過去事故の自動表示は確認待ちです
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-800">
        個別事故と一次資料の対応を確認できていないため、朝礼用の事故事例を表示していません。「該当事故なし」や「安全」を意味しません。
      </p>
      <a
        href={OFFICIAL_ACCIDENT_SEARCH_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-700 bg-white px-4 py-2 text-sm font-bold text-amber-950 underline decoration-amber-500 underline-offset-4"
      >
        厚生労働省「職場のあんぜんサイト」で確認
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </section>
  );
}

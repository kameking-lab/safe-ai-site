import Image from "next/image";

/**
 * Print-only page header strip that appears at the top of the
 * accident-report PDF. Hidden on screen, visible only when @media print.
 *
 * Includes report title, industry label, today's date, and the issuer
 * (ANZEN AI Portal). The actual page-number markers are drawn via
 * the @page CSS counter in globals.css.
 */
export function ReportPrintMeta({
  industryLabel,
  populationLabel,
  yearRange,
  generatedAt,
}: {
  industryLabel: string;
  populationLabel: string;
  yearRange: string;
  generatedAt: string;
}) {
  return (
    <div className="hidden print:block">
      <div className="report-print-header">
        <div className="flex items-center gap-2">
          <Image
            src="/mascot/mascot-chihuahua-4.webp"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <div>
            <p className="text-[10pt] font-bold text-black">業種別 労働災害分析レポート</p>
            <p className="text-[8pt] text-slate-700">{industryLabel} / 母集団 {populationLabel} ({yearRange})</p>
          </div>
        </div>
        <div className="text-right text-[8pt] text-slate-700">
          <p>発行日: {generatedAt}</p>
          <p>発行: ANZEN AI Portal</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Print-only footer with source attribution. Shown at the bottom of
 * every page of the PDF via `position: fixed` in the print stylesheet.
 */
export function ReportPrintFooter() {
  return (
    <div className="report-print-footer hidden print:flex">
      <span>出典: 厚生労働省 職場のあんぜんサイト / 労働者死傷病報告オープンデータ / 編集部 curated 事例</span>
      <span className="report-print-pagenum" />
    </div>
  );
}

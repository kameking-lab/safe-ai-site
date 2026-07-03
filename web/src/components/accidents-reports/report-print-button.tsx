"use client";

import { useCallback } from "react";
import { Printer } from "lucide-react";

/**
 * Print/PDF export button for the industry accident report. The button
 * is hidden in the printed output via `print:hidden`. Print styling is
 * driven entirely by `@media print` rules scoped under
 * `.accident-report-print-root` in globals.css.
 */
export function ReportPrintButton({ label = "PDFに出力 / 印刷" }: { label?: string }) {
  const handlePrint = useCallback(() => {
    if (typeof window === "undefined") return;
    window.print();
  }, []);

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 print:hidden dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
      aria-label="このレポートを印刷またはPDFに出力する"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

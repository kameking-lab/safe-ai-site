"use client";

import { useCallback } from "react";

/**
 * Print/PDF export button. Uses window.print() with @media print styles to
 * produce an A4-friendly document — no PDF library dependency. The shared
 * `.plan-print-root` print styles in globals.css apply.
 */
export function PrintButton() {
  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="min-h-[44px] rounded bg-emerald-600 px-6 py-2.5 text-base font-semibold text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 print:hidden"
    >
      PDFに出力 / 印刷
    </button>
  );
}

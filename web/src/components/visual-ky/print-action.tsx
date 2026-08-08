"use client";

import { Printer } from "lucide-react";
import { trackVisualKyEvent } from "@/lib/visual-ky/analytics";

export function VisualKyPrintAction({
  scenarioId,
  category,
  difficulty,
}: {
  scenarioId: string;
  category: string;
  difficulty: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        trackVisualKyEvent("visual_ky_print", {
          scenarioId,
          category,
          difficulty,
          ctaPosition: "print_page",
        });
        window.print();
      }}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-3 font-black text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 print:hidden"
    >
      <Printer className="h-5 w-5" aria-hidden="true" />
      印刷・PDF保存
    </button>
  );
}

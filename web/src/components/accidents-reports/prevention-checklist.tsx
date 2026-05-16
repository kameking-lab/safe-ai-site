import type { IndustrySlug } from "@/lib/industry-slugs";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  getChecklistByCategory,
} from "@/lib/industry-prevention-checklists";

/**
 * Print-friendly 30-item fatal-accident prevention checklist.
 *
 * Rendered as plain HTML (no client component) so it can be statically
 * generated and shown identically on screen and in print. Each item
 * carries a citation (basis) so the user can defend the check during
 * an audit.
 */
export function PreventionChecklist({ industry }: { industry: IndustrySlug }) {
  const grouped = getChecklistByCategory(industry);

  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <section
            key={cat}
            className="rounded-lg border border-slate-200 bg-white p-4 print:break-inside-avoid dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {CATEGORY_LABEL[cat]}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {items.map((it) => (
                <li
                  key={it.no}
                  className="flex items-start gap-2 border-b border-slate-100 pb-1.5 text-sm last:border-0 last:pb-0 dark:border-slate-800"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-400 text-[10px] tabular-nums text-slate-500 print:border-slate-700">
                    {String(it.no).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-800 dark:text-slate-200">{it.text}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-500">
                      根拠: {it.basis}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { accidentCasesMock } from "@/data/mock/accident-cases";
import { findAccidentsBySubstance } from "@/lib/chemical/accident-cross-search";

/**
 * P1-3 物質名 × 事故事例DB クロス検索セクション。
 * /chemical-database/[cas] に「この物質に関連する過去の労働災害事例」を表示する。
 * 既存の事故事例DB（accidentCasesMock）を物質名で横断し、該当があるときのみ描画。
 */
export function AccidentCrossSection({
  substanceName,
  aliases,
}: {
  substanceName: string;
  aliases?: string[];
}) {
  const matches = findAccidentsBySubstance(substanceName, accidentCasesMock, {
    aliases,
    limit: 5,
  });
  if (matches.length === 0) return null;

  return (
    <section className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 p-5 sm:p-6 space-y-3">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-300" aria-hidden="true" />
        この物質に関連する過去の労働災害事例（{matches.length}）
      </h2>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        事故事例DBから「{substanceName}」に言及する事例を抽出しました。対策の検討にご活用ください。
      </p>
      <ul className="space-y-2">
        {matches.map((m) => (
          <li key={m.id}>
            <Link
              href={`/accidents/${m.id}`}
              className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-white/70 dark:bg-slate-900/50 p-3 hover:border-rose-400 transition"
            >
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {m.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                  {m.type} ／ {m.severity} ／ {m.occurredOn}
                </span>
              </span>
              <ArrowRight className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { ClipboardCheck, UserCheck } from "lucide-react";
import type { EducationContext } from "@/data/education-context";
import { SUPERVISOR_CREDIT } from "@/data/education-context";

type Props = {
  context: EducationContext;
};

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; chip: string; cardBg: string }> = {
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", chip: "bg-amber-100 text-amber-800", cardBg: "bg-gradient-to-br from-amber-50 to-white" },
  red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", chip: "bg-red-100 text-red-800", cardBg: "bg-gradient-to-br from-red-50 to-white" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", chip: "bg-blue-100 text-blue-800", cardBg: "bg-gradient-to-br from-blue-50 to-white" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", chip: "bg-orange-100 text-orange-800", cardBg: "bg-gradient-to-br from-orange-50 to-white" },
  sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", chip: "bg-sky-100 text-sky-800", cardBg: "bg-gradient-to-br from-sky-50 to-white" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", chip: "bg-indigo-100 text-indigo-800", cardBg: "bg-gradient-to-br from-indigo-50 to-white" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", chip: "bg-emerald-100 text-emerald-800", cardBg: "bg-gradient-to-br from-emerald-50 to-white" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", chip: "bg-purple-100 text-purple-800", cardBg: "bg-gradient-to-br from-purple-50 to-white" },
};

export function ChecklistDownload({ context }: Props) {
  const colors = COLOR_MAP[context.color] ?? COLOR_MAP.amber;

  return (
    <>
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardCheck className={`h-5 w-5 ${colors.text}`} />
          <h2 className="text-base font-bold text-slate-900">現場点検チェックリスト</h2>
          <span className="text-xs text-slate-500">（始業前・週次点検向け）</span>
        </div>
        <ol className={`space-y-2 rounded-2xl border ${colors.border} bg-white p-5`}>
          {context.checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors.chip} text-[11px] font-bold`}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <label className="flex flex-1 items-start gap-2 text-xs leading-6 text-slate-700">
                <input
                  type="checkbox"
                  className={`mt-1 h-4 w-4 shrink-0 rounded border-slate-300 ${colors.text}`}
                  aria-label={`チェック項目${i + 1}`}
                />
                <span>{item}</span>
              </label>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] text-slate-500">
          ※ 印刷して現場での点検記録としてご利用いただけます。詳細版（PDF・Excel）はお問い合わせください。
        </p>
      </section>

      <section className={`mb-8 rounded-2xl border ${colors.border} ${colors.cardBg} p-5`}>
        <div className="mb-2 flex items-center gap-2">
          <UserCheck className={`h-5 w-5 ${colors.text}`} />
          <h2 className="text-sm font-bold text-slate-900">監修者コメント</h2>
          <span className="text-[11px] text-slate-500">— 実務上の注意点</span>
        </div>
        <p className="text-xs leading-7 text-slate-700">{context.supervisorComment}</p>
        <p className="mt-3 text-[11px] text-slate-500">{SUPERVISOR_CREDIT}</p>
      </section>
    </>
  );
}

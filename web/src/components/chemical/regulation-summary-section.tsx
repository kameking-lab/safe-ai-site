import { ExternalLink, ListChecks, Stethoscope, FileQuestion } from "lucide-react";
import {
  REGULATION_TAGS,
  normalizeTags,
  type RegulationTag,
} from "@/lib/regulation-tag-labels";
import {
  soilContaminationForCas,
  PHYSICAL_PROPERTY_LAWS,
  SOIL_LAW_OFFICIAL_URL,
} from "@/lib/chemical/extra-regulations";
import { healthCheckupsFromTags } from "@/lib/chemical/health-checkup-from-tags";

/**
 * P0-2 全法律ワンストップ・サマリー ＋ P1-6 土壌 ＋ P2-3 物性型法律 二層UI ＋ P1-2 特殊健診。
 *
 * /chemical-database/[cas] 上部に配置し、物質名から「該当が確認できる法律」「物性により該当しうる—要確認の法律」
 * 「必要な特殊健診」を1画面で俯瞰させる。社長の核心要求「物質名→全法律横断一覧」を強化。
 * AI要約は規制内容のハルシネーション（創作禁止）を避けるため用いず、構造化データのみで構成する。
 */

/** タグ → 法律ファミリー名（サマリーのグルーピング用）。 */
function lawFamily(tag: RegulationTag): string {
  const cat = REGULATION_TAGS[tag].category;
  switch (cat) {
    case "osha":
      return "労働安全衛生法 特別則";
    case "nite":
      return "GHS分類（NITE）";
    case "prtr":
      return "化管法（PRTR・SDS）";
    case "chashin":
      return "化審法";
    case "poison-waste":
      return tag === "waste" ? "廃棄物処理法" : "毒物及び劇物取締法";
    case "cwc":
      return "化学兵器禁止法";
    default:
      return REGULATION_TAGS[tag].fullLabel;
  }
}

export function RegulationSummarySection({
  cas,
  regulationTags,
}: {
  cas: string;
  regulationTags?: string[];
}) {
  const tags = normalizeTags(regulationTags);
  const soil = soilContaminationForCas(cas);
  const checkups = healthCheckupsFromTags(regulationTags);

  // 該当が確認できる法律ファミリー（重複排除・出現順）。
  const families: string[] = [];
  for (const t of tags) {
    const f = lawFamily(t);
    if (!families.includes(f)) families.push(f);
  }
  if (soil && !families.includes("土壌汚染対策法")) families.push("土壌汚染対策法");

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-5 sm:p-6 space-y-5">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <ListChecks className="w-5 h-5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
        この物質の規制ワンストップ・サマリー
      </h2>

      {/* 該当が確認できる法律 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
          該当が確認できる法律（{families.length}）
        </p>
        {families.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {families.map((f) => (
              <li
                key={f}
                className="inline-flex items-center rounded-full border border-emerald-400 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200"
              >
                ✓ {f}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            構造化データ上で該当が確認できた法律はありません（下記「要確認」も参照）。
          </p>
        )}
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          ※ 詳細・出典は下部「関連法令」「特別則」セクションを参照。本サマリーは収録データに基づく該当一覧で、最終確認は各公式リンクで行ってください。
        </p>
      </div>

      {/* P1-6 土壌汚染対策法 */}
      {soil && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-slate-900/50 p-3 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              土壌汚染対策法 特定有害物質（{soil.kind}）
            </span>
            <a
              href={SOIL_LAW_OFFICIAL_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300 underline hover:no-underline"
            >
              法令を確認
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {soil.name} は特定有害物質に該当します。{soil.note ? `（${soil.note}）` : null}
          </p>
        </div>
      )}

      {/* P2-3 物性/カテゴリ定義型の法律（該当可能性—要確認） */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 flex items-center gap-1">
          <FileQuestion className="w-4 h-4" aria-hidden="true" />
          物性・数量により該当しうる法律（要確認）
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          以下は物質名（CAS）だけでは一意に判定できず、物性・状態・数量で該当が変わります。現場の取扱条件で確認してください。
        </p>
        <ul className="space-y-2">
          {PHYSICAL_PROPERTY_LAWS.map((law) => (
            <li
              key={law.key}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-3 space-y-1.5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {law.name}
                </span>
                <a
                  href={law.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-sky-700 dark:text-sky-300 underline hover:no-underline"
                >
                  法令本文
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{law.criterion}</p>
              <ul className="list-disc pl-5 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                {law.checkpoints.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      {/* P1-2 特殊健康診断 */}
      {checkups.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300 flex items-center gap-1">
            <Stethoscope className="w-4 h-4" aria-hidden="true" />
            必要となりうる特殊健康診断（{checkups.length}）
          </p>
          <ul className="space-y-2">
            {checkups.map((c) => (
              <li
                key={c.key}
                className="rounded-xl border border-rose-200 dark:border-rose-800 bg-white/70 dark:bg-slate-900/50 p-3 space-y-1"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {c.name}
                  </span>
                  <a
                    href={c.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-rose-700 dark:text-rose-300 underline hover:no-underline"
                  >
                    根拠条文
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {c.basis} ／ {c.frequency}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            ※ 付与済みの特別則区分に基づく「該当の可能性」です。実施義務の最終判断は法令で確認してください。
          </p>
        </div>
      )}
    </section>
  );
}

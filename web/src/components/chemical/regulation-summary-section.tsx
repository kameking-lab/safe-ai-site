import { ExternalLink, ListChecks, Stethoscope, FileQuestion, ShieldCheck, HelpCircle } from "lucide-react";
import {
  REGULATION_TAGS,
  normalizeTags,
  oshaTagsForCas,
  type RegulationTag,
} from "@/lib/regulation-tag-labels";
import {
  soilContaminationForCas,
  airPollutionForCas,
  waterPollutionForCas,
  PHYSICAL_PROPERTY_LAWS,
  SOIL_LAW_OFFICIAL_URL,
  AIR_LAW_OFFICIAL_URL,
  WATER_LAW_OFFICIAL_URL,
} from "@/lib/chemical/extra-regulations";
import { healthCheckupsFromTags } from "@/lib/chemical/health-checkup-from-tags";
import {
  buildSubstanceLegalProfile,
  type LegalDesignation,
  type LegalDomain,
} from "@/data/legal/substance-legal-profile";

/**
 * 物質×法令の結論ファースト・サマリー（O11 2026-07-11 全面改修）
 *
 * 構成（上から）:
 *  1. 該当法令バッジ一覧 — e-Gov/公式リストと突合済みの designated のみを区分つきで断定表示
 *  2. 区分の根拠 — 号・条項＋正本の取得日（revisionId/sha256 固定スナップショット由来）
 *  3. 非該当を確認済みの法令 / 未確認（未突合）の明示 — 空白で欺かない
 *  4. 物性・数量により該当しうる法律（消防法・廃掃法・高圧ガス の要確認二層）
 *  5. 必要となりうる特殊健康診断
 *
 * AI要約は使わず構造化データのみ（規制内容のハルシネーション防止）。
 * /chemical-database/[cas]（サーバーコンポーネント）専用 — 正本スナップショットを
 * クライアントに送らないこと。
 */

const DOMAIN_LABEL: Record<LegalDomain, string> = {
  "anei-ra": "リスクアセスメント対象物（表示・通知）",
  "anei-tokka": "特化則",
  "anei-yuki": "有機則",
  "anei-namari": "鉛則",
  "anei-4alkyl": "四アルキル鉛則",
  "anei-funjin": "粉じん則",
  "anei-sekimen": "石綿則",
  dokugeki: "毒物及び劇物取締法",
  "kakanho-prtr": "化管法（PRTR）",
  kashinho: "化審法",
  shobo: "消防法",
  "kouatsu-gas": "高圧ガス保安法",
  taiki: "大気汚染防止法",
  suishitsu: "水質汚濁防止法",
  dojo: "土壌汚染対策法",
  cwc: "化学兵器禁止法",
  haiki: "廃棄物処理法",
};

/** designated バッジの色（区分の重さで塗り分け） */
function badgeClassFor(d: LegalDesignation): string {
  if (d.domain === "dokugeki") {
    if (d.classification === "特定毒物") return "bg-red-200 text-red-950 border-red-400";
    if (d.classification === "毒物") return "bg-red-100 text-red-900 border-red-300";
    return "bg-purple-100 text-purple-900 border-purple-300";
  }
  if (d.domain === "anei-tokka") return "bg-rose-100 text-rose-900 border-rose-300";
  if (d.domain === "anei-yuki") return "bg-amber-100 text-amber-900 border-amber-300";
  if (d.domain === "kakanho-prtr") return "bg-orange-100 text-orange-900 border-orange-300";
  if (d.domain === "kashinho") return "bg-pink-100 text-pink-900 border-pink-300";
  if (d.domain === "kouatsu-gas") return "bg-cyan-100 text-cyan-900 border-cyan-300";
  return "bg-emerald-100 text-emerald-900 border-emerald-300";
}

function egovUrl(lawId?: string): string | undefined {
  if (!lawId) return undefined;
  return /^\d/.test(lawId) ? `https://laws.e-gov.go.jp/law/${lawId}` : undefined;
}

/** タグ → 法律ファミリー名（旧サマリーとの互換用グルーピング）。 */
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
  const mergedTags = [...new Set([...(regulationTags ?? []), ...oshaTagsForCas(cas)])];
  const tags = normalizeTags(mergedTags);
  const soil = soilContaminationForCas(cas);
  const air = airPollutionForCas(cas);
  const water = waterPollutionForCas(cas);
  const checkups = healthCheckupsFromTags(mergedTags, cas);

  // ---- 正本突合済みプロファイル（毒劇法・化管法・化審法・高圧ガス・特化則・有機則） ----
  const profile = buildSubstanceLegalProfile(cas);
  const byStatus = (s: LegalDesignation["status"]) =>
    profile?.designations.filter((d) => d.status === s) ?? [];
  const designated = byStatus("designated");
  const notDesignated = byStatus("not-designated");
  const unverifiedDomains = [
    ...new Set(byStatus("unverified").map((d) => d.domain)),
  ] as LegalDomain[];

  // 業務列挙型の特別則（鉛則・四アルキル鉛則・石綿則・酸欠則・粉じん則）は人手検証タグから
  const manualOshaTags = tags.filter((t) =>
    ["namari", "yonalkyl", "sekimen", "sankketsu", "funjin"].includes(t),
  );

  // designated バッジ（domain＋区分で一意化）
  const badges: { key: string; label: string; className: string }[] = [];
  for (const d of designated) {
    const label = d.classification
      ? `${DOMAIN_LABEL[d.domain]}：${d.classification}`
      : DOMAIN_LABEL[d.domain];
    if (!badges.some((b) => b.label === label)) {
      badges.push({ key: label, label, className: badgeClassFor(d) });
    }
  }
  for (const t of manualOshaTags) {
    const info = REGULATION_TAGS[t];
    const label = info.shortLabel;
    if (!badges.some((b) => b.label === label)) {
      badges.push({ key: label, label, className: info.badgeClass });
    }
  }
  if (soil) badges.push({ key: "soil", label: `土壌汚染対策法：特定有害物質（${soil.kind}）`, className: "bg-lime-100 text-lime-900 border-lime-300" });
  if (air) badges.push({ key: "air", label: `大気汚染防止法：${air.category}`, className: "bg-sky-100 text-sky-900 border-sky-300" });
  if (water) badges.push({ key: "water", label: "水質汚濁防止法：有害物質", className: "bg-blue-100 text-blue-900 border-blue-300" });

  // 未確認扱いのタグ（ミラー由来で正本未突合のもの）
  const unverifiedTagBadges: { label: string; note: string }[] = [];
  if (tags.includes("poison-control") && unverifiedDomains.includes("dokugeki")) {
    unverifiedTagBadges.push({
      label: "毒物及び劇物取締法",
      note: "収録データにタグはあるが正本（e-Gov別表・指定令）と未突合",
    });
  }
  for (const t of ["cwc", "waste"] as const) {
    if (tags.includes(t)) {
      unverifiedTagBadges.push({
        label: REGULATION_TAGS[t].fullLabel,
        note: "ミラー由来データ（正本突合は今後拡張）",
      });
    }
  }

  // 根拠リスト（designated のみ。域ごとに号・条項と取得日）
  const basisItems = designated
    .filter((d) => d.basis)
    .map((d) => ({
      key: `${d.domain}-${d.basis!.provision}`,
      domain: DOMAIN_LABEL[d.domain],
      classification: d.classification,
      provision: d.basis!.provision,
      url: egovUrl(d.basis!.lawId),
      verifiedAt: d.verifiedAt,
      scopeNote: d.scopeNote,
    }));

  // 未確認ドメインの表示名（消防法は物性型二層で扱うため除外）
  const unverifiedNames = unverifiedDomains
    .filter((dm) => dm !== "shobo")
    .map((dm) => DOMAIN_LABEL[dm]);

  // 旧互換: プロファイル未収載時も既存タグから該当ファミリーを出す（偽陰性防止）
  const fallbackFamilies: string[] = [];
  if (!profile) {
    for (const t of tags) {
      const f = lawFamily(t);
      if (!fallbackFamilies.includes(f)) fallbackFamilies.push(f);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-5 sm:p-6 space-y-5">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <ListChecks className="w-5 h-5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
        この物質に当てはまる法令（正本突合済み）
      </h2>

      {/* 1. 結論: 該当法令バッジ一覧 */}
      <div className="space-y-2">
        {badges.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <li
                key={b.key}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${b.className}`}
              >
                ✓ {b.label}
              </li>
            ))}
          </ul>
        ) : fallbackFamilies.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {fallbackFamilies.map((f) => (
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
            正本と突合できた該当法令はありません（下記の「未確認」「要確認」を参照）。
          </p>
        )}
        {unverifiedTagBadges.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {unverifiedTagBadges.map((b) => (
              <li
                key={b.label}
                title={b.note}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-400 bg-white/70 dark:bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                <HelpCircle className="w-3 h-3" aria-hidden="true" />
                {b.label}（未確認）
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 2. 区分の根拠（号・条項＋正本取得日） */}
      {basisItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            区分の根拠（e-Gov現行条文・公式リストと突合）
          </p>
          <ul className="space-y-1">
            {basisItems.map((b) => (
              <li
                key={b.key}
                className="rounded-lg border border-emerald-200/70 dark:border-emerald-800/60 bg-white/70 dark:bg-slate-900/50 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {b.domain}
                  {b.classification ? `（${b.classification}）` : ""}
                </span>{" "}
                — {b.provision}
                {b.url ? (
                  <>
                    {" "}
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300 underline hover:no-underline"
                    >
                      条文
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </>
                ) : null}
                {b.verifiedAt && (
                  <span className="text-slate-400"> ／ 突合 {b.verifiedAt}</span>
                )}
                {b.scopeNote && (
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    ※ {b.scopeNote}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. 非該当確認済み・未確認の明示 */}
      {(notDesignated.length > 0 || unverifiedNames.length > 0) && (
        <div className="space-y-1.5">
          {notDesignated.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span className="font-semibold">非該当を確認済み:</span>
              {notDesignated.map((d) => DOMAIN_LABEL[d.domain]).join("・")}
              {notDesignated.some((d) => d.scopeNote) && (
                <span className="block w-full pl-5 text-[11px] text-slate-500">
                  {notDesignated
                    .filter((d) => d.scopeNote)
                    .map((d) => d.scopeNote)
                    .join("／")}
                </span>
              )}
            </p>
          )}
          {unverifiedNames.length > 0 && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="font-semibold">未確認（正本と未突合）:</span>
              {unverifiedNames.join("・")}
              <span className="block w-full pl-5 text-[11px]">
                群指定（「〜化合物」「〜塩類」等）に該当する可能性が残ります。表示が無いことは非該当の保証ではありません。
              </span>
            </p>
          )}
        </div>
      )}

      {/* 環境系オーバーレイ（土壌/大気/水質・単一CAS確認分） */}
      {soil && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-slate-900/50 p-3 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              土壌汚染対策法 特定有害物質（{soil.kind}）
            </span>
            <a href={SOIL_LAW_OFFICIAL_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300 underline hover:no-underline">
              法令を確認
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {soil.name} は特定有害物質に該当します。{soil.note ? `（${soil.note}）` : ""}
          </p>
        </div>
      )}
      {air && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-slate-900/50 p-3 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              大気汚染防止法（{air.category}）
            </span>
            <a href={AIR_LAW_OFFICIAL_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300 underline hover:no-underline">
              法令を確認
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {air.name} は大気汚染防止法の{air.category}に該当します。
          </p>
        </div>
      )}
      {water && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-white/70 dark:bg-slate-900/50 p-3 space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              水質汚濁防止法 有害物質
            </span>
            <a href={WATER_LAW_OFFICIAL_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300 underline hover:no-underline">
              法令を確認
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {water.name} は水質汚濁防止法の有害物質に該当します（排水基準）。
          </p>
        </div>
      )}

      {/* 4. 物性/カテゴリ定義型の法律（該当可能性—要確認） */}
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
                  {law.key === "highpressure" &&
                    designated.some((d) => d.domain === "kouatsu-gas") && (
                      <span className="ml-2 rounded-full border border-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 text-[11px] font-semibold text-cyan-800 dark:text-cyan-300">
                        品名列挙に該当（上記バッジ参照）
                      </span>
                    )}
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

      {/* 5. 特殊健康診断 */}
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

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        ※ 「該当」は e-Gov 現行条文・公式CAS収載リストとの機械突合に基づきます。改正の反映に時間差が生じる場合があるため、最終確認は各リンク先の公式情報で行ってください。
      </p>
    </section>
  );
}

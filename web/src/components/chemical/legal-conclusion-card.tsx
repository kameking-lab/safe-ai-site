"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scale, ExternalLink, ShieldCheck, HelpCircle, ClipboardList, ArrowDownWideNarrow } from "lucide-react";
import { fetchChemicalLegalProfile } from "@/lib/chemical/legal-profile-client";

/**
 * 物質名から確認できる法令区分候補カード。
 *
 * /api/chemical/legal-profile から正本突合済みプロファイルを取得し、
 * designated / not-designated / unverified は物質リスト上の収載状態として表示する。
 * 作業条件なしで義務は確定せず、「該当時に確認する候補」と、全物質共通の
 * リスク低減の優先順位（代替→工学→管理→保護具）まで一続きで出す。
 */

type Designation = {
  domain: string;
  status: "designated" | "not-designated" | "unverified";
  classification?: string;
  basis?: { lawId: string; provision: string };
  scopeNote?: string;
  verifiedAt?: string;
};

type Duty = { name: string; basis: string; url: string; note?: string };

type ProfileResponse = {
  resolved: boolean;
  key?: string;
  label?: string;
  casless?: boolean;
  designations?: Designation[];
  oshaTags?: string[];
  specialControl?: boolean;
  raTarget?: boolean;
  checkups?: { key: string; name: string; basis: string; frequency: string; officialUrl: string }[];
  duties?: {
    group: string;
    applicability: "undetermined";
    items: Duty[];
  }[];
  applicabilityDecision?: "undetermined";
  applicabilityRequiredConditions?: string[];
  applicabilityNote?: string;
  checkupApplicability?: "undetermined";
  hierarchy?: { step: string; detail: string }[];
  hasIndexEntry?: boolean;
};

const DOMAIN_LABEL: Record<string, string> = {
  "anei-ra": "リスクアセスメント対象物（表示・通知）",
  "anei-tokka": "特化則",
  "anei-yuki": "有機則",
  dokugeki: "毒物及び劇物取締法",
  "kakanho-prtr": "化管法（PRTR）",
  kashinho: "化審法",
  shobo: "消防法",
  "kouatsu-gas": "高圧ガス保安法",
};

const OSHA_TAG_LABEL: Record<string, string> = {
  "tokutei-1": "特化則：第一類物質",
  "tokutei-2": "特化則：第二類物質",
  "tokutei-3": "特化則：第三類物質",
  "yuki-1": "有機則：第一種有機溶剤",
  "yuki-2": "有機則：第二種有機溶剤",
  "yuki-3": "有機則：第三種有機溶剤",
  namari: "鉛則",
  yonalkyl: "四アルキル鉛則",
  sekimen: "石綿則",
  sankketsu: "酸欠則",
  funjin: "粉じん則",
};

function egovUrl(lawId?: string): string | undefined {
  if (!lawId) return undefined;
  return /^\d/.test(lawId) ? `https://laws.e-gov.go.jp/law/${lawId}` : undefined;
}

export function LegalConclusionCard({ q }: { q: string }) {
  // 取得結果を「どのクエリの結果か」と一緒に保持（同期setStateなしで切替時のちらつきを防ぐ）
  const [fetched, setFetched] = useState<{ q: string; data: ProfileResponse | null } | null>(null);

  useEffect(() => {
    if (!q) return;
    let active = true;
    fetchChemicalLegalProfile<ProfileResponse>(q)
      .then((j: ProfileResponse) => {
        if (active) setFetched({ q, data: j });
      })
      .catch(() => {
        if (active) setFetched({ q, data: null });
      });
    return () => {
      active = false;
    };
  }, [q]);

  const data = fetched?.q === q ? fetched.data : null;
  const loading = q !== "" && fetched?.q !== q;

  if (!q) return null;
  if (loading && !data) {
    return (
      <div className="animate-pulse rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-slate-500">
        該当法令を正本データと突合中…
      </div>
    );
  }
  if (!data) return null;

  if (!data.resolved) {
    // 法令索引・DBともに突合キーなし＝この物質は一窓検索側で「収載外」提示済み
    return null;
  }

  const designated = (data.designations ?? []).filter((d) => d.status === "designated");
  const notDesignated = (data.designations ?? []).filter((d) => d.status === "not-designated");
  const unverified = [...new Set(
    (data.designations ?? [])
      .filter((d) => d.status === "unverified" && d.domain !== "shobo")
      .map((d) => DOMAIN_LABEL[d.domain] ?? d.domain),
  )];

  // 安衛法特別則（導出タグ）＋他法令 designated のバッジ
  const badges: string[] = [];
  for (const t of data.oshaTags ?? []) {
    const l = OSHA_TAG_LABEL[t];
    if (l && !badges.includes(l)) badges.push(l);
  }
  if (data.specialControl)
    badges.push("特別管理物質リスト収載（記録要件は作業条件確認）");
  for (const d of designated) {
    if (d.domain === "anei-tokka" || d.domain === "anei-yuki") continue; // タグで表示済み
    if (d.domain === "anei-ra") continue; // raTarget バッジで表示済み（重複させない）
    const l = `${DOMAIN_LABEL[d.domain] ?? d.domain}${d.classification ? `：${d.classification}` : ""}`;
    if (!badges.includes(l)) badges.push(l);
  }
  if (data.raTarget)
    badges.push("表示・通知対象物質リスト収載（適用条件要確認）");

  const basisItems = designated.filter((d) => d.basis);
  const noneDesignated = badges.length === 0;

  return (
    <section className="space-y-4 rounded-2xl border-2 border-emerald-300 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Scale className="h-5 w-5 text-emerald-700" aria-hidden="true" />
        物質名から確認できる法令区分候補
        {data.label ? `：${data.label}` : ""}
        {data.casless && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            CAS番号なし（告示名）
          </span>
        )}
      </h3>

      <div
        role="status"
        className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950"
      >
        <p className="font-bold">
          義務の適用は判定不能です。物質名・CAS番号だけでは確定できません。
        </p>
        <p className="mt-1 text-xs">
          {data.applicabilityNote ??
            "製品SDSと実際の作業条件を確認してから、公式条文・所轄署・専門家で判断してください。"}
        </p>
        {(data.applicabilityRequiredConditions ?? []).length > 0 && (
          <>
            <p className="mt-2 text-xs font-bold">判定前に必要な条件</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
              {(data.applicabilityRequiredConditions ?? []).map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* 結論バッジ */}
      {noneDesignated ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-sm font-semibold text-slate-800">
            {data.hasIndexEntry
              ? "確認した物質リストでは、特化則・有機則などの収載を確認できませんでした"
              : "確認対象の物質リストに収載を確認できませんでした（未突合の法令域あり）"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            非収載は「義務なし」を意味しません。混合物濃度、用途、数量、作業条件、適用除外を確認してください。
          </p>
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <li
              key={b}
              className="inline-flex items-center rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-900"
            >
              収載情報: {b}
            </li>
          ))}
        </ul>
      )}

      {/* 根拠 */}
      {basisItems.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            区分の根拠（e-Gov現行条文・公式リストと突合済み）
          </p>
          <ul className="space-y-1">
            {basisItems.map((d) => {
              const url = egovUrl(d.basis!.lawId);
              return (
                <li
                  key={`${d.domain}-${d.basis!.provision}`}
                  className="rounded-lg bg-emerald-50/70 px-3 py-1.5 text-xs text-slate-700"
                >
                  <span className="font-semibold">
                    {DOMAIN_LABEL[d.domain] ?? d.domain}
                    {d.classification ? `（${d.classification}）` : ""}
                  </span>{" "}
                  — {d.basis!.provision}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 inline-flex items-center gap-0.5 text-emerald-700 underline hover:no-underline"
                    >
                      条文
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                  {d.verifiedAt && <span className="text-slate-400">（突合 {d.verifiedAt}）</span>}
                  {d.scopeNote && (
                    <span className="block text-[11px] text-slate-500">※ {d.scopeNote}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 非該当確認済み / 未確認 */}
      <div className="space-y-1 text-xs">
        {notDesignated.length > 0 && (
          <p className="flex flex-wrap items-center gap-1 text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            <span className="font-semibold">確認した物質リストでは非収載:</span>
            {notDesignated.map((d) => DOMAIN_LABEL[d.domain] ?? d.domain).join("・")}
          </p>
        )}
        {unverified.length > 0 && (
          <p className="flex flex-wrap items-center gap-1 text-slate-500">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-semibold">未確認（正本と未突合）:</span>
            {unverified.join("・")}
            <span className="block w-full pl-5 text-[11px]">
              表示が無いことは非該当の保証ではありません（群指定の可能性が残ります）
            </span>
          </p>
        )}
      </div>

      {/* 法定義務は作業条件未入力のため候補としてのみ表示 */}
      {(data.duties ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-rose-900">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            該当時に確認する義務候補（全件、適用条件の確認が必要）
          </p>
          {(data.duties ?? []).map((g) => (
            <details
              key={g.group}
              open={(data.duties ?? []).length <= 2}
              className="rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2"
            >
              <summary className="cursor-pointer text-sm font-semibold text-rose-900">
                {g.group}（候補{g.items.length}項目・判定不能）
              </summary>
              <ul className="mt-2 space-y-1.5">
                {g.items.map((it) => (
                  <li key={it.name} className="rounded-lg bg-white/80 px-3 py-1.5 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">{it.name}</span>
                    {it.note && <span className="text-slate-500">（{it.note}）</span>}
                    <span className="ml-1 text-slate-500">
                      — {it.basis}
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 inline-flex items-center gap-0.5 text-rose-700 underline hover:no-underline"
                      >
                        条文
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
          <p className="text-[10px] text-slate-500">
            ※ ここに表示されるのは義務の確定結果ではありません。最新SDS、成分濃度、用途、数量、工程、作業時間、換気、適用除外・裾切値を確認し、公式条文・所轄署・専門家で判断してください。
          </p>
        </div>
      )}

      {/* 対策案②: 共通の優先順位 */}
      {(data.hierarchy ?? []).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <ArrowDownWideNarrow className="h-4 w-4" aria-hidden="true" />
            リスク低減の優先順位（全物質共通）
          </p>
          <ol className="mt-1.5 space-y-0.5 text-[11px] text-slate-600">
            {(data.hierarchy ?? []).map((h) => (
              <li key={h.step}>
                <span className="font-semibold text-slate-800">{h.step}</span> {h.detail}
              </li>
            ))}
          </ol>
        </div>
      )}

      {data.key && !data.casless && /^\d/.test(data.key) && (
        <Link
          href={`/chemical-database/${encodeURIComponent(data.key)}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
        >
          この物質の詳細ページ（全法令・GHS・濃度基準値）を開く →
        </Link>
      )}
    </section>
  );
}

/**
 * sitemap lastmod 用の「実際の内容・挙動変更日」レジストリ（2026-10-11）。
 *
 * 方針:
 *  - 取得・照合しただけ（内容差分なし）の日付は使わない。ビルド日・現在時刻も使わない。
 *  - 各日付は git 履歴の該当コミットまたはデータ側の変更確認メタデータで裏付ける。
 *  - 下の各ルートは、従来の固定値（/chatbot・化学物質系 2026-04-01）や公表日だけの値
 *    （/laws）が、その後の実変更より古かったため是正した。
 */
import { egovRevisionsMeta } from "@/data/law-revisions/egov-revisions-loaded";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import type { LawRevisionCore } from "@/lib/types/domain";

export type RouteContentChange = {
  /** 変更が公開内容に入った日（YYYY-MM-DD, JST）。 */
  changedOn: string;
  /** 裏付けとなるコミット（短縮SHA）またはデータメタデータ。 */
  evidence: string;
  /** 何が変わったか（利用者に見える内容・挙動）。 */
  change: string;
};

export const ROUTE_CONTENT_CHANGES = {
  "/chatbot": {
    changedOn: "2026-10-08",
    evidence:
      "ca75fb8b (#1055): 回答根拠の安衛法・安衛則 snapshot を2026-10-01施行版へ更新。egov-verified-corpus の sourceContentChangedOn=2026-10-08（build-egov-verified-excerpts.mjs の CONTENT_CHANGE_CONFIRMED_ON）",
    change: "チャットボットが引用・回答する現行条文本文（10条）の内容変更",
  },
  "/chemical-ra": {
    changedOn: "2026-10-11",
    evidence: "71dd7d66 (#1063): chemical-ra-panel のGHS分類表示を公的情報確認結果へ一本化",
    change: "RA結果画面のGHS分類・出典表示の変更",
  },
  "/chemical-database": {
    changedOn: "2026-08-08",
    evidence: "852ecff2: chemical-database-client の解説表記・RA導線を変更（concentration-limits.json の最終変更 9f05e2f2 は 2026-07-12）",
    change: "一覧画面の説明文・導線の変更",
  },
  "/chemical-ra/product-search": {
    changedOn: "2026-08-08",
    evidence: "852ecff2: product-search-panel から自動RA判定を除き、SDS確認支援へ変更",
    change: "製品検索の機能範囲（自動リスク判定の廃止）と説明文の変更",
  },
} as const satisfies Record<string, RouteContentChange>;

export type RegisteredContentRoute = keyof typeof ROUTE_CONTENT_CHANGES;

export function routeContentChangedOn(route: RegisteredContentRoute): string {
  return ROUTE_CONTENT_CHANGES[route].changedOn;
}

/** /laws 一覧に表示されるフィールドだけの指紋（取得時刻などは含めない）。 */
export function lawRevisionListFingerprint(
  revisions: readonly LawRevisionCore[],
): string {
  const rows = revisions
    .map((revision) => [
      revision.id,
      revision.title,
      revision.publishedAt,
      revision.revisionNumber ?? null,
      revision.summary,
      revision.publication_date ?? null,
      revision.enforcement_date ?? null,
      revision.enforcement_status ?? null,
      revision.source_url ?? null,
      revision.source?.url ?? null,
      revision.source?.label ?? null,
      revision.category,
      revision.kind,
      revision.issuer,
      revision.industry_tags ?? null,
      revision.official_notice_number ?? null,
    ])
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])));
  const text = JSON.stringify(rows);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${rows.length}-${(hash >>> 0).toString(36)}`;
}

/**
 * 一覧内容を最後に確認した版。d3017a75（2026-10-05 取得）で 2026-10-01 施行の
 * 改正（安衛則ほか）へ一覧が切り替わった。以後の 164052b（2026-10-07）は
 * 一覧に出ない revisionHistory の追加、104499be（2026-09-28）は取得時刻のみの更新。
 */
export const LAWS_REVISION_LIST_BASELINE = {
  fingerprint: "20-lznpni",
  changedOn: "2026-10-05",
  evidence: "d3017a75 chore(news): e-Gov law revisions update（fetchedAt 2026-10-05）",
} as const;

/**
 * /laws の法改正一覧が最後に実際に変わった日。
 * 指紋が基準版と同じなら基準日。異なる（自動取得で一覧が変わった）場合は、
 * その内容を取り込んだ取得日（fetchedAt）を上限として採る。内容が同じ再取得では動かない。
 */
export function lawsRevisionListChangedOn(
  revisions: readonly LawRevisionCore[] = lawRevisionCores,
  fetchedAt: string | null = egovRevisionsMeta.fetchedAt,
): string {
  if (lawRevisionListFingerprint(revisions) === LAWS_REVISION_LIST_BASELINE.fingerprint) {
    return LAWS_REVISION_LIST_BASELINE.changedOn;
  }
  const fetchedOn = fetchedAt?.slice(0, 10);
  return fetchedOn && /^\d{4}-\d{2}-\d{2}$/.test(fetchedOn)
    ? fetchedOn
    : LAWS_REVISION_LIST_BASELINE.changedOn;
}

/**
 * sitemap lastmod 用の「実際の内容・挙動変更日」レジストリ（2026-10-11）。
 *
 * 方針:
 *  - 取得・照合しただけ（内容差分なし）の日付は使わない。ビルド日・現在時刻も使わない。
 *  - 各日付は git 履歴の該当コミットまたはデータ側の変更確認メタデータで裏付ける。
 *  - 下の各ルートは、従来の固定値（/chatbot・化学物質系 2026-04-01）や公表日だけの値
 *    （/laws）が、その後の実変更より古かったため是正した。
 */
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
    changedOn: "2026-10-11",
    evidence:
      "PR #1066（2026-10-11）: 「足場の手すりは？」→「わく組足場です」の続き質問で、主題と足場種類を nine-key context で保持し安衛則563条1項3号イ(1)(2)で回答する挙動変更。直前の内容変更は ca75fb8b (#1055) の回答根拠 snapshot 更新（sourceContentChangedOn=2026-10-08）",
    change: "足場の手すりの続き質問に対する回答挙動（同じ確認質問の繰り返しを解消）",
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
 * /laws 一覧の表示内容ごとの「内容変更を確認した日」。指紋 → 日付の明示対応だけを使う。
 *  - 20-lznpni: d3017a75（2026-10-05 取得）で 2026-10-01 施行の改正（安衛則ほか）へ
 *    一覧が切り替わった版。以後の 164052b（2026-10-07）は一覧に出ない
 *    revisionHistory の追加だけで、指紋は同じ。
 * 新しい一覧が取り込まれても、取得時刻だけでは内容変更日を証明できないため推測しない。
 * 登録外の版は、ここで最後に確認した日付のまま据え置く（再取得のたびに進めない）。
 * 新しい版の変更日を確認したら、根拠コミットとともにここへ追記する。
 */
export const LAWS_REVISION_LIST_VERSIONS: Readonly<
  Record<string, { changedOn: string; evidence: string }>
> = {
  "20-lznpni": {
    changedOn: "2026-10-05",
    evidence: "d3017a75 chore(news): e-Gov law revisions update（fetchedAt 2026-10-05）",
  },
};

/** 登録済みの版のうち最新の確認日（登録外の版のときの据え置き値）。 */
export const LAWS_REVISION_LIST_LAST_VERIFIED_ON = Object.values(
  LAWS_REVISION_LIST_VERSIONS,
)
  .map(({ changedOn }) => changedOn)
  .sort()
  .at(-1)!;

/**
 * /laws の法改正一覧が最後に実際に変わったと確認できた日。
 * 登録済みの指紋ならその確認日、登録外なら最後に確認した日。取得時刻は使わない。
 */
export function lawsRevisionListChangedOn(
  revisions: readonly LawRevisionCore[] = lawRevisionCores,
): string {
  return (
    LAWS_REVISION_LIST_VERSIONS[lawRevisionListFingerprint(revisions)]?.changedOn ??
    LAWS_REVISION_LIST_LAST_VERIFIED_ON
  );
}

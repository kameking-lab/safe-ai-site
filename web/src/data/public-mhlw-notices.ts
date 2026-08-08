import { mhlwNotices, type MhlwNotice } from "@/data/mhlw-notices";
import { MHLW_HEAT_NOTICE_0520_6_SNAPSHOT } from "@/data/source-snapshots/mhlw-heat-notice-0520-6";

/**
 * 監査で生成URLまたは一覧URLしか持たないことが確認された連番範囲。
 * 個別文書の番号・標題・発出日・本文が一次資料と一致するまで公開経路へ戻さない。
 */
export const QUARANTINED_NOTICE_NUMBER_RANGE = {
  from: 870,
  to: 1069,
} as const;

const NOTICE_ID_PATTERN = /^mhlw-notice-(\d{4})$/;

export function isNoticeSourceQuarantined(
  noticeOrId: MhlwNotice | string,
): boolean {
  const id = typeof noticeOrId === "string" ? noticeOrId : noticeOrId.id;
  const match = NOTICE_ID_PATTERN.exec(id);
  if (!match) return true;
  const sequence = Number(match[1]);
  return (
    sequence >= QUARANTINED_NOTICE_NUMBER_RANGE.from &&
    sequence <= QUARANTINED_NOTICE_NUMBER_RANGE.to
  );
}

/**
 * 隔離範囲を除いた二次索引候補。未確認レコードは一覧用の索引に限り、
 * AI回答根拠、indexable詳細、sitemapには使用しない。個別照合済みIDだけは
 * 下のoverrideで公式一次資料へ差し替え、verifiedMhlwNoticesから公開する。
 */
const INDIVIDUALLY_VERIFIED_NOTICE_OVERRIDES: Readonly<
  Record<string, Partial<MhlwNotice>>
> = {
  "mhlw-notice-0014": {
    title: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.title,
    issuedDate: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.publishedAt,
    issuedDateRaw: "令和7年5月20日",
    noticeNumber: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.documentNumber,
    issuer: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.issuer,
    sourceUrl: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.landingUrl,
    detailUrl: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.landingUrl,
    pdfUrl: MHLW_HEAT_NOTICE_0520_6_SNAPSHOT.url,
    category: "heat-stroke",
    lawRef: "労働安全衛生規則第612条の2・熱中症",
  },
};

export const publicMhlwNotices: MhlwNotice[] = mhlwNotices
  .filter((notice) => !isNoticeSourceQuarantined(notice))
  .map((notice) => ({
    ...notice,
    ...INDIVIDUALLY_VERIFIED_NOTICE_OVERRIDES[notice.id],
  }));

/**
 * 公式一次資料との文書同一性、固定PDF、該当抜粋を個別照合したID。
 * 専門家・法務による実務適用レビュー済みという意味ではない。
 */
export const INDIVIDUALLY_VERIFIED_NOTICE_IDS: ReadonlySet<string> = new Set([
  "mhlw-notice-0014",
]);

/**
 * @deprecated 互換用。名称にかかわらず、専門家・法務レビュー済みを意味しない。
 * 新規コードは INDIVIDUALLY_VERIFIED_NOTICE_IDS を使用する。
 */
export const HUMAN_VERIFIED_NOTICE_IDS = INDIVIDUALLY_VERIFIED_NOTICE_IDS;

export function isNoticeIndividuallyVerified(
  noticeOrId: MhlwNotice | string,
): boolean {
  const id = typeof noticeOrId === "string" ? noticeOrId : noticeOrId.id;
  return INDIVIDUALLY_VERIFIED_NOTICE_IDS.has(id);
}

/** AI引用・indexable詳細・sitemapに利用可能な個別確認済みレコード。 */
export const verifiedMhlwNotices: MhlwNotice[] = publicMhlwNotices.filter(
  isNoticeIndividuallyVerified,
);

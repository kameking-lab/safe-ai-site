/**
 * Per-law metadata for citation provenance.
 *
 * Each entry maps a `lawShort` value (as used on LawArticle records) to its
 * e-Gov source URL and audit information. The chatbot, law-search UI, and
 * citation footers can read this to surface authoritative links and warn
 * the reader if the source has been amended since the last audit.
 *
 * Keep entries in sync with web/src/data/laws/*.ts files. Audit date and
 * latestRevision should reflect the e-Gov status at the time of the last
 * citation-accuracy review.
 */

export type LawMetadata = {
  /** Full official law name (matches `LawArticle.law`). */
  fullName: string;
  /** Promulgation reference, e.g. "昭和47年法律第57号". */
  promulgation: string;
  /** Latest substantive revision known at audit time (e-Gov 改正履歴). */
  latestRevision: string;
  /** e-Gov 法令検索 canonical URL for the current consolidated text. */
  eGovUrl: string;
  /** Date the citations in this codebase were last verified against e-Gov (ISO yyyy-mm-dd). */
  auditedAt: string;
};

export const LAW_METADATA: Record<string, LawMetadata> = {
  安衛法: {
    fullName: "労働安全衛生法",
    promulgation: "昭和47年法律第57号",
    latestRevision: "令和6年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/347AC0000000057",
    auditedAt: "2026-05-17",
  },
  安衛令: {
    fullName: "労働安全衛生法施行令",
    promulgation: "昭和47年政令第318号",
    latestRevision: "令和7年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/347CO0000000318",
    auditedAt: "2026-05-17",
  },
  安衛則: {
    fullName: "労働安全衛生規則",
    promulgation: "昭和47年労働省令第32号",
    latestRevision: "令和7年改正（熱中症対策 第612条の2 新設）",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000032",
    auditedAt: "2026-05-17",
  },
  クレーン則: {
    fullName: "クレーン等安全規則",
    promulgation: "昭和47年労働省令第34号",
    latestRevision: "令和5年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000034",
    auditedAt: "2026-05-17",
  },
  有機則: {
    fullName: "有機溶剤中毒予防規則",
    promulgation: "昭和47年労働省令第36号",
    latestRevision: "令和5年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000036",
    auditedAt: "2026-05-17",
  },
  特化則: {
    fullName: "特定化学物質障害予防規則",
    promulgation: "昭和47年労働省令第39号",
    latestRevision: "令和5年改正（化学物質自律管理関連）",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000039",
    auditedAt: "2026-05-17",
  },
  酸欠則: {
    fullName: "酸素欠乏症等防止規則",
    promulgation: "昭和47年労働省令第42号",
    latestRevision: "令和3年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000042",
    auditedAt: "2026-05-17",
  },
  電離則: {
    fullName: "電離放射線障害防止規則",
    promulgation: "昭和47年労働省令第41号",
    latestRevision: "令和3年改正（眼の水晶体限度引下げ）",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000041",
    auditedAt: "2026-05-17",
  },
  石綿則: {
    fullName: "石綿障害予防規則",
    promulgation: "平成17年厚生労働省令第21号",
    latestRevision: "令和2年改正（事前調査の有資格者要件強化）",
    eGovUrl: "https://laws.e-gov.go.jp/law/417M60000100021",
    auditedAt: "2026-05-17",
  },
  粉じん則: {
    fullName: "粉じん障害防止規則",
    promulgation: "昭和54年労働省令第18号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/354M50002000018",
    auditedAt: "2026-05-17",
  },
  じん肺法: {
    fullName: "じん肺法",
    promulgation: "昭和35年法律第30号",
    latestRevision: "令和元年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/335AC0000000030",
    auditedAt: "2026-05-17",
  },
  作業環境測定法: {
    fullName: "作業環境測定法",
    promulgation: "昭和50年法律第28号",
    latestRevision: "令和元年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/350AC0000000028",
    auditedAt: "2026-05-17",
  },
  労基法: {
    fullName: "労働基準法",
    promulgation: "昭和22年法律第49号",
    latestRevision: "令和6年改正（裁量労働制等）",
    eGovUrl: "https://laws.e-gov.go.jp/law/322AC0000000049",
    auditedAt: "2026-05-17",
  },
  労基則: {
    fullName: "労働基準法施行規則",
    promulgation: "昭和22年厚生省令第23号",
    latestRevision: "令和6年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/322M40000100023",
    auditedAt: "2026-05-17",
  },
  最賃法: {
    fullName: "最低賃金法",
    promulgation: "昭和34年法律第137号",
    latestRevision: "令和6年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/334AC0000000137",
    auditedAt: "2026-05-17",
  },
  労契法: {
    fullName: "労働契約法",
    promulgation: "平成19年法律第128号",
    latestRevision: "令和2年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/419AC0000000128",
    auditedAt: "2026-05-17",
  },
  育介法: {
    fullName: "育児休業、介護休業等育児又は家族介護を行う労働者の福祉に関する法律",
    promulgation: "平成3年法律第76号",
    latestRevision: "令和7年改正（柔軟な働き方関連）",
    eGovUrl: "https://laws.e-gov.go.jp/law/403AC0000000076",
    auditedAt: "2026-05-17",
  },
  労災保険法: {
    fullName: "労働者災害補償保険法",
    promulgation: "昭和22年法律第50号",
    latestRevision: "令和6年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/322AC0000000050",
    auditedAt: "2026-05-17",
  },
  職安法: {
    fullName: "職業安定法",
    promulgation: "昭和22年法律第141号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/322AC0000000141",
    auditedAt: "2026-05-17",
  },
  能開法: {
    fullName: "職業能力開発促進法",
    promulgation: "昭和44年法律第64号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/344AC0000000064",
    auditedAt: "2026-05-17",
  },
  ゴンドラ則: {
    fullName: "ゴンドラ安全規則",
    promulgation: "昭和47年労働省令第35号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000035",
    auditedAt: "2026-05-17",
  },
  ボイラー則: {
    fullName: "ボイラー及び圧力容器安全規則",
    promulgation: "昭和47年労働省令第33号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000033",
    auditedAt: "2026-05-17",
  },
  高圧則: {
    fullName: "高気圧作業安全衛生規則",
    promulgation: "昭和47年労働省令第40号",
    latestRevision: "令和3年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000040",
    auditedAt: "2026-05-17",
  },
  建設業法: {
    fullName: "建設業法",
    promulgation: "昭和24年法律第100号",
    latestRevision: "令和6年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/324AC0000000100",
    auditedAt: "2026-05-17",
  },
  女性労基則: {
    fullName: "女性労働基準規則",
    promulgation: "昭和61年労働省令第3号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/361M50002000003",
    auditedAt: "2026-05-17",
  },
  年少者労働基準規則: {
    fullName: "年少者労働基準規則",
    promulgation: "昭和29年労働省令第13号",
    latestRevision: "令和3年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/329M50002000013",
    auditedAt: "2026-05-17",
  },
  短時間労働者管理法: {
    fullName: "短時間労働者及び有期雇用労働者の雇用管理の改善等に関する法律",
    promulgation: "平成5年法律第76号",
    latestRevision: "令和2年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/405AC0000000076",
    auditedAt: "2026-05-17",
  },
  メンタル指針: {
    fullName: "労働者の心の健康の保持増進のための指針",
    promulgation: "平成18年3月31日健康保持増進のための指針公示第3号",
    latestRevision: "令和2年改正",
    eGovUrl:
      "https://www.mhlw.go.jp/file/06-Seisakujouhou-11300000-Roudoukijunkyokuanzeneiseibu/0000050925.pdf",
    auditedAt: "2026-05-17",
  },
  VDTガイドライン: {
    fullName: "情報機器作業における労働衛生管理のためのガイドライン",
    promulgation: "令和元年7月12日 基発0712第3号",
    latestRevision: "令和元年策定（VDTガイドラインから改称）",
    eGovUrl:
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000114111.html",
    auditedAt: "2026-05-17",
  },
  均等法: {
    fullName: "雇用の分野における男女の均等な機会及び待遇の確保等に関する法律（男女雇用機会均等法）",
    promulgation: "昭和47年法律第113号",
    latestRevision: "令和元年改正（ハラスメント関係）",
    eGovUrl: "https://laws.e-gov.go.jp/law/347AC0000000113",
    auditedAt: "2026-05-17",
  },
};

/** Look up provenance metadata by `lawShort`. Returns undefined for unknown laws. */
export function getLawMetadata(lawShort: string): LawMetadata | undefined {
  return LAW_METADATA[lawShort];
}

/**
 * Per-law metadata: issuer (発出機関), enactment year, and known
 * amendment / effective dates for high-frequency articles. Used by the
 * chatbot to render the "条文番号 + 施行日 + 発出機関" citation triple.
 *
 * Effective-date facts here are limited to widely-published, MHLW-announced
 * dates. Anything not listed falls back to "原始制定" (omit effective date).
 * Do not infer effective dates from RAG context — only register facts that
 * can be cross-checked against e-Gov or MHLW circulars.
 */

export type LawMetadata = {
  /** lawShort (e.g. "安衛法") */
  lawShort: string;
  /** 正式名称 */
  fullName: string;
  /** 発出機関 (issuing/responsible body) */
  issuer: string;
  /** 原始制定の施行年月日（昭和/平成 表記） */
  enactedOn: string;
  /** e-Gov 法令番号 (URL用) */
  egovLawId?: string;
};

/**
 * 主要 33 法令の発出機関情報。lawShort をキーに引く。
 * 該当しないものは LAW_METADATA_FALLBACK を返す。
 */
export const LAW_METADATA: Record<string, LawMetadata> = {
  安衛法: {
    lawShort: "安衛法",
    fullName: "労働安全衛生法",
    issuer: "厚生労働省",
    enactedOn: "昭和47年6月8日公布・昭和47年10月1日施行",
    egovLawId: "347AC0000000057",
  },
  安衛則: {
    lawShort: "安衛則",
    fullName: "労働安全衛生規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000032",
  },
  安衛令: {
    lawShort: "安衛令",
    fullName: "労働安全衛生法施行令",
    issuer: "内閣（厚生労働省所管）",
    enactedOn: "昭和47年8月19日公布",
    egovLawId: "347CO0000000318",
  },
  クレーン則: {
    lawShort: "クレーン則",
    fullName: "クレーン等安全規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000034",
  },
  有機則: {
    lawShort: "有機則",
    fullName: "有機溶剤中毒予防規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000036",
  },
  特化則: {
    lawShort: "特化則",
    fullName: "特定化学物質障害予防規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000040",
  },
  酸欠則: {
    lawShort: "酸欠則",
    fullName: "酸素欠乏症等防止規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000042",
  },
  石綿則: {
    lawShort: "石綿則",
    fullName: "石綿障害予防規則",
    issuer: "厚生労働省",
    enactedOn: "平成17年7月1日施行",
    egovLawId: "417M60000100021",
  },
  粉じん則: {
    lawShort: "粉じん則",
    fullName: "粉じん障害防止規則",
    issuer: "厚生労働省",
    enactedOn: "昭和54年10月1日施行",
    egovLawId: "354M50002000018",
  },
  電離則: {
    lawShort: "電離則",
    fullName: "電離放射線障害防止規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000041",
  },
  鉛則: {
    lawShort: "鉛則",
    fullName: "鉛中毒予防規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000037",
  },
  四アルキル鉛則: {
    lawShort: "四アルキル鉛則",
    fullName: "四アルキル鉛中毒予防規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000038",
  },
  ボイラー則: {
    lawShort: "ボイラー則",
    fullName: "ボイラー及び圧力容器安全規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000033",
  },
  ゴンドラ則: {
    lawShort: "ゴンドラ則",
    fullName: "ゴンドラ安全規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000035",
  },
  高圧則: {
    lawShort: "高圧則",
    fullName: "高気圧作業安全衛生規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000040",
  },
  事務所則: {
    lawShort: "事務所則",
    fullName: "事務所衛生基準規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
    egovLawId: "347M50002000043",
  },
  機械等検定規則: {
    lawShort: "機械等検定規則",
    fullName: "機械等検定規則",
    issuer: "厚生労働省",
    enactedOn: "昭和47年9月30日施行",
  },
  作環測法: {
    lawShort: "作環測法",
    fullName: "作業環境測定法",
    issuer: "厚生労働省",
    enactedOn: "昭和50年5月1日施行",
    egovLawId: "350AC0000000028",
  },
  じん肺法: {
    lawShort: "じん肺法",
    fullName: "じん肺法",
    issuer: "厚生労働省",
    enactedOn: "昭和35年4月1日施行",
    egovLawId: "335AC0000000030",
  },
  労基法: {
    lawShort: "労基法",
    fullName: "労働基準法",
    issuer: "厚生労働省",
    enactedOn: "昭和22年9月1日施行",
    egovLawId: "322AC0000000049",
  },
  労基則: {
    lawShort: "労基則",
    fullName: "労働基準法施行規則",
    issuer: "厚生労働省",
    enactedOn: "昭和22年9月1日施行",
  },
  労契法: {
    lawShort: "労契法",
    fullName: "労働契約法",
    issuer: "厚生労働省",
    enactedOn: "平成20年3月1日施行",
    egovLawId: "419AC0000000128",
  },
  最賃法: {
    lawShort: "最賃法",
    fullName: "最低賃金法",
    issuer: "厚生労働省",
    enactedOn: "昭和34年4月1日施行",
  },
  労災保険法: {
    lawShort: "労災保険法",
    fullName: "労働者災害補償保険法",
    issuer: "厚生労働省",
    enactedOn: "昭和22年9月1日施行",
  },
  育介法: {
    lawShort: "育介法",
    fullName: "育児休業、介護休業等育児又は家族介護を行う労働者の福祉に関する法律",
    issuer: "厚生労働省",
    enactedOn: "平成4年4月1日施行",
  },
  均等法: {
    lawShort: "均等法",
    fullName: "雇用の分野における男女の均等な機会及び待遇の確保等に関する法律",
    issuer: "厚生労働省",
    enactedOn: "昭和61年4月1日施行",
  },
  パート有期法: {
    lawShort: "パート有期法",
    fullName: "短時間労働者及び有期雇用労働者の雇用管理の改善等に関する法律",
    issuer: "厚生労働省",
    enactedOn: "平成5年12月1日施行",
  },
  職安法: {
    lawShort: "職安法",
    fullName: "職業安定法",
    issuer: "厚生労働省",
    enactedOn: "昭和22年12月1日施行",
  },
  職能法: {
    lawShort: "職能法",
    fullName: "職業能力開発促進法",
    issuer: "厚生労働省",
    enactedOn: "昭和44年7月18日施行",
  },
  派遣法: {
    lawShort: "派遣法",
    fullName: "労働者派遣事業の適正な運営の確保及び派遣労働者の保護等に関する法律",
    issuer: "厚生労働省",
    enactedOn: "昭和61年7月1日施行",
  },
  建設業法: {
    lawShort: "建設業法",
    fullName: "建設業法",
    issuer: "国土交通省",
    enactedOn: "昭和24年5月24日施行",
  },
  女性則: {
    lawShort: "女性則",
    fullName: "女性労働基準規則",
    issuer: "厚生労働省",
    enactedOn: "昭和61年4月1日施行",
  },
  年少者則: {
    lawShort: "年少者則",
    fullName: "年少者労働基準規則",
    issuer: "厚生労働省",
    enactedOn: "昭和29年7月1日施行",
  },
  THP指針: {
    lawShort: "THP指針",
    fullName: "事業場における労働者の健康保持増進のための指針",
    issuer: "厚生労働省（健康保持増進・労働基準局長通達）",
    enactedOn: "昭和63年9月1日策定",
  },
  メンタル指針: {
    lawShort: "メンタル指針",
    fullName: "労働者の心の健康の保持増進のための指針",
    issuer: "厚生労働省（労働基準局長通達）",
    enactedOn: "平成18年3月31日策定",
  },
  VDTガイドライン: {
    lawShort: "VDTガイドライン",
    fullName: "情報機器作業における労働衛生管理のためのガイドライン",
    issuer: "厚生労働省（労働基準局長通達）",
    enactedOn: "令和元年7月12日改訂",
  },
  化学物質RA指針: {
    lawShort: "化学物質RA指針",
    fullName: "化学物質等による危険性又は有害性等の調査等に関する指針",
    issuer: "厚生労働省告示",
    enactedOn: "平成27年9月18日告示",
  },
  過重労働通達: {
    lawShort: "過重労働通達",
    fullName: "過重労働による健康障害防止のための総合対策",
    issuer: "厚生労働省（労働基準局長通達）",
    enactedOn: "令和2年4月1日改正",
  },
};

export const LAW_METADATA_FALLBACK: LawMetadata = {
  lawShort: "",
  fullName: "",
  issuer: "厚生労働省",
  enactedOn: "",
};

export function getLawMetadata(lawShort: string): LawMetadata {
  return LAW_METADATA[lawShort] ?? { ...LAW_METADATA_FALLBACK, lawShort };
}

/**
 * 特定条文の改正・新設施行日（条文 text に「【施行日：…】」が
 * 明記されているものや、近年広く公表された改正条文を補助的に保持）。
 * キー: `${lawShort}|${articleNum}`
 */
export const ARTICLE_EFFECTIVE_DATES: Record<string, string> = {
  "安衛則|第612条の2": "令和7年6月1日施行（熱中症対策の義務規定）",
  "安衛則|第563条": "平成27年7月1日施行（足場手すり中さん義務化）",
  "安衛法|第57条の2": "平成28年6月1日施行（SDS交付義務）",
  "安衛法|第57条の3": "平成28年6月1日施行（化学物質リスクアセスメント義務）",
  "安衛法|第28条の2": "平成18年4月1日施行（事業者の自主的リスクアセスメント）",
  "安衛則|第97条": "昭和47年9月30日施行（労働者死傷病報告）",
  "安衛則|第577条の2": "令和5年4月1日施行（化学物質の自律的管理）",
  "石綿則|第3条": "令和3年4月1日改正（事前調査・報告強化）",
  "特化則|第38条の8": "令和5年4月1日改正（化学物質管理者制度）",
};

export function getArticleEffectiveDate(
  lawShort: string,
  articleNum: string
): string | undefined {
  return ARTICLE_EFFECTIVE_DATES[`${lawShort}|${articleNum}`];
}

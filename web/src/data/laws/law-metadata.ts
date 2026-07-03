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
    auditedAt: "2026-07-03",
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
    auditedAt: "2026-07-03",
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
    auditedAt: "2026-07-03",
  },
  // キーはコーパス(LawArticle.lawShort)の実使用値に一致させること。
  // 不一致だと article-registry / chatbot がメタを引けず e-Gov リンクが欠落する
  // (2026-06-10 機械突合で 5 キーの不一致を是正: 作環測法・女性則・年少者則・職能法・パート有期法)。
  作環測法: {
    fullName: "作業環境測定法",
    promulgation: "昭和50年法律第28号",
    latestRevision: "令和7年改正（令和8年4月1日施行）",
    eGovUrl: "https://laws.e-gov.go.jp/law/350AC0000000028",
    auditedAt: "2026-07-03",
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
    latestRevision: "令和4年改正（刑法整備法・2025-06-01施行）",
    eGovUrl: "https://laws.e-gov.go.jp/law/334AC0000000137",
    auditedAt: "2026-07-04",
  },
  労契法: {
    fullName: "労働契約法",
    promulgation: "平成19年法律第128号",
    latestRevision: "平成30年改正（働き方改革整備法・2020-04-01施行）",
    eGovUrl: "https://laws.e-gov.go.jp/law/419AC0000000128",
    auditedAt: "2026-07-04",
  },
  育介法: {
    fullName: "育児休業、介護休業等育児又は家族介護を行う労働者の福祉に関する法律",
    promulgation: "平成3年法律第76号",
    latestRevision: "令和6年改正（2025-10-01施行・柔軟な働き方関連）",
    eGovUrl: "https://laws.e-gov.go.jp/law/403AC0000000076",
    auditedAt: "2026-07-03",
  },
  労災保険法: {
    fullName: "労働者災害補償保険法",
    promulgation: "昭和22年法律第50号",
    latestRevision: "令和6年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/322AC0000000050",
    auditedAt: "2026-07-03",
  },
  職安法: {
    fullName: "職業安定法",
    promulgation: "昭和22年法律第141号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/322AC0000000141",
    auditedAt: "2026-05-17",
  },
  職能法: {
    fullName: "職業能力開発促進法",
    promulgation: "昭和44年法律第64号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/344AC0000000064",
    auditedAt: "2026-07-04",
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
    auditedAt: "2026-07-04",
  },
  女性則: {
    fullName: "女性労働基準規則",
    promulgation: "昭和61年労働省令第3号",
    latestRevision: "令和元年厚生労働省令第1号（元号表記の整理・2019-05-07施行）",
    eGovUrl: "https://laws.e-gov.go.jp/law/361M50002000003",
    auditedAt: "2026-07-04",
  },
  年少者則: {
    fullName: "年少者労働基準規則",
    promulgation: "昭和29年労働省令第13号",
    latestRevision: "令和3年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/329M50002000013",
    auditedAt: "2026-07-04",
  },
  パート有期法: {
    fullName: "短時間労働者及び有期雇用労働者の雇用管理の改善等に関する法律",
    promulgation: "平成5年法律第76号",
    latestRevision: "令和元年改正（働き方改革・2020-06-01施行）",
    eGovUrl: "https://laws.e-gov.go.jp/law/405AC0000000076",
    auditedAt: "2026-07-04",
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
    auditedAt: "2026-07-03",
  },
  // 50法令体制（+12法令）
  過労死防止法: {
    fullName: "過労死等防止対策推進法",
    promulgation: "平成26年法律第100号",
    latestRevision: "令和3年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/426AC1000000100",
    auditedAt: "2026-05-17",
  },
  労災防止団体法: {
    fullName: "労働災害防止団体法",
    promulgation: "昭和39年法律第118号",
    latestRevision: "令和元年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/339AC0000000118",
    auditedAt: "2026-07-03",
  },
  健康増進法: {
    fullName: "健康増進法",
    promulgation: "平成14年法律第103号",
    latestRevision: "令和2年改正（受動喫煙防止）",
    eGovUrl: "https://laws.e-gov.go.jp/law/414AC0000000103",
    auditedAt: "2026-05-17",
  },
  じん肺則: {
    fullName: "じん肺法施行規則",
    promulgation: "昭和35年労働省令第6号",
    latestRevision: "令和3年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/335M50002000006",
    auditedAt: "2026-05-17",
  },
  高圧ガス保安法: {
    fullName: "高圧ガス保安法",
    promulgation: "昭和26年法律第204号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/326AC0000000204",
    auditedAt: "2026-05-17",
  },
  騒音規制法: {
    fullName: "騒音規制法",
    promulgation: "昭和43年法律第98号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/343AC0000000098",
    auditedAt: "2026-07-03",
  },
  化審法: {
    fullName: "化学物質の審査及び製造等の規制に関する法律",
    promulgation: "昭和48年法律第117号",
    latestRevision: "令和3年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/348AC0000000117",
    auditedAt: "2026-07-03",
  },
  毒劇法: {
    fullName: "毒物及び劇物取締法",
    promulgation: "昭和25年法律第303号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/325AC0000000303",
    auditedAt: "2026-05-17",
  },
  食品衛生法: {
    fullName: "食品衛生法",
    promulgation: "昭和22年法律第233号",
    latestRevision: "令和3年改正（HACCP完全施行）",
    eGovUrl: "https://laws.e-gov.go.jp/law/322AC0000000233",
    auditedAt: "2026-05-17",
  },
  建災防規程: {
    fullName: "建設業労働災害防止規程",
    promulgation: "建設業労働災害防止協会作成（労働災害防止団体法第36条 厚生労働大臣認可）",
    latestRevision: "令和5年改正",
    eGovUrl: "https://www.kensaibou.or.jp/",
    auditedAt: "2026-05-17",
  },
  港湾労働法: {
    fullName: "港湾労働法",
    promulgation: "昭和63年法律第40号",
    latestRevision: "令和4年改正（令和4年法律第68号・令和7年6月施行＝拘禁刑化）",
    eGovUrl: "https://laws.e-gov.go.jp/law/363AC0000000040",
    auditedAt: "2026-07-03",
  },
  船員安衛則: {
    fullName: "船員労働安全衛生規則",
    promulgation: "昭和39年運輸省令第53号",
    latestRevision: "令和4年改正",
    eGovUrl: "https://laws.e-gov.go.jp/law/339M50000800053",
    auditedAt: "2026-05-17",
  },
  // コーパス実使用の未登録 lawShort 12件を追加（2026-06-10 機械突合）。
  // 法令6件は e-Gov 法令API v2 で law_id・法令番号・最新改正を取得して登録。
  鉛則: {
    fullName: "鉛中毒予防規則",
    promulgation: "昭和47年労働省令第37号",
    latestRevision: "令和8年改正（令和8年厚生労働省令第3号）",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000037",
    auditedAt: "2026-06-10",
  },
  四アルキル鉛則: {
    fullName: "四アルキル鉛中毒予防規則",
    promulgation: "昭和47年労働省令第38号",
    latestRevision: "令和8年改正（令和8年厚生労働省令第3号）",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000038",
    auditedAt: "2026-06-10",
  },
  事務所則: {
    fullName: "事務所衛生基準規則",
    promulgation: "昭和47年労働省令第43号",
    latestRevision: "令和3年改正（照度基準等・令和3年厚生労働省令第188号）",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000043",
    auditedAt: "2026-06-10",
  },
  機械等検定規則: {
    fullName: "機械等検定規則",
    promulgation: "昭和47年労働省令第45号",
    latestRevision: "令和8年改正（令和8年厚生労働省令第3号）",
    eGovUrl: "https://laws.e-gov.go.jp/law/347M50002000045",
    auditedAt: "2026-06-10",
  },
  派遣法: {
    fullName: "労働者派遣事業の適正な運営の確保及び派遣労働者の保護等に関する法律",
    promulgation: "昭和60年法律第88号",
    latestRevision: "令和7年改正（令和7年法律第63号）",
    eGovUrl: "https://laws.e-gov.go.jp/law/360AC0000000088",
    auditedAt: "2026-07-03",
  },
  労施法: {
    fullName: "労働施策の総合的な推進並びに労働者の雇用の安定及び職業生活の充実等に関する法律",
    promulgation: "昭和41年法律第132号",
    latestRevision: "令和7年改正（令和7年法律第63号）",
    eGovUrl: "https://laws.e-gov.go.jp/law/341AC0000000132",
    auditedAt: "2026-06-10",
  },
  // 指針・通達6件は e-Gov 非収録のため MHLW 通達検索/安全衛生情報センターの全文を出典とする
  // （メンタル指針・VDTガイドラインと同じ扱い）。
  化学物質RA指針: {
    fullName: "化学物質等による危険性又は有害性等の調査等に関する指針",
    promulgation: "平成27年9月18日 危険性又は有害性等の調査等に関する指針公示第3号",
    latestRevision: "令和5年改正（令和5年4月27日 同指針公示第4号）",
    eGovUrl: "https://www.jaish.gr.jp/anzen/hor/hombun/hor1-14/hor1-14-6-1-0.htm",
    auditedAt: "2026-06-10",
  },
  過重労働通達: {
    fullName: "過重労働による健康障害防止のための総合対策",
    promulgation: "平成18年3月17日 基発第0317008号",
    latestRevision: "令和2年改正（時間外労働上限規制の中小企業適用に伴う改正）",
    eGovUrl: "https://www.mhlw.go.jp/content/000616605.pdf",
    auditedAt: "2026-06-10",
  },
  THP指針: {
    fullName: "事業場における労働者の健康保持増進のための指針",
    promulgation: "昭和63年9月1日 健康保持増進のための指針公示第1号",
    latestRevision: "令和5年3月31日改正",
    eGovUrl: "https://www.mhlw.go.jp/content/001080091.pdf",
    auditedAt: "2026-06-10",
  },
  熱中症通達: {
    fullName: "職場における熱中症予防基本対策要綱",
    promulgation: "令和3年4月20日 基発0420第3号",
    latestRevision:
      "令和8年3月18日 基発0318第1号により旧要綱廃止・新ガイドラインへ移行（令和7年6月1日 安衛則改正で対策義務化）",
    eGovUrl: "https://neccyusho.mhlw.go.jp/",
    auditedAt: "2026-06-10",
  },
  騒音指針: {
    fullName: "騒音障害防止のためのガイドライン",
    promulgation: "平成4年策定・令和5年4月20日 基発0420第2号で全面改訂",
    latestRevision: "令和5年改訂（騒音障害防止対策の管理者選任・個人ばく露測定等）",
    eGovUrl: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc7618&dataType=1&pageNo=1",
    auditedAt: "2026-06-10",
  },
  振動指針: {
    fullName: "チェーンソー以外の振動工具の取扱い業務に係る振動障害予防対策指針",
    promulgation: "平成21年7月10日 基発0710第2号（チェーンソーは同日 基発0710第1号）",
    latestRevision: "平成21年策定（日振動ばく露量A(8)に基づく対策へ全面改正）",
    eGovUrl: "https://www.mhlw.go.jp/web/t_doc?dataId=00tb5544&dataType=1&pageNo=1",
    auditedAt: "2026-06-10",
  },
};

/** Look up provenance metadata by `lawShort`. Returns undefined for unknown laws. */
export function getLawMetadata(lawShort: string): LawMetadata | undefined {
  return LAW_METADATA[lawShort];
}

/**
 * サイト全体で表示する KPI 数字を一元管理。
 * ページごとに別々にハードコードすると不整合が生じるため、ここから参照すること。
 *
 * C-1（モバイル実速度の構造是正）: 以前はデータセット（法令コーパス・通達DB・
 * 事故事例・設備DB）を import して件数を実計算していたが、本モジュールは
 * app-shell / share-buttons などクライアント常設部品から参照されるため、
 * 件数表示のためだけに数MBのデータが全ページのバンドルへ同梱されていた。
 * 現在は静的リテラルで保持し、データとの整合は site-stats.test.ts が
 * テスト時に実データを読み直して機械検証する（ズレたらテストが落ちる）。
 */
export const SITE_STATS = {
  /**
   * 厚労省 職場のあんぜんサイト 死傷災害データベース収録件数（2006〜2021・月別jsonl集計）。
   * /accidents ページの「元DB総件数」参照用。表示件数とは異なる。
   */
  accidentDbCount: "504,415",
  /**
   * 厚労省 死亡災害データベース収録件数（2019〜2024・6年分）。
   * /accidents ページの「死亡のみ集計」参照用。
   */
  mhlwDeathsCount: "4,782",
  /**
   * data/accidents-10years.jsonl 統合件数（2015〜2026・死亡災害DB＋curated事例＋速報事例）。
   * /accidents ページで実際に検索対象となる件数。accidentDbCount の絞り込み後。
   * 2025〜2026分は厚労省速報集計値ベースのパターン事例を含む（個票未公開のため）。
   */
  accidents10yCount: "5,026",
  /** data/law-updates-10years.jsonl 統合件数（2015〜2024・労働安全衛生関連法令改正） */
  lawUpdates10yCount: "31",
  /** 死亡労災件数（令和5年・建設業）厚労省統計 */
  fatalDisastersR5: "1,389",
  /** サイト独自に curated した詳細事故事例の件数（real-accident-cases* 全合算） */
  siteCuratedCaseCount: "292",
  /** 厚労省 化学物質情報データベース 取込件数 */
  chemicalsMhlwCount: "3,984",
  /** 化学物質検索DBの収録物質数（厚労省取込＋curated DB のマージ後 distinct） */
  mhlwMergedChemicalCount: "3,695",
  /** 公開条文検索へ出すhash検証済みe-Gov抜粋の法源数。 */
  lawSourceCount: "25",
  /** /law-searchへ出すhash検証済みe-Gov抜粋条文数。 */
  lawArticleCount: "63",
  /** AIが根拠候補として使うhash検証済みe-Govスナップショット法源数。 */
  ragSourceCount: "25",
  /**
   * RAG 検索（chatbot/法令要約）対応のhash検証済み全条文数。
   */
  ragArticleCount: "2,933",
  /** 対応教育の種類数（特別教育・法定・労働衛生、要相談含む） */
  specialEdKinds: "12+",
  /** 公式一次資料との文書同一性と該当抜粋を個別照合した通達・告示・指針件数 */
  mhlwNoticeCount: "1",
  /** 二次索引に収録された候補件数。本文未確認のため判断根拠・公開KPIには使わない。 */
  mhlwNoticeIndexCount: "869",
  /** 一次資料確認済みで公開できる商品点数（未検証レコードは隔離し数えない） */
  equipmentItemCount: "0",
  /**
   * 法令ナビ（/law-navi）の収載条文総数（curated 収載集合 LAW_NAVI_ENTRIES ＋
   * 全文由来ギャップ getAllFulltextNaviEntries、非indexable分含む「全文含め」の総数）。
   * sitemap-laws.xml の掲載件数（indexableのみ）とは異なる。
   */
  lawNaviTotalArticleCount: "1,965",
  /** 個別原文確認済みレコードのうち docType==="通達" の件数 */
  mhlwCircularCount: "1",
  /** 個別原文確認済みレコードのうち docType==="告示" の件数 */
  mhlwKokujiCount: "0",
  /** 個別原文確認済みレコードのうち docType==="指針" の件数 */
  mhlwShishinCount: "0",
  /** 厚労省リーフレット収録件数（mhlw-leaflets.ts） */
  mhlwLeafletCount: "289",
  /** 個別確認済み通達等 + リーフレット索引の合計（内訳と確認状態を分離表示する） */
  mhlwResourcesTotalCount: "290",
  /** 一次資料・事件番号・支持箇所の確認を完了した公開判例件数 */
  courtPrecedentCount: "0",
} as const;

/**
 * 各統計値の出典・取得日（YYYY-MM）。サイト上にツールチップ／脚注として表示する。
 * 数字を更新するときは asOf も合わせて更新すること。
 */
export type SiteStatKey = keyof typeof SITE_STATS;

export const SITE_STATS_META: Record<
  SiteStatKey,
  { source: string; sourceUrl?: string; asOf: string }
> = {
  accidentDbCount: {
    source:
      "厚労省 職場のあんぜんサイト 死傷災害データベース（2006〜2021・月別集計）",
    sourceUrl: "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx",
    asOf: "2026-01",
  },
  mhlwDeathsCount: {
    source:
      "厚労省 死亡災害DB（2019〜2023）＋死傷病報告オープンデータR06（2024確定値・739件）",
    sourceUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/tok/anst00.html",
    asOf: "2026-05",
  },
  accidents10yCount: {
    source:
      "安全AIポータル ETL: 厚労省死亡災害DB 2019-2024（確定値）＋curated事例 2015-2026＋速報パターン事例 2025-2026（厚労省月次速報集計値ベース）統合",
    sourceUrl: "https://anzeninfo.mhlw.go.jp/information/sokuhou.html",
    asOf: "2026-05",
  },
  lawUpdates10yCount: {
    source:
      "安全AIポータル ETL: data/law-updates-10years.jsonl（e-Gov・厚労省通達の10年統合）",
    sourceUrl: "https://laws.e-gov.go.jp/",
    asOf: "2026-04",
  },
  fatalDisastersR5: {
    source: "厚労省『令和5年労働災害発生状況』建設業計",
    sourceUrl: "https://www.mhlw.go.jp/stf/newpage_38791.html",
    asOf: "2024-05",
  },
  siteCuratedCaseCount: {
    source:
      "安全AIポータル 編集部による厚労省事例DBから curated した詳細事例集",
    asOf: "2026-04",
  },
  chemicalsMhlwCount: {
    source: "厚労省 職場のあんぜんサイト 化学物質情報",
    sourceUrl: "https://anzeninfo.mhlw.go.jp/anzen/kag/kag_index.html",
    asOf: "2026-04",
  },
  mhlwMergedChemicalCount: {
    source:
      "厚労省 化学物質情報＋サイト curated 物質DB のマージ後件数（lib/mhlw-chemicals.ts）",
    sourceUrl: "https://anzeninfo.mhlw.go.jp/anzen/kag/kag_index.html",
    asOf: "2026-06",
  },
  lawSourceCount: {
    source:
      "公開検索用hash検証済みe-Gov抜粋のdistinct法源数",
    sourceUrl: "https://laws.e-gov.go.jp/",
    asOf: "2026-06",
  },
  lawArticleCount: {
    source: "公開検索用hash検証済みe-Gov抜粋条文",
    sourceUrl: "https://laws.e-gov.go.jp/",
    asOf: "2026-08",
  },
  ragSourceCount: {
    source: "hash検証済みe-Gov法令APIスナップショットのdistinct法源数",
    sourceUrl: "https://laws.e-gov.go.jp/",
    asOf: "2026-07",
  },
  ragArticleCount: {
    source:
      "hash検証済みe-Gov法令APIスナップショットの非削除条文（AI根拠候補）",
    sourceUrl: "https://laws.e-gov.go.jp/",
    asOf: "2026-07",
  },
  specialEdKinds: {
    source: "安衛則第36条／酸欠則／粉じん則ほか（要相談含む）",
    asOf: "2026-04",
  },
  mhlwNoticeCount: {
    source: "公式一次資料との文書同一性・固定PDF・該当抜粋の個別照合allowlist",
    sourceUrl: "https://www.mhlw.go.jp/hourei/",
    asOf: "2026-08",
  },
  mhlwNoticeIndexCount: {
    source:
      "安全衛生情報センターの二次索引候補（本文・一次資料との個別対応は未確認、判断利用不可）",
    sourceUrl: "https://www.jaish.gr.jp/user/anzen/hor/tsutatsu.html",
    asOf: "2026-07",
  },
  equipmentItemCount: {
    source: "公開可能商品レコード（未検証データは隔離）",
    asOf: "2026-07",
  },
  lawNaviTotalArticleCount: {
    source:
      "法令ナビ curated 収載集合 ＋ 全文由来ギャップ（lib/law-navi/permalink.ts, fulltext-navi.ts）",
    asOf: "2026-07",
  },
  mhlwCircularCount: {
    source: '個別一次資料照合済みallowlistのうち docType==="通達"',
    sourceUrl: "https://www.mhlw.go.jp/hourei/",
    asOf: "2026-08",
  },
  mhlwKokujiCount: {
    source: '個別原文確認済みallowlistのうち docType==="告示"',
    sourceUrl: "https://www.mhlw.go.jp/hourei/",
    asOf: "2026-07",
  },
  mhlwShishinCount: {
    source: '個別原文確認済みallowlistのうち docType==="指針"',
    sourceUrl: "https://www.mhlw.go.jp/hourei/",
    asOf: "2026-07",
  },
  mhlwLeafletCount: {
    source: "厚労省リーフレットDB（mhlw-leaflets.ts）",
    asOf: "2026-07",
  },
  mhlwResourcesTotalCount: {
    source:
      "個別一次資料照合済み通達等 + リーフレット索引。両者の確認状態は個別表示する。",
    asOf: "2026-08",
  },
  courtPrecedentCount: {
    source: "公開可能判例allowlist（旧データは出典誤対応のため隔離）",
    asOf: "2026-07",
  },
};

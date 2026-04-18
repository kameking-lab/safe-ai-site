/**
 * 厚生労働省 (MHLW) 公開データの共通スキーマ。
 *
 * これらの型は、scripts/etl/ が JSONL として書き出すレコードと
 * 1:1 で対応する。JSONL の 1 行 = 1 レコード = 下記いずれかの型。
 *
 * ソースデータ:
 *   - shisho-db   (労働者死傷病報告、月次、h18〜r03)
 *   - deaths-db   (死亡災害、年次、r01〜r05)
 *   - chemicals   (がん原性・濃度基準・皮膚障害・SDS 対象)
 *   - laws        (法令・指針 PDF の条文)
 */

// --- 共通サブ型 ---------------------------------------------------------

/** 業種・起因物・事故の型などの 3 階層コード付き分類。 */
export type HierarchicalClassification = {
  majorCode: number | null;
  majorName: string | null;
  mediumCode: number | null;
  mediumName: string | null;
  minorCode: number | null;
  minorName: string | null;
};

export type AccidentTypeTag = {
  code: number | null;
  name: string | null;
};

// --- 労働者死傷病報告 (shisho-db) ---------------------------------------
// 出力先: web/src/data/accidents-mhlw/{YYYY}-{MM}.jsonl

export type Accident = {
  /** 西暦-月-連番 (例: "2021-12-000042")。 */
  id: string | null;
  source: "mhlw/shisho-db";
  /** 西暦 (filename から復元)。 */
  year: number;
  month: number;
  /** 元データの和暦 (例: "令和")。 */
  era: string | null;
  eraYear: number | null;
  /** 発生時間帯 (例: "16〜17")。 */
  occurrenceTime: string | null;
  /** 災害の概要テキスト。 */
  description: string | null;
  industry: HierarchicalClassification;
  /** 事業場規模帯 (例: "10〜29")。 */
  workplaceSize: string | null;
  cause: HierarchicalClassification;
  accidentType: AccidentTypeTag;
  age: number | null;
};

// --- 死亡災害 (deaths-db) ----------------------------------------------
// 出力先: web/src/data/deaths-mhlw/records-{YYYY}.jsonl

export type Death = {
  /** 西暦-D-連番 (例: "2022-D-000001")。 */
  id: string | null;
  source: "mhlw/deaths-db";
  year: number;
  month: number | null;
  occurrenceTime: string | null;
  description: string | null;
  industry: HierarchicalClassification;
  workplaceSize: string | null;
  cause: HierarchicalClassification;
  accidentType: AccidentTypeTag;
};

/** 死亡災害の集計 (業種×事故型 / 業種×局) — フェーズ 2 で実装。 */
export type DeathAggregate = {
  year: number;
  breakdown: "industry_by_bureau" | "industry_by_type";
  rows: Array<{
    industry: string;
    cells: Record<string, number>;
    total?: number;
  }>;
};

// --- 化学物質 (chemicals) ----------------------------------------------
// 出力先: web/src/data/chemicals-mhlw/chemicals.jsonl

export type ChemicalCategory =
  | "carcinogenic" //   001064830.xlsx  がん原性 (30年保存対象)
  | "concentration" //  1113_noudokijyun_all.xlsx  濃度基準値
  | "skin" //           hifu_*.xlsx  皮膚等障害 / 不浸透性保護具
  | "label_sds" //      label_sds_list_*.xlsx  ラベル表示・SDS 交付
  | "other";

export type Chemical = {
  sourceFile: string;
  sheet: string;
  category: ChemicalCategory;
  /** 適用日 (例: "R7.4.1" または "2025-10-10")。 */
  appliedDate: string | null;
  substance: string;
  /** CAS 登録番号。複合の場合は先頭のみ。 */
  casRn: string | null;
  /** そのシート固有の追加属性（列名→値）。 */
  attributes: Record<string, string | number | boolean>;
};

// --- 法令・指針 (laws) -------------------------------------------------
// 出力先: web/src/data/laws-mhlw/articles.jsonl

export type LawArticle = {
  sourceFile: string;
  page: number;
  /** 抽出できたとき: "第三条" 等。未抽出なら null (全文 1 レコード)。 */
  articleNumber: string | null;
  /** 条文見出し (括弧書き内)。 */
  heading: string | null;
  text: string;
};

/** _manifest.json の 1 エントリ。 */
export type LawManifestEntry = {
  records: number;
  /** 手動で付与する法令名。未設定なら null。 */
  title: string | null;
};

// --- エクスポートまとめ -------------------------------------------------

export type MhlwRecord = Accident | Death | Chemical | LawArticle;

/** 外部モジュールからの import 用に、データ配置パスを集約。 */
export const MHLW_DATA_PATHS = {
  accidents: "web/src/data/accidents-mhlw",
  deaths: "web/src/data/deaths-mhlw",
  chemicals: "web/src/data/chemicals-mhlw",
  laws: "web/src/data/laws-mhlw",
} as const;

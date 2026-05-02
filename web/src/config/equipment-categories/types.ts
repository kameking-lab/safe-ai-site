/** 保護具カテゴリ別の絞り込み質問定義 */

export type RefineOption = {
  /** 値（フィルタリングに使う） */
  value: string;
  /** 表示ラベル */
  label: string;
  /** 補足説明（任意） */
  hint?: string;
};

export type RefineQuestion = {
  /** 質問ID（フィルタキー） */
  id: string;
  /** 質問文 */
  label: string;
  /** 選択肢 */
  options: RefineOption[];
  /** "any" を選んだ時にスキップ可能か */
  optional?: boolean;
};

export type EquipmentCategory = {
  /** カテゴリID（カードと紐付ける） */
  id: string;
  /** 表示名 */
  label: string;
  /** カードに出すアイコン（絵文字） */
  icon: string;
  /** 短い説明 */
  description: string;
  /** 紐付くDBの categoryId 一覧（複数可） */
  dbCategoryIds: string[];
  /** subCategory に対する文字列マッチ（含めば対象） */
  subCategoryIncludes?: string[];
  /** subCategory に対する除外マッチ */
  subCategoryExcludes?: string[];
  /** 絞り込み質問（3〜6問） */
  refineQuestions: RefineQuestion[];
};

/** ユーザーの回答（質問id → 値） */
export type RefineAnswers = Record<string, string>;

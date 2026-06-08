/**
 * 外国人労働者 多言語安全教育 — 教育実施記録の純関数。
 *
 * 多言語教材ビルダーは教材を表示・印刷するだけで、誰に・いつ・何語で教育したかを
 * 残す手段が無かった。雇入れ時教育（安衛則第35条）や技能実習生の安全衛生教育は
 * 記録として保存・提示を求められるため、印刷時に実施記録様式（実施日・実施者・
 * 受講者名簿＋署名欄）を出せるよう、ここに表示非依存の整形ロジックを切り出す。
 */

import {
  MATERIAL_LANGUAGE_LABELS_JA,
  type MaterialLanguage,
} from "@/types/foreign-worker";

/** "YYYY-MM-DD" を「YYYY年M月D日」に。空・不正値なら空文字。 */
export function formatRecordDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/**
 * 受講者名の入力（1行1名のテキスト）を配列に正規化する。
 * 各行をトリムし、空行は除外。重複はそのまま残す（同姓同名の別人を想定）。
 */
export function parseAttendeeNames(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** 名簿表の1行。氏名は入力済みなら埋め、無ければ空（手書き欄）。 */
export interface RecordRow {
  /** 連番（1始まり） */
  no: number;
  /** 受講者氏名（空文字＝手書き用の空欄） */
  name: string;
}

/**
 * 名簿表の行を組み立てる。入力済みの氏名を先頭に並べ、`minRows` に満たない分は
 * 手書き用の空行で埋める。氏名数が `minRows` を超える場合は全員分を返す。
 */
export function buildRecordRows(names: string[], minRows: number): RecordRow[] {
  const total = Math.max(names.length, Math.max(0, minRows));
  const rows: RecordRow[] = [];
  for (let i = 0; i < total; i++) {
    rows.push({ no: i + 1, name: names[i] ?? "" });
  }
  return rows;
}

/**
 * 印刷記録に出す「使用言語」表記を作る。母国語で教育を実施した証跡となるよう、
 * 選択中の言語を日本語ラベルで並べる。MATERIAL_LANGUAGES の並び順を保つ。
 */
export function formatUsedLanguages(langs: MaterialLanguage[]): string {
  if (langs.length === 0) return "（未選択）";
  return langs.map((l) => MATERIAL_LANGUAGE_LABELS_JA[l]).join("・");
}

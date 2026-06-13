/**
 * 集計データの CSV 出力（柱C-7「事故統計の出力手段」の共通基盤）。
 * 元請の「月例安全会議の資料に貼る」を完了させるための持ち出し手段。
 * すべて純関数＝サーバー/クライアント両方で同じ出力。DOM・Blob には触れない
 * （ダウンロード処理は呼び出し側のクライアント部品が担当）。
 *
 * 区切りは CRLF。Excel でそのまま開ける前提（BOM は呼び出し側で付与）。
 */

export type CsvSection = {
  /** セクション見出し（任意・1セル行として先頭に出力） */
  title?: string;
  /** 列見出し */
  headers: readonly string[];
  /** 行データ */
  rows: ReadonlyArray<ReadonlyArray<string | number>>;
};

const CRLF = "\r\n";

/** CSV のセル値。カンマ・引用符・改行を含む場合はダブルクォートで囲む（RFC 4180）。 */
export function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 複数セクションを1つの CSV 文字列へ畳む（セクション間は空行で区切る）。
 * 1ファイルに複数の集計表（KPI・業種別・事故種類別…）を縦に並べる用途。
 */
export function sectionsToCsv(sections: readonly CsvSection[]): string {
  const blocks = sections.map((sec) => {
    const lines: string[] = [];
    if (sec.title) lines.push(csvEscape(sec.title));
    lines.push(sec.headers.map(csvEscape).join(","));
    for (const row of sec.rows) {
      lines.push(row.map(csvEscape).join(","));
    }
    return lines.join(CRLF);
  });
  return blocks.join(CRLF + CRLF);
}

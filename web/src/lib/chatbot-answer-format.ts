/**
 * チャットボット回答本文の整形（「ごちゃごちゃブロック」根絶 2026-07-11）
 *
 * 背景（本番実測）: /api/chatbot は回答本文（answer）の末尾に
 * 「📎 出典…」「【関連通達・告示】」「【関連リーフレット・教材】」
 * 「【合わせて確認すべき法令】」等を生テキストで追記していたが、
 * 同じ情報は構造化フィールド（citations / attachedNotices /
 * attachedLeaflets / relatedLaws / scopeWarnings）として返され、
 * UI が折りたたみカードで別途表示している＝完全な二重表示だった。
 * さらに Gemini の markdown 記法（`*   **…**` 箇条書き・`---` 水平線）が
 * UI（whitespace-pre-wrap ＋ 太字のみのミニレンダラ）では記号のまま
 * 露出し、モバイル390pxで読めない「ブロックの山」になっていた。
 *
 * 本モジュールの役割:
 * - stripAnswerTailBlocks: 追記テール・本文中の免責/注記ブロックを除去
 *   （サーバー側は生成直後の防壁として、UI側は旧キャッシュ・保存済み
 *   セッションの後方互換として使う）
 * - normalizeAnswerMarkdown: markdown 記号を日本語プレーンテキストの
 *   読める形（「・」箇条書き・太字マーカー温存）へ正規化
 *
 * 正確性は不可侵: どちらも法令内容の文字列には触れず、書式記号と
 * 二重表示ブロックのみを対象にする（結論・条文名・数値は一字も変えない）。
 */

/** 回答末尾に追記されていた（＝構造化フィールドと二重の）テールブロックの行頭マーカー */
export const ANSWER_TAIL_MARKERS: readonly string[] = [
  "📎 出典（条文番号＋施行日＋発出機関）",
  "📎 出典：",
  "🏛 所管省庁資料:",
  "【関連通達・告示】",
  "【関連リーフレット・教材】",
  "【合わせて確認すべき法令】",
];

/** 本文から除去する警告・免責パラグラフの先頭パターン（UI では別枠で常時/構造表示される） */
const REDUNDANT_PARAGRAPH_RE =
  /^(?:-{3,}\s*\n)?\s*(?:⚠️?\s*本回答はAIによる情報提供|⚠️?\s*注記：|⚠️?\s*引用条文の検証結果：)/;

/**
 * 回答本文から「構造化フィールドと二重のテールブロック」と
 * 「UIが別枠表示する免責・範囲外注記」を取り除く。
 *
 * - 最初のテールマーカー行以降をすべて落とす（テールは常に末尾へ連続追記される）
 * - 免責（---＋⚠️ 本回答はAI…）/ ⚠️ 注記：… / ⚠️ 引用条文の検証結果：… の
 *   パラグラフを落とす（scopeWarnings / 常設免責バナーが同内容を表示）
 */
export function stripAnswerTailBlocks(answer: string): string {
  if (!answer) return answer;

  const lines = answer.split("\n");
  let cutIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (ANSWER_TAIL_MARKERS.some((m) => trimmed.startsWith(m))) {
      cutIdx = i;
      break;
    }
  }
  let text = cutIdx >= 0 ? lines.slice(0, cutIdx).join("\n") : answer;

  text = text
    .split(/\n{2,}/)
    .filter((para) => !REDUNDANT_PARAGRAPH_RE.test(para.trim()))
    .join("\n\n");

  return text.trim();
}

/** 水平線行（--- / *** / ___）か */
const HR_LINE_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
/** markdown 見出し行 */
const HEADING_RE = /^\s*#{1,6}\s+(.+)$/;
/** markdown 箇条書き行（記号の後に空白必須 ＝ `**太字**` 行頭とは衝突しない） */
const BULLET_RE = /^(\s*)[*+-]\s+(.+)$/;

/**
 * Gemini が出力しがちな markdown 記法を、whitespace-pre-wrap ＋
 * 太字ミニレンダラ（**…** のみ解釈）で読めるプレーン表記に正規化する。
 *
 * - `* ` / `- ` / `+ ` 箇条書き → 「・」（入れ子は全角スペースで字下げ）
 * - `#` 見出し → **太字** 行
 * - 水平線（---）→ 削除
 * - 3連以上の空行 → 2つに圧縮
 * 本文の語句そのものは変更しない。
 */
export function normalizeAnswerMarkdown(text: string): string {
  if (!text) return text;
  const out: string[] = [];
  for (const line of text.split("\n")) {
    if (HR_LINE_RE.test(line)) continue;

    const heading = HEADING_RE.exec(line);
    if (heading) {
      out.push(`**${heading[1].trim()}**`);
      continue;
    }

    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      const indentWidth = bullet[1].replace(/\t/g, "  ").length;
      const depth = Math.min(Math.floor(indentWidth / 2), 3);
      out.push(`${"　".repeat(depth)}・${bullet[2]}`);
      continue;
    }

    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * UI 表示用の一括整形。旧形式（テール追記あり）の保存済みセッション・
 * キャッシュ応答も、この関数を通すだけで新形式と同じ見た目になる。
 */
export function formatAnswerForDisplay(answer: string): string {
  return normalizeAnswerMarkdown(stripAnswerTailBlocks(answer));
}

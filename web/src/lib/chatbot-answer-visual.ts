/**
 * チャットボット回答のビジュアルファースト化（柱0・社長指示 2026-06-10）
 *
 * 結論ファースト: 回答プロンプトは「結論を本文先頭に1〜2文で書く」ことを強制している
 * （app/api/chatbot/route.ts / chatbot-prompt-builder.ts）。本モジュールはその先頭文を
 * **一字も変えずに**切り出して結論カードに載せるだけで、要約・言い換えは一切しない
 * （法令正確性は不可侵・捏造0）。conclusion + rest = 元の回答全文が常に成り立つ。
 *
 * 色の文法: カードの色は「回答内容の安全/危険」ではなく「根拠の確かさ」で塗る。
 *   赤 = 提供データ範囲外の参照を検出（要注意・最優先で疑う）
 *   黄 = AI推論・条文特定できず（専門家確認が必要）
 *   青 = 法令DBに根拠あり（指示・案内の青。回答=現場への指示）
 * 緑を回答カードに使わないのは意図的 — 「義務があります」という回答が緑だと
 * 無読ペルソナに「OK・問題なし」と誤読される（事故DBの「負傷に緑を使わない」と同じ思想）。
 * 根拠の確かさは緑の小チップ（法令DB根拠）で別途示す。
 */

import type { SafetyTone } from "@/lib/design/safety-tone";

export type AnswerConclusion = {
  /** 回答冒頭の結論（verbatim・最大2文） */
  conclusion: string;
  /** 残りの本文（詳細層へ。conclusion と合わせると元の全文） */
  rest: string;
};

/** 2文目まで結論に含める場合の合計文字数上限（デカ表示が間延びしない範囲） */
const TWO_SENTENCE_LIMIT = 120;

/**
 * 回答冒頭の結論1〜2文を切り出す。
 * - 第1段落（最初の空行まで）の中で「。」区切りの文を先頭から取る。
 * - 2文目は合計が TWO_SENTENCE_LIMIT 以下に収まる場合のみ含める（プロンプトの
 *   結論例は2文構成のため。例: 「…技能講習の修了が必要です（…）。1t未満は特別教育で足ります。」）。
 * - 箇条書き・見出しで始まる回答は最初の行のみを結論とする。
 * - 「。」が無い場合は最初の行全体を結論とする。
 * 戻り値は常に conclusion + rest が入力（trim後）の全文と一致する分割。
 */
export function splitAnswerConclusion(answer: string): AnswerConclusion {
  const text = answer.trim();
  if (!text) return { conclusion: "", rest: "" };

  const firstLineEnd = text.indexOf("\n");
  const firstLine = firstLineEnd >= 0 ? text.slice(0, firstLineEnd) : text;

  // 箇条書き・見出し始まりは行単位で切る（文抽出が崩れるため）
  if (/^(?:[-*・#>]|[0-9０-９]+[.．)）])/.test(firstLine.trim())) {
    return cutAt(text, firstLine.length);
  }

  // 第1段落（空行まで）を文分割の対象にする
  const paraEnd = text.indexOf("\n\n");
  const paragraph = paraEnd >= 0 ? text.slice(0, paraEnd) : text;

  const sentenceEnds: number[] = [];
  for (let i = 0; i < paragraph.length && sentenceEnds.length < 2; i++) {
    if (paragraph[i] === "。") sentenceEnds.push(i + 1);
  }

  if (sentenceEnds.length === 0) {
    // 「。」なし → 第1段落の最初の行まで
    return cutAt(text, firstLine.length);
  }

  let cut = sentenceEnds[0];
  if (sentenceEnds.length > 1 && sentenceEnds[1] <= TWO_SENTENCE_LIMIT) {
    cut = sentenceEnds[1];
  }
  return cutAt(text, cut);
}

function cutAt(text: string, index: number): AnswerConclusion {
  return {
    conclusion: text.slice(0, index).trim(),
    rest: text.slice(index).trim(),
  };
}

export type AnswerEvidenceInput = {
  sourceType?: "rag" | "ai_inference";
  confidence?: "high" | "medium" | "low";
  scopeWarningCount?: number;
};

/**
 * 結論カード全体のトーン。
 * 赤・黄は「ユーザーが対応すべきこと（=回答を鵜呑みにせず確認）」がある時だけ。
 * 通常の法令DB根拠回答は青（指示・案内）。メタ未取得（生成停止・旧履歴）も青。
 */
export function answerCardTone(input: AnswerEvidenceInput): SafetyTone {
  if ((input.scopeWarningCount ?? 0) > 0) return "danger";
  if (input.sourceType === "ai_inference") return "warning";
  return "info";
}

export type EvidenceBadge = {
  tone: SafetyTone;
  /** 漢字中心の短ラベル */
  label: string;
};

/**
 * 根拠の確かさチップ。source_type 未確定（ストリーミング中断等）は null。
 * 既存の「📚 法令データベースから検索（緑）/ 🤖 AI推論（橙）/ 🔴 条文を特定できず」と
 * 同じ判定をトークン色に正規化したもの。
 */
export function evidenceBadge(input: AnswerEvidenceInput): EvidenceBadge | null {
  if (!input.sourceType) return null;
  if (input.sourceType === "rag") {
    return { tone: "safe", label: "法令DB根拠" };
  }
  if (input.confidence === "low") {
    return { tone: "warning", label: "条文特定できず" };
  }
  return { tone: "warning", label: "AI推論・要確認" };
}

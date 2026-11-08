import type { ChatTurn } from "@/lib/chatbot-contract";
import { externalCredentialedServicesAllowed } from "@/lib/server/deployment-safety";

/**
 * 法令AIチャットの生成（Gemini）を、チャットだけで有効にするスイッチ。
 * サイト全体の GEMINI_EXTERNAL_AI_ENABLED を立てると課金台帳を通らない他機能まで
 * 生成が始まるため、チャットは LEGAL_CHAT_AI_ENABLED だけでも有効にできる
 * （チャットの呼び出しは共通の月間原価台帳 withProviderBudget を必ず通る）。
 */
export function legalChatAiAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!externalCredentialedServicesAllowed(env)) return false;
  return (
    env.LEGAL_CHAT_AI_ENABLED?.trim().toLowerCase() === "true" ||
    env.GEMINI_EXTERNAL_AI_ENABLED?.trim().toLowerCase() === "true"
  );
}

/** 条文の根拠が付かない回答に必ず添える1行。 */
export const NO_EVIDENCE_NOTE = "この回答は条文の根拠を確認できていません。";

/** AI が使えないときでも、根拠が見つからない質問に「何かしら」返す一般的な助言。 */
export const GENERAL_SAFETY_ADVICE = [
  "一般的な安全上の目安（参考）:",
  "・作業の前に、どこで何が起きうるか（墜落・挟まれ・感電・有害物など）を洗い出し、危険の大きいものから対策する",
  "・作業手順と立入範囲を決め、保護具（保護帽・安全帯・保護手袋・保護めがね等）を作業に合わせて着用する",
  "・資格・特別教育・作業主任者が要る作業かを、元請・安全衛生責任者に確認する",
  "・判断に迷うときは、所轄の労働基準監督署や労働安全コンサルタントに相談する",
].join("\n");

export function withNoEvidenceNote(answer: string): string {
  const body = answer.trimEnd();
  return body.includes(NO_EVIDENCE_NOTE) ? body : `${body}\n\n${NO_EVIDENCE_NOTE}`;
}


/**
 * 同じチャットの直前のやり取り（最大6件・各500字）をプロンプトに渡す。
 * 履歴は受付時に個人情報・機密の送信検査を通過済み（inspectAiOutbound）。
 */
export function buildConversationBlock(history: readonly ChatTurn[] | undefined): string {
  if (!history?.length) return "";
  const turns = history
    .filter((t) => (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim())
    .slice(-6)
    .map((t) => `${t.role === "user" ? "利用者" : "AI"}: ${t.content.trim().slice(0, 500)}`);
  if (!turns.length) return "";
  return `【これまでの会話（同じチャット）】\n${turns.join("\n")}\n\n今回の質問は上の会話の続きです。指示語（それ・その場合・さっきの等）は上の会話の話題として解釈し、話題に沿って答えてください。\n\n`;
}

/** 関連条文が1件も無いときの生成プロンプト。断らずに一般的な安全上の助言を短く返させる。 */
export function buildGeneralAdvicePrompt(question: string): string {
  return `次の質問について、本ツールの収録法令からは根拠となる条文を特定できませんでした。
断ったり「わかりません」で終えたりせず、労働安全衛生の一般的な考え方に基づいて、現場担当者に役立つ助言を短く返してください。

【質問】
${question}

回答のきまり:
- 冒頭1〜2文で質問への答え（一般論としての目安）を書く。
- 続けて具体的な注意点・対策を「・」の箇条書きで3〜5個。
- 法令名・条番号・通達番号・具体的な数値基準は書かない（根拠を確認できていないため）。
- 最後に、正確な基準は e-Gov 法令検索・厚生労働省・所轄の労働基準監督署で確認するよう1文で案内する。
- 全体で400字以内。markdown の見出し・表は使わない。`;
}

/** Gemini のストリーム最終チャンクから終了理由と使用トークンを読む（ログ用）。 */
export type GenerationMeta = { finishReason: string | null; promptTokens: number | null; outputTokens: number | null };
export function readGenerationMeta(chunk: unknown, previous: GenerationMeta): GenerationMeta {
  const c = chunk as { candidates?: Array<{ finishReason?: unknown }>; usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown } } | null;
  const finish = c?.candidates?.[0]?.finishReason;
  const usage = c?.usageMetadata;
  return {
    finishReason: typeof finish === "string" ? finish : previous.finishReason,
    promptTokens: typeof usage?.promptTokenCount === "number" ? usage.promptTokenCount : previous.promptTokens,
    outputTokens: typeof usage?.candidatesTokenCount === "number" ? usage.candidatesTokenCount : previous.outputTokens,
  };
}

/** 本番で「応答が本物か・切れていないか」を後から確かめるための1行ログ（質問本文は出さない）。 */
export function logLegalChatGeneration(entry: {
  route: "stream" | "json";
  mode: "evidence" | "related" | "general";
  historyTurns: number;
  answerChars: number;
  usedGeneratedText: boolean;
} & GenerationMeta): void {
  console.info(JSON.stringify({ event: "legal_chat_generation", at: new Date().toISOString(), ...entry }));
}

/**
 * 定型の「根拠なし」回答（結論→条件→根拠→適用時点→次の質問）を、保留で終わらせず
 * 一般的な助言つきに書き換える。助言と根拠未確認の1行は「次の質問」より前に入れる
 * （finalizeChatbotResponse が「次の質問」以降を確認質問1件に置き換えるため）。
 */
export function noEvidenceAdviceAnswer(template: string): string {
  const answer = template.replace(
    /この条件に直接対応する根拠を確認できないため、回答を保留します。/,
    "この質問に直接対応する条文の根拠は見つかりませんでした。一般的な安全上の目安を下にまとめます。",
  );
  const block = `${GENERAL_SAFETY_ADVICE}\n\n${NO_EVIDENCE_NOTE}`;
  const next = answer.search(/\n次の質問\n/);
  if (next < 0) return `${answer.trimEnd()}\n\n${block}`;
  return `${answer.slice(0, next).trimEnd()}\n\n${block}\n${answer.slice(next)}`;
}

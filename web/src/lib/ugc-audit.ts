/**
 * UGC監査パイプライン（4層）:
 *  1. NGワード検出
 *  2. スパム判定
 *  3. 個人情報マスキング
 *  4. 公開推奨度スコア（Geminiモック実装。API未接続時はルールベース）
 */

import type { UgcAuditFlags } from "./ugc-types";

const NG_WORDS = [
  // 露骨な誹謗・差別語など。実運用ではモデレータが拡張する想定
  "死ね",
  "殺す",
  "クソ",
  "ふざけるな",
  "馬鹿野郎",
  "アホ",
  "詐欺",
  "クレーム",
  "訴える",
];

const SPAM_PATTERNS: { pattern: RegExp; weight: number }[] = [
  { pattern: /(https?:\/\/[^\s]+){3,}/i, weight: 0.6 }, // 3個以上のURL
  { pattern: /([！!]){5,}/, weight: 0.3 }, // 連続感嘆符
  { pattern: /(.)\1{8,}/, weight: 0.4 }, // 同一文字9回以上
  { pattern: /稼げる|高収入|副業|投資/i, weight: 0.3 }, // 副業勧誘
  { pattern: /公式LINE|友達追加|@line/i, weight: 0.4 },
  { pattern: /VIP|アダルト|出会い系/i, weight: 0.7 },
];

// ────────────────────────────────────────
// 1. NGワード
// ────────────────────────────────────────
export function detectNgWords(text: string): string[] {
  const lower = text.toLowerCase();
  return NG_WORDS.filter((w) => lower.includes(w.toLowerCase()));
}

// ────────────────────────────────────────
// 2. スパム判定 (0-1)
// ────────────────────────────────────────
export function calculateSpamScore(text: string): number {
  let score = 0;
  for (const { pattern, weight } of SPAM_PATTERNS) {
    if (pattern.test(text)) score += weight;
  }
  // 短すぎる本文は内容なしスパムの疑い
  if (text.trim().length < 15) score += 0.3;
  return Math.min(1, score);
}

// ────────────────────────────────────────
// 3. 個人情報マスキング
// ────────────────────────────────────────
const PII_PATTERNS = {
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  // 日本の電話番号（ハイフンあり/なし、固定/携帯）
  phone: /(0\d{1,4}-\d{1,4}-\d{4}|0\d{9,10})/g,
  // 郵便番号
  postal: /〒?\d{3}-?\d{4}/g,
  // 氏名（さん付き）— ざっくりだが現場文章で頻出するため。例:「山田さん」「田中部長」
  honorific: /[一-龥]{2,4}(さん|くん|君|部長|課長|主任|社長|専務|常務)/g,
};

export type PiiMaskResult = {
  masked: string;
  detected: string[];
};

export function maskPii(text: string): PiiMaskResult {
  let masked = text;
  const detected: string[] = [];

  if (PII_PATTERNS.email.test(masked)) {
    detected.push("email");
    masked = masked.replace(PII_PATTERNS.email, "[メール削除]");
  }
  if (PII_PATTERNS.phone.test(masked)) {
    detected.push("phone");
    masked = masked.replace(PII_PATTERNS.phone, "[電話番号削除]");
  }
  if (PII_PATTERNS.postal.test(masked)) {
    detected.push("postal");
    masked = masked.replace(PII_PATTERNS.postal, "[住所削除]");
  }
  if (PII_PATTERNS.honorific.test(masked)) {
    detected.push("name");
    masked = masked.replace(PII_PATTERNS.honorific, "○○さん");
  }

  return { masked, detected };
}

// ────────────────────────────────────────
// 4. 公開推奨度スコア (0-100) — ルールベース実装
// 将来 Gemini を呼ぶ場合は src/lib/gemini.ts と連携
// ────────────────────────────────────────
export function calculateRecommendScore(args: {
  text: string;
  ngWords: string[];
  spamScore: number;
  piiDetected: string[];
}): { score: number; reasons: string[] } {
  let score = 70; // 起点
  const reasons: string[] = [];

  if (args.ngWords.length > 0) {
    score -= 40;
    reasons.push(`NGワード検出: ${args.ngWords.join(", ")}`);
  }

  score -= Math.round(args.spamScore * 50);
  if (args.spamScore >= 0.5) {
    reasons.push("スパム的な特徴を検出");
  }

  if (args.piiDetected.length > 0) {
    // 自動マスキングで処置済み。減点は軽微
    score -= 5;
    reasons.push(`個人情報を自動マスキング: ${args.piiDetected.join(", ")}`);
  }

  // 内容の充実度（本文の長さ）
  const len = args.text.trim().length;
  if (len >= 100) {
    score += 15;
    reasons.push("十分な記述量");
  } else if (len < 30) {
    score -= 15;
    reasons.push("記述量が不足");
  }

  // 安全用語が含まれていれば加点
  if (/(KY|危険予知|ヒヤリ|墜落|転倒|挟まれ|RA|リスクアセス)/.test(args.text)) {
    score += 10;
    reasons.push("安全関連の具体的な記述");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

// ────────────────────────────────────────
// 統合: 全パイプライン実行
// ────────────────────────────────────────
export type AuditInput = { text: string };
export type AuditResult = {
  audit: UgcAuditFlags;
  maskedText: string;
};

export function runAuditPipeline(input: AuditInput): AuditResult {
  const ngWords = detectNgWords(input.text);
  const spamScore = calculateSpamScore(input.text);
  const { masked, detected: piiDetected } = maskPii(input.text);
  const { score: recommendScore, reasons } = calculateRecommendScore({
    text: input.text,
    ngWords,
    spamScore,
    piiDetected,
  });

  let recommendation: UgcAuditFlags["recommendation"];
  if (ngWords.length > 0 || spamScore >= 0.7) {
    recommendation = "auto_reject";
  } else if (recommendScore >= 75 && spamScore < 0.3) {
    recommendation = "auto_approve";
  } else {
    recommendation = "needs_review";
  }

  return {
    audit: {
      ngWords,
      spamScore: Math.round(spamScore * 100) / 100,
      piiDetected,
      recommendScore,
      recommendation,
      reasons,
    },
    maskedText: masked,
  };
}

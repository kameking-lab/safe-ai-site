import { describe, expect, it } from "vitest";
import robots from "./robots";

/**
 * 決裁A 回帰テスト（2026-06-11 オーナー決裁）:
 * SNSリンクプレビュー（FB/Messenger/Instagram）の OGP フェッチャ facebookexternalhit を
 * 学習クローラ遮断から Allow 扱いへ移した状態を固定する。
 *
 * - facebookexternalhit は Allow:/ （非公開パスのみ除外）
 * - 学習用クローラ（GPTBot/ClaudeBot/FacebookBot/Bytespider 等）は遮断を維持
 * - FacebookBot（広告/インデックス用）と facebookexternalhit（ユーザー操作起点のOGP取得）は別物
 */
type Rule = {
  userAgent?: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
};

function ruleFor(ua: string): Rule | undefined {
  const { rules } = robots();
  const list = (Array.isArray(rules) ? rules : rules ? [rules] : []) as Rule[];
  return list.find((r) => {
    const agents = Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent];
    return agents.includes(ua);
  });
}

function toArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

describe("robots.txt（決裁A SNSリンクプレビュー復活）", () => {
  it("facebookexternalhit は Allow:/ 扱いになっている", () => {
    const rule = ruleFor("facebookexternalhit");
    expect(rule).toBeDefined();
    expect(toArray(rule?.allow)).toContain("/");
  });

  it("facebookexternalhit はサイト全体を遮断していない（disallow:/ を持たない）", () => {
    const rule = ruleFor("facebookexternalhit");
    expect(toArray(rule?.disallow)).not.toContain("/");
  });

  it("facebookexternalhit でも共通の非公開パスは除外し続ける", () => {
    const rule = ruleFor("facebookexternalhit");
    expect(toArray(rule?.disallow)).toContain("/admin/");
    expect(toArray(rule?.disallow)).toContain("/api/");
  });

  it("学習用クローラ（FacebookBot 等）はサイト全体を遮断したまま", () => {
    for (const ua of ["GPTBot", "ClaudeBot", "FacebookBot", "Bytespider"]) {
      const rule = ruleFor(ua);
      expect(rule, `${ua} のルールが存在する`).toBeDefined();
      expect(toArray(rule?.disallow), `${ua} は disallow:/`).toContain("/");
      expect(toArray(rule?.allow), `${ua} は Allow:/ を持たない`).not.toContain("/");
    }
  });

  it("FacebookBot（遮断）と facebookexternalhit（許可）は別UAとして扱う", () => {
    const blocked = ruleFor("FacebookBot");
    const allowed = ruleFor("facebookexternalhit");
    expect(toArray(blocked?.disallow)).toContain("/");
    expect(toArray(allowed?.allow)).toContain("/");
  });
});

/**
 * AI学習専用UAの遮断拡張（2026-06-14）:
 * 2026-06-11 決裁「学習系は遮断継続」を、各社が後発で分離・新設した AI学習専用UA へ拡張。
 * 重要なのは *-Extended が「学習オプトアウト専用」で、検索クローラ（Googlebot/Applebot）とは
 * 別UAである点。検索順位・流入に影響を与えないことをテストで固定する。
 */
describe("robots.txt（AI学習専用UAの遮断拡張）", () => {
  it("後発の AI学習クローラはサイト全体を遮断する", () => {
    for (const ua of [
      "Google-Extended",
      "Applebot-Extended",
      "Meta-ExternalAgent",
      "cohere-ai",
      "AI2Bot",
      "PanguBot",
    ]) {
      const rule = ruleFor(ua);
      expect(rule, `${ua} のルールが存在する`).toBeDefined();
      expect(toArray(rule?.disallow), `${ua} は disallow:/`).toContain("/");
      expect(toArray(rule?.allow), `${ua} は Allow:/ を持たない`).not.toContain("/");
    }
  });

  it("検索クローラ（Googlebot/Applebot）は遮断していない＝検索順位・流入を保つ", () => {
    // -Extended（学習専用）の追加が、同名プレフィックスの検索UAを巻き込んで遮断していないことを保証。
    // Googlebot/Applebot は専用の遮断ルールを持たず、UA:* の Allow:/ が適用される。
    for (const ua of ["Googlebot", "Applebot"]) {
      const rule = ruleFor(ua);
      expect(rule, `${ua} には専用の遮断ルールが無い`).toBeUndefined();
    }
    const wildcard = ruleFor("*");
    expect(toArray(wildcard?.allow), "UA:* は Allow:/").toContain("/");
  });

  it("Anthropic の検索/ユーザー操作UA（Claude-SearchBot/Claude-User）は許可、学習用 ClaudeBot は遮断", () => {
    for (const ua of ["Claude-SearchBot", "Claude-User"]) {
      const rule = ruleFor(ua);
      expect(rule, `${ua} のルールが存在する`).toBeDefined();
      expect(toArray(rule?.allow), `${ua} は Allow:/`).toContain("/");
      expect(toArray(rule?.disallow), `${ua} は disallow:/ を持たない`).not.toContain("/");
    }
    const training = ruleFor("ClaudeBot");
    expect(toArray(training?.disallow), "ClaudeBot は disallow:/").toContain("/");
  });
});

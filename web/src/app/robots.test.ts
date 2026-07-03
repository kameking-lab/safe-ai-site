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

function allRules(): Rule[] {
  const { rules } = robots();
  return (Array.isArray(rules) ? rules : rules ? [rules] : []) as Rule[];
}

/** ルールが「サイト全体許可」（allow に "/" を含む）か。 */
function isAllowAll(r: Rule): boolean {
  return toArray(r.allow).includes("/");
}

/** ルールが「サイト全体遮断」（disallow に "/" を含む）か。 */
function isDisallowAll(r: Rule): boolean {
  return toArray(r.disallow).includes("/");
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

/**
 * UAバケットの排他性・非公開パス保護ガード（コード変更0の回帰ガード）:
 *
 * robots.ts は 3つのハンド保守 UA リスト（AI_TRAINING_CRAWLERS＝遮断 /
 * AI_SEARCH_CITATION_BOTS＝許可 / SOCIAL_LINK_PREVIEW_BOTS＝許可）を、その後の
 * オーナー決裁（決裁A・AI学習UA拡張…）ごとに継ぎ足していく構造で、**同一UAが
 * 遮断リストと許可リストの両方に紛れ込む**と、そのUAに対して allow:/ と disallow:/ の
 * 2ルールが同時生成され「遮断のはずが許可に無言反転」または「AI検索引用系（発見性）を
 * 誤って遮断」する事故を招く。既存テストは個別UAの意図だけを固定し、この**バケット間の
 * 二重定義（排他性違反）は未ガード**だった。加えて、許可リストへボットを足す際に
 * 非公開パス（COMMON_DISALLOW）の付与を忘れると /admin・/api 等が当該ボットへ露出する。
 * いずれも robots() 出力から機械検知する（現状は全緑＝純ガード・水増し無し）。
 */
describe("robots.txt（UAバケット排他性・非公開パス保護ガード）", () => {
  it("同一UAが複数ルールに跨らない＝遮断と許可の二重定義（意図の無言反転）を防ぐ", () => {
    const uas = allRules().flatMap((r) => toArray(r.userAgent));
    // 走査サニティ: UA:* ＋ 許可/遮断ボット群で十分な母数がある
    expect(uas.length, "robots ルールのUA総数が十分").toBeGreaterThan(20);
    const seen = new Map<string, number>();
    for (const ua of uas) seen.set(ua, (seen.get(ua) ?? 0) + 1);
    const duplicates = [...seen.entries()].filter(([, n]) => n > 1).map(([ua]) => ua);
    // 重複UAは「同一UAが2バケットに存在」または「同一リスト内の重複」を意味する
    expect(duplicates, `重複UA（バケット二重定義）: ${duplicates.join(", ")}`).toEqual([]);
  });

  it("遮断UA（disallow:/）は Allow:/ を同時に持たない＝許可への無言反転を防ぐ", () => {
    for (const r of allRules().filter(isDisallowAll)) {
      const ua = toArray(r.userAgent).join(",");
      expect(isAllowAll(r), `${ua} は遮断ルールなのに Allow:/ を持つ`).toBe(false);
    }
  });

  it("許可扱いの全ボット（allow:/）は非公開パス /admin・/api・/auth を必ず除外し続ける", () => {
    const allowRules = allRules().filter(isAllowAll);
    // 走査サニティ: 少なくとも UA:* ＋ 検索/SNS 許可ボットが存在
    expect(allowRules.length, "許可ルールが複数存在").toBeGreaterThan(3);
    for (const r of allowRules) {
      const ua = toArray(r.userAgent).join(",");
      const disallow = toArray(r.disallow);
      for (const priv of ["/admin/", "/api/", "/auth/"]) {
        expect(disallow, `${ua} は非公開パス ${priv} を除外し続ける`).toContain(priv);
      }
    }
  });

  it("遮断リストは十分な母数を持つ（ガードが空振りでない走査サニティ）", () => {
    const blocked = allRules().filter(isDisallowAll);
    expect(blocked.length, "AI学習クローラ等の遮断ルールが多数存在").toBeGreaterThan(10);
  });
});

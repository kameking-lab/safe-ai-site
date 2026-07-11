import { describe, expect, it } from "vitest";
import {
  formatAnswerForDisplay,
  normalizeAnswerMarkdown,
  stripAnswerTailBlocks,
} from "./chatbot-answer-format";

/**
 * 「ごちゃごちゃブロック」根絶の回帰テスト（2026-07-11）。
 * PROD_SHAPED_ANSWER は 2026-07-11 の本番実応答
 * （「足場からの墜落を防ぐために必要な措置は？」）の構造を再現したもの。
 */
const PROD_SHAPED_ANSWER = [
  "足場からの墜落を防ぐためには、高さ2メートル以上の作業場所には作業床を設ける必要があります（労働安全衛生規則第563条（所管：厚生労働省））。",
  "",
  "根拠となる条文は以下のとおりです。",
  "",
  "*   **労働安全衛生規則（安衛則）第563条（所管：厚生労働省）**",
  "    事業者は、足場における高さ2メートル以上の作業場所には作業床を設けなければなりません。",
  "    *   わく組足場の場合：交さ筋かい及び高さ15センチメートル以上の幅木等",
  "",
  "---",
  "⚠️ 本回答はAIによる情報提供であり、法的助言・法令解釈の確定ではありません。具体的な法的判断・実務対応は、労働安全コンサルタント・弁護士等の専門家にご相談ください。",
  "",
  "📎 出典（条文番号＋施行日＋発出機関）：",
  "- 安衛則第565条（発出：厚生労働省・昭和47年9月30日施行）",
  "- 安衛則第563条（発出：厚生労働省・平成27年7月1日施行）",
  "",
  "【関連通達・告示】",
  "- 基安発0314第2号・令和5年3月14日・足場からの墜落・転落災害防止総合対策推進要綱の改正について（通達（行政解釈・間接拘束））",
  "  原文: https://www.jaish.gr.jp/anzen/hor/hombun/hor1-64/hor1-64-8-1-0.htm",
  "",
  "【関連リーフレット・教材】",
  "- 足場からの墜落防止対策（令和5年）・厚生労働省・一般",
  "  原文: https://www.mhlw.go.jp/content/example.pdf",
  "",
  "【合わせて確認すべき法令】",
  "- 安衛法（労働安全衛生法）: 事業者の基本的な措置義務",
].join("\n");

describe("stripAnswerTailBlocks（テンプレ漏れ回帰）", () => {
  it("本番実応答形の追記テール（📎出典・通達・リーフレット・関連法令）をすべて除去する", () => {
    const stripped = stripAnswerTailBlocks(PROD_SHAPED_ANSWER);
    expect(stripped).not.toContain("📎 出典");
    expect(stripped).not.toContain("【関連通達・告示】");
    expect(stripped).not.toContain("【関連リーフレット・教材】");
    expect(stripped).not.toContain("【合わせて確認すべき法令】");
    expect(stripped).not.toContain("https://");
  });

  it("免責パラグラフ（---＋⚠️ 本回答はAI…）を除去する（常設バナーと二重のため）", () => {
    const stripped = stripAnswerTailBlocks(PROD_SHAPED_ANSWER);
    expect(stripped).not.toContain("本回答はAIによる情報提供");
    expect(stripped).not.toContain("---");
  });

  it("本文（結論・根拠条文の説明）は一字も変えずに残す", () => {
    const stripped = stripAnswerTailBlocks(PROD_SHAPED_ANSWER);
    expect(stripped).toContain(
      "足場からの墜落を防ぐためには、高さ2メートル以上の作業場所には作業床を設ける必要があります（労働安全衛生規則第563条（所管：厚生労働省））。"
    );
    expect(stripped).toContain("わく組足場の場合：交さ筋かい及び高さ15センチメートル以上の幅木等");
  });

  it("⚠️ 注記（範囲外警告）・引用条文の検証結果パラグラフを除去する（scopeWarningsで別枠表示）", () => {
    const answer =
      "結論です（安衛則第563条）。\n\n⚠️ 注記：回答中の「○○法」は本ツールの提供データ範囲外の参照のため、e-Gov法令検索で必ずご確認ください。\n\n⚠️ 引用条文の検証結果：\n- 構造化条文DBに存在しない引用（1件）: ○○法第1条。";
    const stripped = stripAnswerTailBlocks(answer);
    expect(stripped).toBe("結論です（安衛則第563条）。");
  });

  it("🏛 所管省庁資料 行以降も除去する", () => {
    const answer = "結論です。\n\n🏛 所管省庁資料: 国土交通省（港湾局）";
    expect(stripAnswerTailBlocks(answer)).toBe("結論です。");
  });

  it("テールが無い回答（no-hitテンプレ等）はそのまま返す", () => {
    const answer =
      "ご質問の「○○」を直接規定する条文は、本ツールの収録データからは特定できませんでした。\n\n✅ 公式情報で必ずご確認ください：\n- e-Gov 法令検索（条文の最新・正確な原文）: https://laws.e-gov.go.jp/";
    expect(stripAnswerTailBlocks(answer)).toBe(answer);
  });

  it("空文字はそのまま", () => {
    expect(stripAnswerTailBlocks("")).toBe("");
  });
});

describe("normalizeAnswerMarkdown", () => {
  it("markdown箇条書き（* / - / +）を「・」に正規化する（入れ子は全角字下げ）", () => {
    const text = "*   **安衛則第563条**\n    説明文\n    *   入れ子項目\n- ハイフン項目\n+ プラス項目";
    const normalized = normalizeAnswerMarkdown(text);
    expect(normalized).toContain("・**安衛則第563条**");
    expect(normalized).toContain("　・入れ子項目");
    expect(normalized).toContain("・ハイフン項目");
    expect(normalized).toContain("・プラス項目");
    expect(normalized).not.toMatch(/^\s*[*+-]\s+/m);
  });

  it("水平線（---）を除去し、#見出しを太字マーカーに変換する", () => {
    const text = "## 根拠条文\n---\n本文";
    const normalized = normalizeAnswerMarkdown(text);
    expect(normalized).toBe("**根拠条文**\n本文");
  });

  it("行頭の**太字**を箇条書きと誤認しない", () => {
    const text = "**重要**: 作業床が必要です。";
    expect(normalizeAnswerMarkdown(text)).toBe(text);
  });

  it("番号付きリスト・「・」箇条書き・通常文は変更しない", () => {
    const text = "1. 第一項\n・既存の中黒\n通常の文章です。";
    expect(normalizeAnswerMarkdown(text)).toBe(text);
  });

  it("3連以上の空行を2つに圧縮する", () => {
    expect(normalizeAnswerMarkdown("A\n\n\n\nB")).toBe("A\n\nB");
  });
});

describe("formatAnswerForDisplay（strip＋normalize 統合）", () => {
  it("本番実応答形が「結論＋読める根拠」だけになり、markdown記号もテールも残らない", () => {
    const display = formatAnswerForDisplay(PROD_SHAPED_ANSWER);
    expect(display).toContain("足場からの墜落を防ぐためには");
    expect(display).toContain("・**労働安全衛生規則（安衛則）第563条（所管：厚生労働省）**");
    expect(display).not.toContain("📎");
    expect(display).not.toContain("【関連通達・告示】");
    expect(display).not.toMatch(/^\s*[*+-]\s+/m);
    expect(display).not.toContain("---");
  });
});

import { describe, expect, it } from "vitest";
import {
  answerCardTone,
  evidenceBadge,
  splitAnswerConclusion,
} from "./chatbot-answer-visual";

describe("splitAnswerConclusion: 結論の verbatim 切り出し（捏造0の根幹）", () => {
  it("1文の回答は全文が結論・restなし", () => {
    const a = "高さ85cm以上の手すりが必要です（安衛則第552条）。";
    expect(splitAnswerConclusion(a)).toEqual({ conclusion: a, rest: "" });
  });

  it("プロンプト例と同型の2文結論（短い2文）は両方含める", () => {
    const s1 = "1t以上のフォークリフトの運転には技能講習の修了が必要です。";
    const s2 = "1t未満は特別教育で足ります。";
    const rest = "詳しい説明の段落。";
    const out = splitAnswerConclusion(`${s1}${s2}\n\n${rest}`);
    expect(out.conclusion).toBe(`${s1}${s2}`);
    expect(out.rest).toBe(rest);
  });

  it("2文目で120字を超える場合は1文目のみ", () => {
    const s1 = "結論はこの1文目です。";
    const s2 = `条文の細かい話が長く続く2文目${"あ".repeat(120)}です。`;
    const out = splitAnswerConclusion(`${s1}${s2}`);
    expect(out.conclusion).toBe(s1);
    expect(out.rest).toBe(s2);
  });

  it("結論は3文目以降を絶対に含めない（最大2文）", () => {
    const out = splitAnswerConclusion("一。二。三。");
    expect(out.conclusion).toBe("一。二。");
    expect(out.rest).toBe("三。");
  });

  it("conclusion + rest = 元の全文（情報の消失ゼロ・正確性不可侵）", () => {
    const samples = [
      "結論です（安衛法第61条）。**理由**は次のとおり。\n\n- 項目1\n- 項目2",
      "「。」を含まない短い断片",
      "- 箇条書きで始まる回答\n本文が続く。",
      "ご質問の「玉掛け」を直接規定する条文は、本ツールの収録データからは特定できませんでした。\n\n参考として以下をご確認ください。",
    ];
    for (const s of samples) {
      const { conclusion, rest } = splitAnswerConclusion(s);
      // trim による空白差を除き、文字列の中身が完全に保たれている
      const joined = (conclusion + rest).replace(/\s+/g, "");
      expect(joined).toBe(s.trim().replace(/\s+/g, ""));
    }
  });

  it("箇条書き始まりの回答は最初の行のみを結論にする", () => {
    const out = splitAnswerConclusion("- まず換気。次に測定。\n続きの本文。");
    expect(out.conclusion).toBe("- まず換気。次に測定。");
    expect(out.rest).toBe("続きの本文。");
  });

  it("「。」が無い回答は最初の行を結論にする", () => {
    const out = splitAnswerConclusion("APIキー未設定のため利用できません\n\n設定方法は…");
    expect(out.conclusion).toBe("APIキー未設定のため利用できません");
    expect(out.rest).toBe("設定方法は…");
  });

  it("第2段落の文は結論に取り込まない（第1段落限定）", () => {
    const out = splitAnswerConclusion("短い結論\n\n2段落目の文です。");
    expect(out.conclusion).toBe("短い結論");
    expect(out.rest).toBe("2段落目の文です。");
  });

  it("空文字は空の分割", () => {
    expect(splitAnswerConclusion("  ")).toEqual({ conclusion: "", rest: "" });
  });
});

describe("answerCardTone: 色は根拠の確かさで塗る（回答内容の安全/危険ではない）", () => {
  it("範囲外参照の検出は最優先で赤", () => {
    expect(
      answerCardTone({ sourceType: "rag", confidence: "high", scopeWarningCount: 1 }),
    ).toBe("danger");
  });

  it("AI推論は黄（専門家確認が必要=ユーザーが対応すべき時だけ黄を使う）", () => {
    expect(answerCardTone({ sourceType: "ai_inference", confidence: "medium" })).toBe(
      "warning",
    );
  });

  it("法令DB根拠は青=指示・案内（緑にしない: 義務の回答が緑だと「OK」に誤読される）", () => {
    expect(answerCardTone({ sourceType: "rag", confidence: "high" })).toBe("info");
    expect(answerCardTone({ sourceType: "rag", confidence: "medium" })).toBe("info");
  });

  it("メタ未取得（生成停止・旧履歴）は青に倒す（不確かさで赤黄を乱発しない）", () => {
    expect(answerCardTone({})).toBe("info");
  });
});

describe("evidenceBadge: 根拠チップ", () => {
  it("rag は緑の「法令DB根拠」", () => {
    expect(evidenceBadge({ sourceType: "rag", confidence: "high" })).toEqual({
      tone: "safe",
      label: "法令DB根拠",
    });
  });

  it("ai_inference は黄の「AI推論・要確認」", () => {
    expect(evidenceBadge({ sourceType: "ai_inference", confidence: "medium" })).toEqual({
      tone: "warning",
      label: "AI推論・要確認",
    });
  });

  it("ai_inference かつ low は「条文特定できず」（既存🔴バッジと同じ判定）", () => {
    expect(evidenceBadge({ sourceType: "ai_inference", confidence: "low" })).toEqual({
      tone: "warning",
      label: "条文特定できず",
    });
  });

  it("source_type 未確定は null（チップを出さない）", () => {
    expect(evidenceBadge({})).toBeNull();
  });
});

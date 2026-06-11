import { describe, expect, it } from "vitest";
import {
  assessReadiness,
  readinessGuidance,
  READINESS_QUESTIONS,
} from "@/lib/mental-health-flow";
import { readinessConclusion } from "./readiness-visual";

function answersWithYes(yesCount: number): Record<string, boolean> {
  const answers: Record<string, boolean> = {};
  READINESS_QUESTIONS.forEach((q, i) => {
    answers[q.id] = i < yesCount;
  });
  return answers;
}

const TOTAL = READINESS_QUESTIONS.length;

describe("readinessConclusion（色文法の固定）", () => {
  it("未回答 → 青「自己評価 未回答」のこり7問（未回答を赤黄で責めない）", () => {
    const a = assessReadiness({ headcount: 50, answers: {} });
    const c = readinessConclusion(a, 0);
    expect(c.tone).toBe("info");
    expect(c.value).toBe(TOTAL);
    expect(c.unit).toBe("問");
    expect(c.title).toBe("自己評価 未回答");
    expect(c.settled).toBe(false);
  });

  it("回答途中 → 青「回答のこり」（途中経過で early 判定の赤を出さない）", () => {
    // 3問だけ回答（すべて未整備）= ratioは early 相当だが回答途中
    const answers: Record<string, boolean> = {};
    READINESS_QUESTIONS.slice(0, 3).forEach((q) => {
      answers[q.id] = false;
    });
    const a = assessReadiness({ headcount: 100, answers });
    const c = readinessConclusion(a, 3);
    expect(c.tone).toBe("info");
    expect(c.value).toBe(TOTAL - 3);
    expect(c.title).toBe("回答のこり");
    expect(c.settled).toBe(false);
  });

  it("全問回答・ready → 緑「実施可能」・整備率%がデカ数字", () => {
    const a = assessReadiness({ headcount: 50, answers: answersWithYes(TOTAL) });
    const c = readinessConclusion(a, TOTAL);
    expect(a.verdict).toBe("ready");
    expect(c.tone).toBe("safe");
    expect(c.value).toBe(100);
    expect(c.unit).toBe("%");
    expect(c.title).toBe("実施可能");
    expect(c.settled).toBe(true);
  });

  it("全問回答・partial → 黄「一部整備中」", () => {
    const a = assessReadiness({ headcount: 50, answers: answersWithYes(4) });
    const c = readinessConclusion(a, TOTAL);
    expect(a.verdict).toBe("partial");
    expect(c.tone).toBe("warning");
    expect(c.title).toBe("一部整備中");
  });

  it("全問回答・early・義務事業場(50人以上) → 赤「未整備」（実施義務未達＝停止級）", () => {
    const a = assessReadiness({ headcount: 80, answers: answersWithYes(2) });
    const c = readinessConclusion(a, TOTAL);
    expect(a.verdict).toBe("early");
    expect(a.obligationTier).toBe("mandatory");
    expect(c.tone).toBe("danger");
    expect(c.title).toBe("未整備");
  });

  it("全問回答・early・努力義務(50人未満) → 黄（法令義務ではないため赤にしない）", () => {
    const a = assessReadiness({ headcount: 20, answers: answersWithYes(2) });
    const c = readinessConclusion(a, TOTAL);
    expect(a.verdict).toBe("early");
    expect(a.obligationTier).toBe("effort-duty");
    expect(c.tone).toBe("warning");
    expect(c.title).toBe("準備が必要");
  });

  it("補足文は readinessGuidance の文言そのまま（言い換えゼロ）", () => {
    const a = assessReadiness({ headcount: 80, answers: answersWithYes(4) });
    const c = readinessConclusion(a, TOTAL);
    expect(c.description).toBe(readinessGuidance(a.verdict, a.obligationTier));
  });
});

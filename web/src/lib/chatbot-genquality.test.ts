/**
 * 生成品質evalのCIゲート（APIキー不要層・診断04 T7）。
 *
 * Gemini実応答の採点は chatbot-genquality-live.test.ts（環境変数ゲート・手動/nightly）
 * が担う。本テストは決定的に検証できる層だけを常設回帰にする:
 *
 * A. fixture整合性 — goldがe-Gov正本アンカーを持つこと（gold汚染・循環の防止）
 * B. コーパス正本突合 — 結論の根拠事実がコーパス条文に残っていること
 *    （例: 派遣法45条から「派遣元」が消える編集 → 診断04 Q20の誤答が再発 → CIで検出）
 * C. RAG到達性 — 23問すべてでgold条文がLayer1ホワイトリストに入ること
 *    （例: 「頻度」の同義語が消えて安衛則44条が引けなくなる → Q6型の実質未回答が再発）
 * D. テンプレ層回帰 — 範囲外質問のno-hit化・direct tier・偽の範囲外警告・
 *    プレースホルダ除去（診断04 T1/T3/T8/T9の是正が巻き戻らないこと）
 *
 * 「品質を下げる変更でCIが落ちる」の実証はB（コーパス1箇所の改変で検出）と
 * chatbot-genquality-scorer.test.ts（誤答テキスト1件で検出）で担保する。
 */

import { describe, it, expect } from "vitest";
import { allLawArticles } from "@/data/laws";
import { searchRelevantArticlesWithScore } from "@/lib/rag-search";
import { buildAllowedCitations } from "@/lib/chatbot-prompt-builder";
import { buildFallbackDecision } from "@/lib/chatbot-fallback-logic";
import {
  detectOutOfScopeLawReferences,
  sanitizePlaceholderCitations,
} from "@/lib/chatbot-enrichment";
import { isLawShortEquivalent } from "@/lib/rag/synonyms";
import {
  GEN_QUALITY_CASES,
  scorableCases,
  type CorpusEvidence,
} from "@/lib/chatbot-genquality.fixture";

const TOP_K = 10; // route.ts の searchRelevantArticlesWithScore(message, 10) と同一
const ROUTE_CONFIDENCE_THRESHOLD = 0.5; // route.ts の CONFIDENCE_THRESHOLD と同一

function findCorpusArticles(ev: Pick<CorpusEvidence, "lawShort" | "articleNum">) {
  return allLawArticles.filter(
    (a) =>
      a.articleNum === ev.articleNum &&
      (a.lawShort === ev.lawShort || isLawShortEquivalent(a.lawShort, ev.lawShort))
  );
}

/**
 * 既知の到達性ギャップ台帳（2026-07-11拡張で新設）。
 * ここに載る質問は「実機では△/×になる既知欠陥」＝検出網としてfixtureに残し、
 * retrieval層の是正はレーン（ux-tools）へ差し戻す。是正されて到達可能になると
 * 下のratchetテストが落ち、fixtureのexpectRetrievableとこの台帳の更新を強制する。
 *
 * 2026-07-11 現場口語プロジェクト: GQ48（クビ→解雇予告）・GQ49（マンホール→
 * 酸欠資格）は query-expansion の口語正規化＋PIN照合の展開後クエリ化で到達可能に
 * なり台帳から除去（是正の実測は docs/field-vernacular-bench-2026-07-11.md）。
 */
const KNOWN_RETRIEVAL_GAP_IDS = [] as const;

/**
 * 既知の範囲外判定リーク台帳: 範囲外質問なのにRAGスコアが閾値を超えて
 * 範囲内扱いになる既知欠陥。リークが解消（score < 0.5）するとratchetが落ち、
 * 台帳から除去を強制する。
 *
 * 2026-07-11: GQ51（車検）は rag/out-of-domain.ts のドメイン外語減点で
 * no-hit経路に落ちるようになり台帳から除去（テストDの範囲外検証が全問カバー）。
 */
const KNOWN_SCOPE_LEAK_IDS = [] as const;

describe("生成品質eval A: fixture整合性（正本アンカー）", () => {
  it("51問・ID重複なし（診断04の23問＋2026-07-11拡張の28問）", () => {
    expect(GEN_QUALITY_CASES.length).toBe(51);
    const ids = new Set(GEN_QUALITY_CASES.map((c) => c.id));
    expect(ids.size).toBe(51);
  });

  it("採点対象の全ケースがgold条文とコーパス突合エビデンスを持つ", () => {
    for (const tc of scorableCases()) {
      expect(tc.goldCitations.length, `${tc.id} goldCitations`).toBeGreaterThan(0);
      expect(tc.mustInclude.length, `${tc.id} mustInclude`).toBeGreaterThan(0);
      expect(tc.corpusEvidence?.length ?? 0, `${tc.id} corpusEvidence`).toBeGreaterThan(0);
    }
  });

  it("全エビデンスがe-Gov正本アンカー（法令番号 or 改正省令）を明記している", () => {
    // goldの出所がコーパス自身にならない（循環しない）ための構造的ガード。
    // アンカーは法令番号（昭和/平成/令和＋法律/政令/省令）で正本を一意に指す。
    for (const tc of scorableCases()) {
      for (const ev of tc.corpusEvidence ?? []) {
        expect(
          /(昭和|平成|令和).+(法律|政令|省令|告示)|安衛法第|安衛令第|附則/.test(ev.anchor),
          `${tc.id} ${ev.lawShort}${ev.articleNum} のanchorに正本の特定情報がない: ${ev.anchor}`
        ).toBe(true);
        expect(ev.mustContain.length, `${tc.id} mustContain`).toBeGreaterThan(0);
      }
    }
  });

  it("範囲外ケースはgold条文を持たない", () => {
    for (const tc of GEN_QUALITY_CASES.filter((c) => c.expectOutOfScope)) {
      expect(tc.goldCitations.length, tc.id).toBe(0);
      expect(tc.expectRetrievable, tc.id).toBe(false);
    }
  });
});

describe("生成品質eval B: コーパス正本突合（結論の根拠事実が消えたらCIが落ちる）", () => {
  it("全エビデンス条文がコーパスに実在し、結論の根拠事実を含む", () => {
    const problems: string[] = [];
    for (const tc of GEN_QUALITY_CASES) {
      for (const ev of tc.corpusEvidence ?? []) {
        const candidates = findCorpusArticles(ev);
        if (candidates.length === 0) {
          problems.push(`${tc.id}: ${ev.lawShort}${ev.articleNum} がコーパスに存在しない`);
          continue;
        }
        // 同一条番号の複数エントリ（本則/足場等の分冊）を許容: いずれか1件が全事実を含めばよい
        const ok = candidates.some((a) => {
          const haystack =
            a.text +
            a.articleTitle +
            Object.values(a.itemNumberMap ?? {}).join("");
          return ev.mustContain.every((s) => haystack.includes(s));
        });
        if (!ok) {
          const missing = ev.mustContain.filter(
            (s) => !candidates.some((a) => (a.text + a.articleTitle).includes(s))
          );
          problems.push(
            `${tc.id}: ${ev.lawShort}${ev.articleNum} から根拠事実が欠落 [${missing.join("・")}]` +
              `（正本: ${ev.anchor}）`
          );
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});

describe("生成品質eval C: RAG到達性（gold条文がLayer1ホワイトリストに入る）", () => {
  it(
    "採点対象の全問でgold条文のいずれかがtop10ホワイトリストに入り、no-hit落ちしない",
    { timeout: 30000 },
    () => {
      const problems: string[] = [];
      for (const tc of GEN_QUALITY_CASES.filter((c) => c.expectRetrievable)) {
        const { articles, normalizedScore } = searchRelevantArticlesWithScore(
          tc.question,
          TOP_K
        );
        if (normalizedScore < ROUTE_CONFIDENCE_THRESHOLD) {
          problems.push(
            `${tc.id}: score=${normalizedScore.toFixed(2)} < ${ROUTE_CONFIDENCE_THRESHOLD} でno-hit扱いになる（${tc.question}）`
          );
          continue;
        }
        const allowed = buildAllowedCitations(articles);
        const hit = tc.goldCitations.some((g) =>
          allowed.some(
            (a) =>
              a.articleNum === g.articleNum &&
              (a.lawShort === g.lawShort || isLawShortEquivalent(a.lawShort, g.lawShort))
          )
        );
        if (!hit) {
          problems.push(
            `${tc.id}: gold ${tc.goldCitations
              .map((g) => `${g.lawShort}${g.articleNum}`)
              .join("/")} がホワイトリスト外 ` +
              `(top: ${allowed.slice(0, 5).map((a) => `${a.lawShort}${a.articleNum}`).join(", ")})`
          );
        }
      }
      expect(problems, "\n" + problems.join("\n")).toEqual([]);
    }
  );

  it("既知の到達性ギャップは台帳（KNOWN_RETRIEVAL_GAP_IDS）と一致し、実際にまだギャップである", () => {
    // ratchet: ギャップ台帳を実測と同期させる。レーンがsynonyms/PINを改善して
    // 到達可能になったのにフラグが放置される「偽のギャップ記録」を防ぐ。
    const knownGaps = GEN_QUALITY_CASES.filter(
      (c) => !c.expectOutOfScope && !c.expectRetrievable
    );
    expect(knownGaps.map((c) => c.id)).toEqual([...KNOWN_RETRIEVAL_GAP_IDS]);
    for (const tc of knownGaps) {
      const { articles, normalizedScore } = searchRelevantArticlesWithScore(
        tc.question,
        TOP_K
      );
      const allowed = buildAllowedCitations(articles);
      const stillGap =
        normalizedScore < ROUTE_CONFIDENCE_THRESHOLD ||
        !tc.goldCitations.some((g) =>
          allowed.some(
            (a) =>
              a.articleNum === g.articleNum &&
              (a.lawShort === g.lawShort || isLawShortEquivalent(a.lawShort, g.lawShort))
          )
        );
      expect(
        stillGap,
        `${tc.id} は到達可能になっている。fixtureの expectRetrievable を true にして台帳を更新すること`
      ).toBe(true);
    }
  });
});

describe("生成品質eval D: テンプレ層回帰（診断04 T1/T3/T8/T9）", () => {
  it("範囲外質問（既知リークを除く）はno-hit経路に落ちる", () => {
    for (const tc of GEN_QUALITY_CASES.filter(
      (c) => c.expectOutOfScope && !(KNOWN_SCOPE_LEAK_IDS as readonly string[]).includes(c.id)
    )) {
      const { normalizedScore } = searchRelevantArticlesWithScore(tc.question, TOP_K);
      expect(
        normalizedScore,
        `${tc.id}「${tc.question}」が範囲内扱い（score=${normalizedScore}）`
      ).toBeLessThan(ROUTE_CONFIDENCE_THRESHOLD);
    }
  });

  it("既知の範囲外判定リーク台帳はまだリークしている＝解消したら台帳から除去する", () => {
    // ratchet: retrieval層が是正されたのに台帳が放置される「偽の欠陥記録」を防ぐ
    for (const id of KNOWN_SCOPE_LEAK_IDS) {
      const tc = GEN_QUALITY_CASES.find((c) => c.id === id)!;
      expect(tc.expectOutOfScope, `${id} は範囲外ケースであるべき`).toBe(true);
      const { normalizedScore } = searchRelevantArticlesWithScore(tc.question, TOP_K);
      expect(
        normalizedScore,
        `${id} のリークは解消済み。KNOWN_SCOPE_LEAK_IDSから除去すること`
      ).toBeGreaterThanOrEqual(ROUTE_CONFIDENCE_THRESHOLD);
    }
  });

  it("PIN確定トピック（フォークリフト・職長）はdirect tier（adjacent誤ヘッダの回帰・T8）", () => {
    for (const tc of GEN_QUALITY_CASES.filter((c) => c.expectDirectTier)) {
      const { articles, normalizedScore, hadPins } = searchRelevantArticlesWithScore(
        tc.question,
        TOP_K
      );
      const decision = buildFallbackDecision({
        query: tc.question,
        normalizedScore,
        articles,
        hadPins,
      });
      expect(decision.tier, `${tc.id}「${tc.question}」score=${normalizedScore}`).toBe("direct");
    }
  });

  it("gold条文の正式名・略称引用に偽の範囲外警告が出ない（T1: 25%偽陽性の回帰）", () => {
    // 診断04 §3(v): 「労働安全衛生規則第12条の5により…」のような正答引用に
    // 「提供データ範囲外」警告が付き信頼度を不当降格していたバグの常設回帰。
    const problems: string[] = [];
    for (const tc of scorableCases()) {
      for (const g of tc.goldCitations) {
        const corpusArticle = allLawArticles.find(
          (a) =>
            a.articleNum === g.articleNum &&
            (a.lawShort === g.lawShort || isLawShortEquivalent(a.lawShort, g.lawShort))
        );
        if (!corpusArticle) continue; // 実在チェックはBが担当
        const synth =
          `${corpusArticle.law}${g.articleNum}および${corpusArticle.lawShort}${g.articleNum}に基づき、` +
          `事業者は必要な措置を講じなければなりません。`;
        // route.ts と同じ渡し方（短縮名＋正式名称）で検証する
        const flagged = detectOutOfScopeLawReferences(synth, [
          corpusArticle.lawShort,
          corpusArticle.law,
        ]);
        if (flagged.length > 0) {
          problems.push(`${tc.id}: ${flagged.join("、")} が偽の範囲外扱い（${corpusArticle.law}）`);
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("長音入り法令名（クレーン等安全規則）が分断されない（T1回帰の代表例）", () => {
    const flagged = detectOutOfScopeLawReferences(
      "クレーン等安全規則第21条により特別の教育が必要です。",
      ["クレーン則"]
    );
    expect(flagged).toEqual([]);
  });

  it("プレースホルダsanitizerがYYYY/第XX条を除去する（T3回帰）", () => {
    const dirty =
      "安衛則第518条（施行：YYYY年MM月、所管：厚生労働省）により、第XX条とあわせて確認してください。";
    const clean = sanitizePlaceholderCitations(dirty);
    expect(clean).not.toMatch(/YYYY|第XX条/);
    // 実データ（条番号・所管）は温存される
    expect(clean).toContain("第518条");
    expect(clean).toContain("厚生労働省");
  });
});

import { describe, it, expect } from "vitest";
import { LAW_NAVI_TOPICS, topicsForArticle, findLawNaviTopic } from "./topics";
import { BEPPYO_ENTRIES, findBeppyo } from "./beppyo";
import { allLawArticles, mhlwLawArticles } from "@/data/laws";
import { mhlwNotices } from "@/data/mhlw-notices";
import { findEntryByShort } from "@/lib/law-navi/permalink";

// 分野インデックス・別表インデックスの正本突合（docs/horei-navi-foundation-2026-07-11 §2-2/2-5）。
// 参照が curated コーパス・通達DBに実在しなければ CI が落ちる＝幽霊参照 0
// （O18 リンカ・article-registry のピン整合と同じ思想）。
const mhlwSet = new Set<unknown>(mhlwLawArticles);
const curated = allLawArticles.filter((a) => !mhlwSet.has(a));
const curatedKeys = new Set(curated.map((a) => `${a.lawShort}|${a.articleNum}`));
const noticeIds = new Set(mhlwNotices.map((n) => n.id));
const topicIds = new Set(LAW_NAVI_TOPICS.map((t) => t.id));
const beppyoIds = new Set(BEPPYO_ENTRIES.map((b) => b.id));

describe("LAW_NAVI_TOPICS — 分野インデックスの整合", () => {
  it("トピックidは一意", () => {
    expect(topicIds.size).toBe(LAW_NAVI_TOPICS.length);
  });

  it("articles の全参照が curated コーパスに実在する（幽霊参照 0）", () => {
    for (const t of LAW_NAVI_TOPICS) {
      for (const ref of t.articles) {
        expect(
          curatedKeys.has(`${ref.lawShort}|${ref.articleNum}`),
          `${t.id}: ${ref.lawShort} ${ref.articleNum} がコーパスに無い`
        ).toBe(true);
      }
    }
  });

  it("articles の全参照が条文パーマリンク生成集合にも解決できる（分野→原文ページの導線保証）", () => {
    for (const t of LAW_NAVI_TOPICS) {
      for (const ref of t.articles) {
        expect(
          findEntryByShort(ref.lawShort, ref.articleNum),
          `${t.id}: ${ref.lawShort} ${ref.articleNum} のパーマリンクが無い`
        ).toBeDefined();
      }
    }
  });

  it("circularIds の全参照が mhlwNotices に実在する", () => {
    for (const t of LAW_NAVI_TOPICS) {
      for (const id of t.circularIds) {
        expect(noticeIds.has(id), `${t.id}: 通達 ${id} が mhlwNotices に無い`).toBe(true);
      }
    }
  });

  it("beppyoIds の全参照が別表インデックスに実在する", () => {
    for (const t of LAW_NAVI_TOPICS) {
      for (const id of t.beppyoIds) {
        expect(beppyoIds.has(id), `${t.id}: 別表 ${id} が beppyo.ts に無い`).toBe(true);
      }
    }
  });

  it("各トピックは説明・レビュー記録・現場語alias（代表名以外に1つ以上）を持つ（二層生成の担保）", () => {
    for (const t of LAW_NAVI_TOPICS) {
      expect(t.description.length, `${t.id}: description が短すぎる`).toBeGreaterThan(20);
      expect(t.reviewNote, `${t.id}: reviewNote（人手レビュー記録）が無い`).toMatch(/topic-scan/);
      expect(
        t.aliases.filter((a) => a !== t.name).length,
        `${t.id}: 俗称aliasが無い`
      ).toBeGreaterThan(0);
    }
  });

  it("第2陣13分野（2026-07-11 全域展開）が揃い、中核条文・俗称aliasを持つ", () => {
    const SECOND_WAVE = [
      "crane",
      "tamagake",
      "ashiba",
      "fall-arrest",
      "sanketsu",
      "yuki-solvent",
      "tokka",
      "funjin",
      "asbestos",
      "heatstroke",
      "denki",
      "kensetsu-kikai",
      "kosho-sagyosha",
    ];
    for (const id of SECOND_WAVE) {
      expect(findLawNaviTopic(id), `${id} が無い`).toBeDefined();
    }
    // 中核データのスポット固定（e-Gov 現行の制度と一致する参照）
    const crane = findLawNaviTopic("crane")!;
    expect(crane.articles.some((a) => a.lawShort === "クレーン則" && a.articleNum === "第22条")).toBe(true); // 免許
    const tamagake = findLawNaviTopic("tamagake")!;
    expect(tamagake.aliases).toContain("スリング");
    expect(tamagake.articles.some((a) => a.articleNum === "第221条")).toBe(true); // 技能講習
    const sanketsu = findLawNaviTopic("sanketsu")!;
    expect(sanketsu.aliases).toContain("酸欠");
    expect(sanketsu.articles.some((a) => a.lawShort === "酸欠則" && a.articleNum === "第11条")).toBe(true); // 作業主任者
    const asbestos = findLawNaviTopic("asbestos")!;
    expect(asbestos.articles.some((a) => a.lawShort === "石綿則" && a.articleNum === "第3条")).toBe(true); // 事前調査
    const heatstroke = findLawNaviTopic("heatstroke")!;
    expect(heatstroke.articles.some((a) => a.articleNum === "第612条の2")).toBe(true); // R7義務化
    const fallArrest = findLawNaviTopic("fall-arrest")!;
    expect(fallArrest.aliases).toContain("安全帯"); // 2019改称前の旧称
    expect(fallArrest.articles.some((a) => a.articleNum === "第520条")).toBe(true);
    // 足場は（足場等）グルーピング条文（563条＝手すり・中さん）を含む＝カバレッジ拡大の成果
    const ashiba = findLawNaviTopic("ashiba")!;
    expect(ashiba.articles.some((a) => a.articleNum === "第563条")).toBe(true);
  });

  it("フォークリフト分野: 4クエリ着地の中核データが揃っている", () => {
    const forklift = findLawNaviTopic("forklift")!;
    expect(forklift).toBeDefined();
    // 俗称「爪」系のaliasを持つ（「爪のやつ」の語幹。固定フレーズは持たない）
    expect(forklift.aliases).toContain("爪");
    expect(forklift.aliases).toContain("ツメ");
    expect(forklift.aliases.some((a) => a.includes("のやつ"))).toBe(false);
    // 法→令→則の3層が揃う
    const tiers = new Set(forklift.articles.map((a) => a.lawShort));
    expect(tiers).toContain("安衛法");
    expect(tiers).toContain("安衛令");
    expect(tiers).toContain("安衛則");
    // 定義条（151条の2）を含む
    expect(topicsForArticle("安衛則", "第151条の2").map((t) => t.id)).toContain("forklift");
  });
});

describe("BEPPYO_ENTRIES — 別表インデックスの整合", () => {
  it("別表idは一意・アンカー安全（英数ハイフンのみ）", () => {
    expect(beppyoIds.size).toBe(BEPPYO_ENTRIES.length);
    for (const b of BEPPYO_ENTRIES) {
      expect(b.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("relatedArticles の全参照が curated コーパスに実在し、パーマリンクにも解決できる", () => {
    for (const b of BEPPYO_ENTRIES) {
      for (const ra of b.relatedArticles) {
        expect(
          curatedKeys.has(`${ra.lawShort}|${ra.articleNum}`),
          `${b.id}: ${ra.lawShort} ${ra.articleNum} がコーパスに無い`
        ).toBe(true);
        expect(
          findEntryByShort(ra.lawShort, ra.articleNum),
          `${b.id}: ${ra.lawShort} ${ra.articleNum} のパーマリンクが無い`
        ).toBeDefined();
      }
    }
  });

  it("relatedTopicIds の全参照がトピックに実在する", () => {
    for (const b of BEPPYO_ENTRIES) {
      for (const id of b.relatedTopicIds) {
        expect(topicIds.has(id), `${b.id}: トピック ${id} が無い`).toBe(true);
      }
    }
  });

  it("主要別表の意味が引ける（別表第3=特定化学物質・別表第6の2=有機溶剤）", () => {
    expect(findBeppyo("anei-rei-beppyo-3")?.name).toBe("特定化学物質");
    expect(findBeppyo("anei-rei-beppyo-6-2")?.name).toBe("有機溶剤");
  });

  it("label は正規形（別表第N（のM）または番号なしの別表）＝クエリ正規化（別表第三→別表第3）と合流できる", () => {
    // じん肺則・クレーン則の別表は e-Gov 現行原文でも番号なしの「別表」1本のみ（2026-07-11 突合）
    for (const b of BEPPYO_ENTRIES) {
      expect(b.label).toMatch(/^別表(第[0-9]+(の[0-9]+)?)?$/);
    }
  });

  it("全展開（2026-07-11）: 安衛則・粉じん則・じん肺則・クレーン則・電離則の別表が引ける", () => {
    // LN-D2 の中核: 意味（何の表か）が e-Gov 現行原文の関係条と一致していること
    expect(findBeppyo("anei-soku-beppyo-2")?.name).toContain("裾切値"); // SDS/表示の裾切値（則30条・34条の2）
    expect(findBeppyo("anei-soku-beppyo-1")?.name).toContain("作業主任者");
    expect(findBeppyo("anei-soku-beppyo-3")?.name).toContain("就業制限");
    expect(findBeppyo("anei-soku-beppyo-7")?.name).toContain("計画の届出");
    expect(findBeppyo("funjin-soku-beppyo-1")?.name).toBe("粉じん作業");
    expect(findBeppyo("funjin-soku-beppyo-2")?.name).toBe("特定粉じん発生源");
    expect(findBeppyo("funjin-soku-beppyo-3")?.name).toContain("呼吸用保護具");
    expect(findBeppyo("jinpai-soku-beppyo")?.name).toContain("粉じん作業");
    expect(findBeppyo("crane-soku-beppyo")?.name).toContain("クレーン等の種類");
    expect(findBeppyo("denri-soku-beppyo-3")?.name).toContain("表面汚染");
    // 安衛則別表第8は現行 e-Gov で削除（欠番）＝幽霊の意味を与えない
    expect(findBeppyo("anei-soku-beppyo-8")?.name).toBe("（削除）");
  });
});

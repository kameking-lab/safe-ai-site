/**
 * 車両系荷役運搬機械等・車両系建設機械の条番号⇄内容の整合テスト。
 *
 * 背景: 2026-06-10 の再精査で、安衛則の車両系条文に系統的な条番号誤りを発見
 * （例: 「フォークリフトの定期自主検査」を第151条の67(実際は貨物自動車の昇降設備)に
 * 誤割当、車両系建設機械の第153〜165条が軒並み1条ずれ等）。本テストは権威ソース
 * （e-Gov・労働新聞社・陸災防の条文PDF）で検証した正しい対応を固定し、再発を防ぐ。
 */
import { describe, it, expect } from "vitest";
import { allLawArticles } from "@/data/laws";

const anei = allLawArticles.filter((a) => a.lawShort === "安衛則");

function titleOf(articleNum: string): string | undefined {
  return anei.find((a) => a.articleNum === articleNum)?.articleTitle;
}

describe("車両系条文の条番号⇄見出し整合", () => {
  // 車両系荷役運搬機械等（第151条の2〜第151条の15: 総則）
  it.each([
    ["第151条の2", "定義"],
    ["第151条の3", "作業計画"],
    ["第151条の4", "作業指揮者"],
    ["第151条の5", "制限速度"],
    ["第151条の6", "転落等の防止"],
    ["第151条の7", "接触の防止"],
    ["第151条の11", "運転位置から離れる場合の措置"],
    ["第151条の14", "主たる用途以外の使用の制限"],
    ["第151条の15", "修理等"],
  ])("安衛則%s の見出しに「%s」を含む", (num, title) => {
    expect(titleOf(num)).toContain(title);
  });

  // フォークリフト（第151条の16〜第151条の26）
  it.each([
    ["第151条の16", "前照灯"],
    ["第151条の20", "使用の制限"],
    ["第151条の21", "定期自主検査"],
  ])("安衛則%s（フォークリフト）の見出しに「%s」を含む", (num, title) => {
    expect(titleOf(num)).toContain(title);
  });

  // 貨物自動車（第151条の65〜第151条の76）
  it("安衛則第151条の67 は貨物自動車の昇降設備", () => {
    const a = anei.find((x) => x.articleNum === "第151条の67");
    expect(a?.articleTitle).toContain("昇降設備");
    expect(a?.text).toContain("貨物自動車");
  });
  it("安衛則第151条の74 は貨物自動車の保護帽着用", () => {
    const a = anei.find((x) => x.articleNum === "第151条の74");
    expect(a?.articleTitle).toContain("保護帽");
    expect(a?.text).toContain("貨物自動車");
  });

  // 車両系建設機械（第152条〜第166条）
  it.each([
    ["第153条", "ヘッドガード"],
    ["第155条", "作業計画"],
    ["第156条", "制限速度"],
    ["第157条", "転落等の防止"],
    ["第158条", "接触の防止"],
    ["第159条", "合図"],
    ["第164条", "主たる用途以外の使用の制限"],
    ["第165条", "修理"],
  ])("安衛則%s（車両系建設機械）の見出しに「%s」を含む", (num, title) => {
    expect(titleOf(num)).toContain(title);
  });

  // 過去の誤割当の再発防止（誤った組合せがコーパスに存在しないこと）
  it.each([
    // 第151条の67 はフォークリフトの定期自主検査ではない（正: 第151条の21）
    ["第151条の67", "定期自主検査"],
    // 第165条 はクレーン等の運転の合図ではない（クレーン関係はクレーン則）
    ["第165条", "クレーン"],
    // 第160条 は岩石落下・ヘッドガードではない（正: 第153条）
    ["第160条", "岩石"],
    // 第154条 は転倒・転落防止ではない（正: 第157条。第154条は調査及び記録）
    ["第154条", "転倒"],
  ])("安衛則%s の見出しに「%s」を含まない（誤割当の再発防止）", (num, wrongTitle) => {
    const title = titleOf(num);
    if (title !== undefined) {
      expect(title).not.toContain(wrongTitle);
    }
  });

  it("安衛則内で条番号の重複がない（車両系範囲）", () => {
    const nums = anei
      .map((a) => a.articleNum)
      .filter((n) => /^第15[1-9]条|^第16[0-6]条/.test(n));
    const dup = nums.filter((n, i) => nums.indexOf(n) !== i);
    expect(dup).toEqual([]);
  });
});

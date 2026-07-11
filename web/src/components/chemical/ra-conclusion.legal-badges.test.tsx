/**
 * P0回帰ガード（2026-07-11・本番実発生の偽陽性）
 *
 * 事象: 収載外物質カプサイシンのRA結論カード（GHS危険有害性カード）右下に
 * 「特化則」「有機則」バッジが本番表示された。原因は旧 key-points.ts が
 * AI自由文 regulatoryNotes への言及正規表現（/特定化学物質|特化則/ 等）で
 * バッジを点灯させており、「特定化学物質障害予防規則：非該当とされています」の
 * ような否定文にもマッチしたこと。#874 の検証は /api/chemical/legal-profile
 * （resolved:false）のみを見ており、この別経路が監査対象外だった。
 *
 * このテストは「監査済み法令索引 → auditedRegulationTags → RaConclusionCard」の
 * 実経路をそのまま歩き、
 *   1. カプサイシン（収載外）に特化則・有機則バッジが1つでも出たらCIが落ちる
 *   2. 正例（溶接ヒューム=特化則2類・マンガン化合物・トルエン=有機則）が壊れていない
 * ことを表示レベルで固定する。
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { RaConclusionCard } from "./ra-conclusion";
import type { ChemicalRaResponse } from "@/app/api/chemical-ra/route";
import { getChemicalKeyPoints } from "@/lib/chemical/key-points";
import { auditedRegulationTags } from "@/lib/chemical/legal-profile-tags";
import { resolveLegalEntity } from "@/lib/chemical/legal-entity-resolver";
import { oshaTagsForCas } from "@/lib/regulation-tag-labels";

/** legal-profile API と同じ解決手順（resolved / oshaTags）をテスト内で再現 */
function profileFor(q: string): { resolved: boolean; oshaTags?: string[] } {
  const entity = resolveLegalEntity(q);
  if (!entity) return { resolved: false };
  return { resolved: true, oshaTags: oshaTagsForCas(entity.key) };
}

/** 本番APIで実際に観測したカプサイシンのAI応答（2026-07-11・偽陽性の発生源） */
const capsaicinResult: ChemicalRaResponse = {
  chemicalName: "カプサイシン",
  casNumber: "404-86-4",
  ghsHazards: [
    { category: "急性毒性-経口", classification: "区分4", signal: "危険" },
    { category: "皮膚腐食性/刺激性", classification: "区分2", signal: "警告" },
    { category: "眼の重篤な損傷性/眼刺激性", classification: "区分2A", signal: "警告" },
  ],
  ppeRecommendations: [],
  safetyMeasures: [
    { category: "工学的対策", action: "局所排気装置の設置を検討する", priority: 1 },
  ],
  emergencyMeasures: [],
  regulatoryNotes: [
    "労働安全衛生法：名称等表示・通知義務物質（法第57条の2）。SDSの交付等が必要です。",
    "毒物及び劇物取締法：非該当とされています。",
    "有機溶剤中毒予防規則：非該当とされています。",
    "特定化学物質障害予防規則：非該当とされています。",
    "PRTR法（特定化学物質の環境への排出量の把握等及び管理の改善の促進に関する法律）：単体としては指定されていませんが、含有する製剤によっては対象となる場合があります。",
  ],
  rawReply: "",
};

function renderWithAuditedPath(q: string, result: ChemicalRaResponse) {
  const tags = auditedRegulationTags(profileFor(q));
  return render(
    <RaConclusionCard
      result={result}
      keyPoints={getChemicalKeyPoints(result, tags)}
      equipmentHref="/equipment-finder"
    />,
  );
}

describe("RA結論カードの法規制バッジ＝監査済み経路のみ（P0回帰ガード）", () => {
  it("カプサイシン（収載外）: AIが規則名を否定文で言及してもバッジは1つも出ない", () => {
    // 前提の固定: カプサイシンは法令索引に未収載（ここが true になったら索引側の変化）
    expect(resolveLegalEntity("カプサイシン")).toBeNull();
    expect(resolveLegalEntity("404-86-4")?.key).toBe("404-86-4");
    expect(oshaTagsForCas("404-86-4")).toEqual([]);

    const { container } = renderWithAuditedPath("カプサイシン", capsaicinResult);
    const text = container.textContent ?? "";
    expect(text).not.toContain("特化則");
    expect(text).not.toContain("有機則");
    // 危険有害性カード自体（GHS・対策・保護具動線）は引き続き表示される
    expect(text).toContain("急性毒性-経口");
    expect(text).toContain("必要な保護具を見る");
  });

  it("正例: 溶接ヒューム（CASレス告示名）は特化則タグが監査経路から導出される", () => {
    const tags = auditedRegulationTags(profileFor("溶接ヒューム"));
    expect(tags).toContain("特化則");
    expect(tags).not.toContain("有機則");
  });

  it("正例: マンガン及びその化合物（群指定）は特化則、トルエンは有機則", () => {
    expect(auditedRegulationTags(profileFor("マンガン及びその化合物"))).toContain("特化則");
    expect(auditedRegulationTags(profileFor("108-88-3"))).toContain("有機則");
  });

  it("正例カード表示: トルエンのカードに有機則バッジが出る（正例が消える回帰の検知）", () => {
    const tolueneResult: ChemicalRaResponse = {
      ...capsaicinResult,
      chemicalName: "トルエン",
      casNumber: "108-88-3",
      regulatoryNotes: [],
    };
    const { container } = renderWithAuditedPath("108-88-3", tolueneResult);
    expect(container.textContent).toContain("有機則");
  });
});

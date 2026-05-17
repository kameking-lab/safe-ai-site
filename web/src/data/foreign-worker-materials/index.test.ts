import { describe, expect, it } from "vitest";
import {
  MATERIAL_INDUSTRY_LABELS_JA,
  MATERIAL_LANGUAGES,
  MATERIAL_TOPIC_LABELS_JA,
  type MaterialIndustry,
  type MaterialTopic,
} from "@/types/foreign-worker";
import { SAFETY_MATERIAL_INDEX, findMaterial, listMaterials } from ".";

const INDUSTRIES = Object.keys(MATERIAL_INDUSTRY_LABELS_JA) as MaterialIndustry[];
const TOPICS = Object.keys(MATERIAL_TOPIC_LABELS_JA) as MaterialTopic[];

describe("safety material index", () => {
  it("covers every industry x topic combination", () => {
    for (const i of INDUSTRIES) {
      for (const t of TOPICS) {
        expect(findMaterial(i, t), `${i}/${t}`).toBeDefined();
      }
    }
  });

  it("contains all five languages on every checklist bullet", () => {
    for (const m of SAFETY_MATERIAL_INDEX.all) {
      for (const bullet of [...m.checklist, ...m.emergency]) {
        for (const lang of MATERIAL_LANGUAGES) {
          const text = bullet.text[lang];
          expect(text, `${m.id}/${bullet.id}/${lang}`).toBeTruthy();
          expect(text.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("contains all five languages on title and intro", () => {
    for (const m of SAFETY_MATERIAL_INDEX.all) {
      for (const lang of MATERIAL_LANGUAGES) {
        expect(m.title[lang], `${m.id}/title/${lang}`).toBeTruthy();
        expect(m.intro[lang], `${m.id}/intro/${lang}`).toBeTruthy();
      }
    }
  });

  it("groups by industry totalling all entries", () => {
    const grouped = SAFETY_MATERIAL_INDEX.byIndustry;
    const sum = Object.values(grouped).reduce((acc, arr) => acc + arr.length, 0);
    expect(sum).toBe(SAFETY_MATERIAL_INDEX.all.length);
    expect(SAFETY_MATERIAL_INDEX.all.length).toBe(INDUSTRIES.length * TOPICS.length);
  });

  it("filters via listMaterials", () => {
    const constructionOnly = listMaterials({ industry: "construction" });
    expect(constructionOnly).toHaveLength(TOPICS.length);
    const heatOnly = listMaterials({ topic: "heatstroke" });
    expect(heatOnly).toHaveLength(INDUSTRIES.length);
    expect(listMaterials({ industry: "care", topic: "fall-from-height" })).toHaveLength(1);
  });
});

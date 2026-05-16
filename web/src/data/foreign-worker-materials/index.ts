import type {
  MaterialIndustry,
  MaterialTopic,
  SafetyMaterial,
  SafetyMaterialIndex,
} from "@/types/foreign-worker";

import { CONSTRUCTION_MATERIALS } from "./construction";
import { MANUFACTURING_MATERIALS } from "./manufacturing";
import { CARE_MATERIALS } from "./care";
import { AGRICULTURE_MATERIALS } from "./agriculture";
import { FOOD_SERVICE_MATERIALS } from "./food-service";
import { ACCOMMODATION_MATERIALS } from "./accommodation";

const ALL: SafetyMaterial[] = [
  ...CONSTRUCTION_MATERIALS,
  ...MANUFACTURING_MATERIALS,
  ...CARE_MATERIALS,
  ...AGRICULTURE_MATERIALS,
  ...FOOD_SERVICE_MATERIALS,
  ...ACCOMMODATION_MATERIALS,
];

function groupBy<K extends string>(
  items: SafetyMaterial[],
  getKey: (m: SafetyMaterial) => K,
): Record<K, SafetyMaterial[]> {
  const out = {} as Record<K, SafetyMaterial[]>;
  for (const item of items) {
    const key = getKey(item);
    if (!out[key]) {
      out[key] = [];
    }
    out[key].push(item);
  }
  return out;
}

export const SAFETY_MATERIAL_INDEX: SafetyMaterialIndex = {
  all: ALL,
  byIndustry: groupBy<MaterialIndustry>(ALL, (m) => m.industry),
  byTopic: groupBy<MaterialTopic>(ALL, (m) => m.topic),
};

export function findMaterial(
  industry: MaterialIndustry,
  topic: MaterialTopic,
): SafetyMaterial | undefined {
  return ALL.find((m) => m.industry === industry && m.topic === topic);
}

export function listMaterials(filter: {
  industry?: MaterialIndustry;
  topic?: MaterialTopic;
}): SafetyMaterial[] {
  return ALL.filter(
    (m) =>
      (!filter.industry || m.industry === filter.industry) &&
      (!filter.topic || m.topic === filter.topic),
  );
}

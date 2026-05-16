import type {
  IndustryId,
  SafetySign,
  SignCategory,
} from "@/types/safety-sign";
import { PROHIBITION_SIGNS } from "./prohibition";
import { WARNING_SIGNS } from "./warning";
import { MANDATORY_SIGNS } from "./mandatory";
import { SAFE_CONDITION_SIGNS } from "./safe-condition";
import { FIRE_SAFETY_SIGNS } from "./fire-safety";

export const SAFETY_SIGNS: SafetySign[] = [
  ...PROHIBITION_SIGNS,
  ...WARNING_SIGNS,
  ...MANDATORY_SIGNS,
  ...SAFE_CONDITION_SIGNS,
  ...FIRE_SAFETY_SIGNS,
];

export interface CategoryDescriptor {
  id: SignCategory;
  /** Japanese display label. */
  label: string;
  /** English label. */
  labelEn: string;
  /** Display colour, used as a Tailwind accent token. */
  accent: "red" | "amber" | "blue" | "emerald";
  /** Shape description. */
  shapeNote: string;
  /** Short description for hub cards. */
  description: string;
  /** Citation for the visual convention. */
  reference: string;
}

export const SIGN_CATEGORIES: CategoryDescriptor[] = [
  {
    id: "prohibition",
    label: "禁止標識",
    labelEn: "Prohibition signs",
    accent: "red",
    shapeNote: "赤い円に斜線（円形）",
    description:
      "立入禁止・喫煙禁止・火気厳禁など、行為そのものを禁止する標識。JIS Z 9103の赤を主色とし、円形に斜線を重ねた図形が標準。",
    reference: "JIS Z 9101 §5.2 / ISO 7010 P-series",
  },
  {
    id: "warning",
    label: "警告標識",
    labelEn: "Warning signs",
    accent: "amber",
    shapeNote: "黄色の正三角形（黒縁）",
    description:
      "感電注意・墜落注意・高温注意など、危険源の存在を知らせる標識。黄2.5Y 8/14を主色とし、黒の三角枠と図記号で構成。",
    reference: "JIS Z 9101 §5.3 / ISO 7010 W-series",
  },
  {
    id: "mandatory",
    label: "指示標識",
    labelEn: "Mandatory action signs",
    accent: "blue",
    shapeNote: "青地の塗りつぶし円",
    description:
      "保護具着用・SDS確認・換気励行などを義務付ける標識。青2.5PB 3.5/10を主色とし、白い図記号で行動を指示。",
    reference: "JIS Z 9101 §5.4 / ISO 7010 M-series",
  },
  {
    id: "safe-condition",
    label: "安全状態標識",
    labelEn: "Safe-condition signs",
    accent: "emerald",
    shapeNote: "緑地の長方形・正方形",
    description:
      "非常口・救護所・AED・避難集合場所など、安全な行動先を示す標識。緑10G 4/10を主色とし、白い図記号で位置を示す。",
    reference: "JIS Z 9101 §5.5 / ISO 7010 E-series",
  },
  {
    id: "fire-safety",
    label: "防火標識",
    labelEn: "Fire-safety signs",
    accent: "red",
    shapeNote: "赤地の長方形・正方形",
    description:
      "消火器・消火栓・火災報知器など、消火・通報設備の位置を示す標識。赤地に白い図記号で表示。",
    reference: "JIS Z 9101 §5.6 / ISO 7010 F-series",
  },
];

export function getCategoryDescriptor(id: SignCategory): CategoryDescriptor {
  const descriptor = SIGN_CATEGORIES.find((c) => c.id === id);
  if (!descriptor) {
    throw new Error(`Unknown sign category: ${id}`);
  }
  return descriptor;
}

export function getSignsByCategory(category: SignCategory): SafetySign[] {
  return SAFETY_SIGNS.filter((s) => s.category === category);
}

export function getSignById(id: string): SafetySign | undefined {
  return SAFETY_SIGNS.find((s) => s.id === id);
}

export function getSignsForIndustry(industry: IndustryId): SafetySign[] {
  return SAFETY_SIGNS.filter((s) =>
    s.industryUsage.some((u) => u.industry === industry),
  );
}

export const SIGN_TOTAL_COUNT = SAFETY_SIGNS.length;

export const SIGN_COUNT_BY_CATEGORY: Record<SignCategory, number> = {
  prohibition: PROHIBITION_SIGNS.length,
  warning: WARNING_SIGNS.length,
  mandatory: MANDATORY_SIGNS.length,
  "safe-condition": SAFE_CONDITION_SIGNS.length,
  "fire-safety": FIRE_SAFETY_SIGNS.length,
};

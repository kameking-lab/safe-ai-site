import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Briefcase,
  CloudFog,
  Factory,
  HardHat,
  Landmark,
  Scale,
  Stethoscope,
  Sun,
} from "lucide-react";
import type { CourtCaseField } from "@/data/court-cases";

/**
 * 判例DBの視覚言語（柱0・脱テキスト）。
 * 分野（9分類）→アイコンの対応を一箇所で固定し、
 * 一覧の分野グリッド・詳細ヘッダーで同じ絵を使う（テストで全分野網羅を固定）。
 */

export const FIELD_ICON: Record<CourtCaseField, LucideIcon> = {
  "過労・メンタル": Brain,
  "じん肺・石綿": CloudFog,
  "建設・墜落": HardHat,
  "熱中症・屋外": Sun,
  "製造・造船": Factory,
  公務: Landmark,
  医療: Stethoscope,
  "雇用・労働条件": Briefcase,
  その他: Scale,
};

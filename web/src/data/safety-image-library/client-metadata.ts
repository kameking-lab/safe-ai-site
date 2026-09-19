import {
  SAFETY_SIGN_MARKET_CATEGORIES,
  type SafetySignFormat,
  type SafetySignMarketCategory,
} from "./market-definitions";

/**
 * Browser-safe metadata for the search UI. Keep this module independent from
 * the 100-item source registries so filter controls do not ship those JSON
 * files to every library visitor.
 */
export const SAFETY_IMAGE_LANGUAGES = ["ja", "en", "vi", "zh-CN", "id"] as const;
export type SafetyImageLanguage = (typeof SAFETY_IMAGE_LANGUAGES)[number];

export const SAFETY_IMAGE_LANGUAGE_LABELS: Record<SafetyImageLanguage, string> = {
  ja: "日本語",
  en: "英語",
  vi: "ベトナム語",
  "zh-CN": "中国語（簡体）",
  id: "インドネシア語",
};

export const SAFETY_IMAGE_CATEGORIES = SAFETY_SIGN_MARKET_CATEGORIES;
export type SafetyImageCategory = SafetySignMarketCategory;
export type SafetyImageOrientation = "portrait" | "landscape";
export type SafetyImageArtworkOrientation = SafetyImageOrientation | "square";
export type SafetyImageUse = "掲示" | "報告書" | "施工計画" | "教育" | "朝礼";

export type SafetyImageLibraryCardTheme = {
  order: number;
  slug: string;
  title: string;
  category: SafetyImageCategory;
  categoryLabel: string;
  signFormat: SafetySignFormat;
  recommendedSize: string;
  commonWording: string;
  multilingualPriority: string;
  editableNumber: boolean;
  texts: Record<SafetyImageLanguage, string>;
  tags: string[];
  uses: SafetyImageUse[];
  orientation: SafetyImageArtworkOrientation;
  recommended: boolean;
  previewPath: string;
  detailPath: string;
};

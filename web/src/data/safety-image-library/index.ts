import marketRegistry from "./market-themes.json" with { type: "json" };
import textRegistry from "./texts.json" with { type: "json" };
import translationRegistry from "./translation-registry.json" with { type: "json" };
import {
  SAFETY_SIGN_MARKET_CATEGORIES,
  type SafetySignFormat,
  type SafetySignMarketCategory,
} from "./market-definitions.ts";

export const SAFETY_IMAGE_LIBRARY_PATH = "/materials/safety-images";
export const SAFETY_IMAGE_LIBRARY_RIGHTS_PATH = "/materials/safety-images/terms";

export const SAFETY_IMAGE_LANGUAGES = ["ja", "en", "vi", "zh-CN", "id"] as const;
export type SafetyImageLanguage = (typeof SAFETY_IMAGE_LANGUAGES)[number];

export const SAFETY_IMAGE_LANGUAGE_LABELS: Record<SafetyImageLanguage, string> = {
  ja: "日本語",
  en: "English",
  vi: "Tiếng Việt",
  "zh-CN": "简体中文",
  id: "Bahasa Indonesia",
};

export const SAFETY_IMAGE_CATEGORIES = SAFETY_SIGN_MARKET_CATEGORIES;
export type SafetyImageCategory = SafetySignMarketCategory;
export type SafetyImageOrientation = "portrait" | "landscape";
export type SafetyImageArtworkOrientation = SafetyImageOrientation | "square";
export type SafetyImageUse = "掲示" | "報告書" | "施工計画" | "教育" | "朝礼";

export type SafetyImageNumericTemplate = {
  label: string;
  placeholder: string;
  unit: string;
  units: Record<SafetyImageLanguage, string>;
  templates: Record<SafetyImageLanguage, string>;
};

export type SafetyImageTheme = {
  id: string;
  order: number;
  slug: string;
  title: string;
  category: SafetyImageCategory;
  categoryLabel: string;
  signPurpose: string;
  signFormat: SafetySignFormat;
  recommendedSize: string;
  commonWording: string;
  multilingualPriority: string;
  editableNumber: boolean;
  vendorCount: number;
  evidenceUrls: string[];
  constructionRelevance: string;
  priority: string;
  originalityPlan: string;
  texts: Record<SafetyImageLanguage, string>;
  tags: string[];
  uses: SafetyImageUse[];
  orientation: SafetyImageArtworkOrientation;
  recommended: boolean;
  multilingual: true;
  pngAvailable: true;
  numericTemplate?: SafetyImageNumericTemplate;
  previewPath: string;
  originalPath: string;
  detailPath: string;
  rights: "portal-owned-commercial-editable";
};

type MarketThemeRow = {
  id: string;
  order: number;
  slug: string;
  titleJa: string;
  signPurpose: string;
  marketCategory: SafetyImageCategory;
  signFormat: SafetySignFormat;
  recommendedSize: string;
  orientation: SafetyImageArtworkOrientation;
  commonWording: string;
  multilingualPriority: string;
  editableNumber: boolean;
  vendorCount: number;
  evidenceUrls: string[];
  constructionRelevance: string;
  priority: string;
  originalityPlan: string;
};

type TranslationItem = {
  slug: string;
  translations: Record<SafetyImageLanguage, { text: string }>;
  numericTemplate: null | {
    placeholder: string;
    units: Record<SafetyImageLanguage, string | null>;
  };
};

const TRANSLATION_ITEM_BY_SLUG = new Map(
  (translationRegistry.items as TranslationItem[]).map((item) => [item.slug, item]),
);

function usesForCategory(category: SafetyImageCategory): SafetyImageUse[] {
  switch (category) {
    case "protective-equipment":
      return ["掲示", "教育", "朝礼"];
    case "entry-prohibition":
      return ["掲示", "教育"];
    case "hazard-warning":
      return ["掲示", "教育", "朝礼"];
    case "work-status":
      return ["掲示", "施工計画", "報告書"];
    case "traffic-guidance":
      return ["掲示", "施工計画", "報告書"];
    case "editable-numeric":
      return ["掲示", "施工計画", "報告書"];
    case "heat-emergency":
      return ["掲示", "教育", "朝礼"];
  }
}

function numericTemplateWithoutUnit(
  value: string,
  unit: string | null | undefined,
): string {
  if (!unit) return value;
  const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return value.replace(new RegExp(`\\{value\\}\\s*${escapedUnit}`, "u"), "{value}");
}

function wordingWithoutValue(value: string, unit: string | null | undefined): string {
  return numericTemplateWithoutUnit(value, unit)
    .replaceAll("{value}", "")
    .replace(/\s+/gu, " ")
    .trim();
}

const rows = marketRegistry.items as MarketThemeRow[];
const texts = textRegistry as Record<string, Record<SafetyImageLanguage, string>>;

export const SAFETY_IMAGE_THEMES: readonly SafetyImageTheme[] = rows.map((row) => {
  const categoryDefinition = SAFETY_IMAGE_CATEGORIES.find(
    (category) => category.id === row.marketCategory,
  );
  if (!categoryDefinition) throw new Error(`Unknown safety image category: ${row.marketCategory}`);
  const sourceTexts = texts[row.slug];
  if (!sourceTexts) throw new Error(`Missing text registry entry: ${row.slug}`);
  const translationItem = TRANSLATION_ITEM_BY_SLUG.get(row.slug);
  const unitByLanguage = Object.fromEntries(
    SAFETY_IMAGE_LANGUAGES.map((language) => [
      language,
      translationItem?.numericTemplate?.units[language] ?? "",
    ]),
  ) as Record<SafetyImageLanguage, string>;
  const templateByLanguage = Object.fromEntries(
    SAFETY_IMAGE_LANGUAGES.map((language) => [
      language,
      numericTemplateWithoutUnit(
        translationItem?.translations[language]?.text ?? sourceTexts[language],
        unitByLanguage[language],
      ),
    ]),
  ) as Record<SafetyImageLanguage, string>;
  const normalizedTexts = Object.fromEntries(
    SAFETY_IMAGE_LANGUAGES.map((language) => [
      language,
      wordingWithoutValue(sourceTexts[language], unitByLanguage[language]),
    ]),
  ) as Record<SafetyImageLanguage, string>;
  const numericTemplate = row.editableNumber
    ? {
        label: row.titleJa,
        placeholder: "数値または短い情報",
        unit: unitByLanguage.ja,
        units: unitByLanguage,
        templates: templateByLanguage,
      }
    : undefined;

  return {
    id: row.id,
    order: row.order,
    slug: row.slug,
    title: row.titleJa,
    category: row.marketCategory,
    categoryLabel: categoryDefinition.label,
    signPurpose: row.signPurpose,
    signFormat: row.signFormat,
    recommendedSize: row.recommendedSize,
    commonWording: row.commonWording,
    multilingualPriority: row.multilingualPriority,
    editableNumber: row.editableNumber,
    vendorCount: row.vendorCount,
    evidenceUrls: [...row.evidenceUrls],
    constructionRelevance: row.constructionRelevance,
    priority: row.priority,
    originalityPlan: row.originalityPlan,
    texts: normalizedTexts,
    tags: [
      row.titleJa,
      row.commonWording,
      row.signPurpose,
      row.signFormat,
      categoryDefinition.shortLabel,
      ...row.slug.split("-"),
    ],
    uses: usesForCategory(row.marketCategory),
    orientation: row.orientation,
    recommended: row.priority === "high",
    multilingual: true,
    pngAvailable: true,
    numericTemplate,
    previewPath: `/safety-images/library/previews/${row.slug}.webp`,
    originalPath: `/safety-images/library/originals/${row.slug}.png`,
    detailPath: `${SAFETY_IMAGE_LIBRARY_PATH}/${row.slug}`,
    rights: "portal-owned-commercial-editable",
  } satisfies SafetyImageTheme;
});

export const SAFETY_IMAGE_THEME_BY_SLUG = new Map(
  SAFETY_IMAGE_THEMES.map((theme) => [theme.slug, theme]),
);

export function getSafetyImageCategory(category: string) {
  return SAFETY_IMAGE_CATEGORIES.find((item) => item.id === category);
}

export function getSafetyImageTheme(slug: string) {
  return SAFETY_IMAGE_THEME_BY_SLUG.get(slug);
}

export const SAFETY_IMAGE_LAYOUTS = {
  schemaVersion: "safety-sign-layouts-v2",
  checkedAt: "2026-08-28",
  portrait: {
    safeMarginRatio: 0.055,
    textWidthRatio: 0.89,
    defaultPosition: "top",
    defaultBandColor: "#ffffff",
    defaultTextColor: "#082f49",
  },
  landscape: {
    safeMarginRatio: 0.05,
    textWidthRatio: 0.9,
    defaultPosition: "bottom",
    defaultBandColor: "#ffffff",
    defaultTextColor: "#082f49",
  },
  square: {
    safeMarginRatio: 0.052,
    textWidthRatio: 0.896,
    defaultPosition: "bottom",
    defaultBandColor: "#ffffff",
    defaultTextColor: "#082f49",
  },
  brandOverlay: {
    source: "/mascot/mascot-head-256.png",
    label: "© 安全AIポータル",
    defaultVisible: true,
    removable: true,
    position: "bottom-right",
  },
  themes: Object.fromEntries(
    SAFETY_IMAGE_THEMES.map((theme) => [
      theme.slug,
      {
        visualFormat:
          theme.category === "editable-numeric" || theme.category === "work-status"
            ? "status-numeric"
            : theme.category === "hazard-warning" || theme.category === "heat-emergency"
              ? "hazard-scene"
              : "directive-subject",
        focalPoint: { x: 0.5, y: theme.orientation === "portrait" ? 0.59 : 0.43 },
        subjectBounds:
          theme.orientation === "portrait"
            ? { x: 0.08, y: 0.34, width: 0.84, height: 0.6 }
            : { x: 0.06, y: 0.06, width: 0.88, height: 0.58 },
        textSafeArea:
          theme.orientation === "portrait"
            ? { x: 0.055, y: 0.045, width: 0.89, height: 0.3 }
            : { x: 0.05, y: 0.67, width: 0.9, height: 0.28 },
        allowedCrops: ["contain", theme.orientation],
        recommendedSizes: [theme.recommendedSize],
      },
    ]),
  ),
} as const;

if (SAFETY_IMAGE_THEMES.length !== 100) {
  throw new Error(`Safety image manifest must contain 100 themes, found ${SAFETY_IMAGE_THEMES.length}`);
}

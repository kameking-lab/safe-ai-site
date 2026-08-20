import layoutsJson from "./layouts.json" with { type: "json" };
import manifestJson from "./manifest.json" with { type: "json" };
import textsJson from "./texts.json" with { type: "json" };

export const PILOT_LANGUAGES = ["all", "ja", "en", "vi", "zh-CN", "id"] as const;
export type PilotLanguage = (typeof PILOT_LANGUAGES)[number];
export type PilotVariant = "a" | "b";
export type PilotPaper = "A4" | "A3";
export type PilotFormat = "jpeg" | "pdf";
export type PilotBrand = "branded" | "clean";

export const PILOT_LANGUAGE_LABELS: Record<PilotLanguage, string> = {
  all: "5言語併記",
  ja: "日本語",
  en: "English",
  vi: "Tiếng Việt",
  "zh-CN": "简体中文",
  id: "Bahasa Indonesia",
};

export const PILOT_TEXTS = textsJson;
export const PILOT_LAYOUTS = layoutsJson;
export const PILOT_MANIFEST = manifestJson;
export const DIRECT_TEXT_IS_EXACT = true;
export const PILOT_HUB_PATH = "/materials/safety-images";
export const PILOT_COMPARISON_PATH = `${PILOT_HUB_PATH}/pilot/helmet-required`;
export const PILOT_DOWNLOAD_PATH = "/api/safety-images/pilot/helmet-required/download";

export function isPilotLanguage(value: string): value is PilotLanguage {
  return PILOT_LANGUAGES.includes(value as PilotLanguage);
}

export function pilotDownloadUrl(options: {
  variant: PilotVariant;
  language: PilotLanguage;
  brand: PilotBrand;
  paper: PilotPaper;
  format: PilotFormat;
}): string {
  const search = new URLSearchParams({
    variant: options.variant,
    lang: options.variant === "b" ? "all" : options.language,
    brand: options.brand,
    paper: options.paper,
    format: options.format,
  });
  return `${PILOT_DOWNLOAD_PATH}?${search.toString()}`;
}

import type {
  SafetyImageLanguage,
  SafetyImageTheme,
} from "@/data/safety-image-library";

export type SafetyImageMessageSettings = {
  mode: "clean" | "default" | "edited";
  language: SafetyImageLanguage;
  text: string;
  subMessage: string;
  numericValue: string;
  numericUnit: string;
};

export function resolveSafetyImageMessage(
  theme: SafetyImageTheme,
  settings: SafetyImageMessageSettings,
): string {
  if (settings.mode === "clean") return "";
  const base = settings.mode === "default" ? theme.texts[settings.language] : settings.text;
  const numeric = settings.numericValue.trim();
  const unit = settings.numericUnit.trim() || theme.numericTemplate?.units[settings.language] || "";
  const numericToken = theme.numericTemplate
    ? numeric
      ? `${numeric}${unit ? ` ${unit}` : ""}`
      : `＿＿＿＿${unit ? ` ${unit}` : ""}`
    : "";
  if (theme.numericTemplate) {
    const unchangedPreset = settings.mode === "default" || settings.text.trim() === theme.texts[settings.language].trim();
    const message = unchangedPreset
      ? theme.numericTemplate.templates[settings.language].replaceAll("{value}", numericToken)
      : [base, numericToken].filter(Boolean).join("\n");
    return [message, settings.subMessage.trim()].filter(Boolean).join("\n");
  }
  return [base, settings.subMessage.trim()].filter(Boolean).join("\n");
}

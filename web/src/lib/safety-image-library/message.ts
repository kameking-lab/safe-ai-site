import type {
  SafetyImageLanguage,
  SafetyImageTheme,
} from "@/data/safety-image-library";

export type SafetyImageMessageSettings = {
  mode: "clean" | "default" | "edited";
  language: SafetyImageLanguage;
  languages?: SafetyImageLanguage[];
  text: string;
  texts?: Partial<Record<SafetyImageLanguage, string>>;
  subMessage: string;
  numericValue: string;
  numericUnit: string;
};

export type SafetyImageMessageSegment = {
  language: SafetyImageLanguage;
  text: string;
};

function resolveMessageForLanguage(
  theme: SafetyImageTheme,
  settings: SafetyImageMessageSettings,
  language: SafetyImageLanguage,
  text: string,
  useLocalizedUnit: boolean,
): string {
  const base = settings.mode === "default" ? theme.texts[language] : text;
  const numeric = settings.numericValue.trim();
  const unit = useLocalizedUnit
    ? theme.numericTemplate?.units[language] || ""
    : settings.numericUnit.trim() || theme.numericTemplate?.units[language] || "";
  const numericToken = theme.numericTemplate
    ? numeric
      ? `${numeric}${unit ? ` ${unit}` : ""}`
      : `＿＿＿＿${unit ? ` ${unit}` : ""}`
    : "";
  if (!theme.numericTemplate) return base;
  const unchangedPreset = settings.mode === "default" || text.trim() === theme.texts[language].trim();
  return unchangedPreset
    ? theme.numericTemplate.templates[language].replaceAll("{value}", numericToken)
    : [base, numericToken].filter(Boolean).join("\n");
}

export function resolveSafetyImageMessageSegments(
  theme: SafetyImageTheme,
  settings: SafetyImageMessageSettings,
): SafetyImageMessageSegment[] {
  if (settings.mode === "clean") return [];
  const languages = [...new Set(settings.languages?.length ? settings.languages : [settings.language])];
  const segments = languages.map((language) => ({
    language,
    text: resolveMessageForLanguage(
      theme,
      settings,
      language,
      settings.texts?.[language] ?? (language === settings.language ? settings.text : theme.texts[language]),
      languages.length > 1,
    ),
  })).filter((segment) => segment.text);
  const subMessage = settings.subMessage.trim();
  if (subMessage) segments.push({ language: settings.language, text: subMessage });
  return segments;
}

export function resolveSafetyImageMessage(
  theme: SafetyImageTheme,
  settings: SafetyImageMessageSettings,
): string {
  return resolveSafetyImageMessageSegments(theme, settings)
    .map((segment) => segment.text)
    .join("\n");
}

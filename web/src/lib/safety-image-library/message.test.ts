import { describe, expect, it } from "vitest";
import {
  SAFETY_IMAGE_LANGUAGES,
  SAFETY_IMAGE_THEMES,
} from "@/data/safety-image-library";
import translationRegistry from "@/data/safety-image-library/translation-registry.json";
import { resolveSafetyImageMessage } from "./message";

describe("resolveSafetyImageMessage", () => {
  it("places the value and language unit at the original position in all 50 numeric presets", () => {
    const numericThemes = SAFETY_IMAGE_THEMES.filter((theme) => theme.numericTemplate);
    expect(numericThemes).toHaveLength(10);

    for (const theme of numericThemes) {
      const registryItem = translationRegistry.items.find((item) => item.slug === theme.slug);
      if (!registryItem?.numericTemplate) throw new Error(`numeric translation missing: ${theme.slug}`);
      for (const language of SAFETY_IMAGE_LANGUAGES) {
        const rawTemplate = registryItem.translations[language].text;
        const common = {
          mode: "edited" as const,
          language,
          text: theme.texts[language],
          subMessage: "",
          numericUnit: "",
        };
        expect(
          resolveSafetyImageMessage(theme, { ...common, numericValue: "12.5" }),
          `${theme.slug}/${language}`,
        ).toBe(rawTemplate.replaceAll("{value}", "12.5"));
        expect(
          resolveSafetyImageMessage(theme, { ...common, numericValue: "" }),
          `${theme.slug}/${language}/blank`,
        ).toBe(rawTemplate.replaceAll("{value}", "＿＿＿＿"));
      }
    }
  });

  it("keeps a custom wording and its numeric value without putting user text in a template", () => {
    const theme = SAFETY_IMAGE_THEMES.find((item) => item.slug === "work-radius-no-entry");
    if (!theme) throw new Error("theme missing");
    expect(resolveSafetyImageMessage(theme, {
      mode: "edited",
      language: "ja",
      text: "指定範囲は立入禁止",
      subMessage: "責任者へ確認",
      numericValue: "8",
      numericUnit: "m",
    })).toBe("指定範囲は立入禁止\n8 m\n責任者へ確認");
  });
});

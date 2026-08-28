import type { SafetyImageLanguage } from "@/data/safety-image-library";

export type SafetyImageTextFitDimensions = { width: number; height: number };

export type SafetyImageTextFitSettings = {
  mode: "clean" | "default" | "edited";
  language: SafetyImageLanguage;
  fontSize: "small" | "standard" | "large";
  position: "top" | "center" | "bottom";
  brand: boolean;
  lineHeight: number;
  padding: "small" | "standard" | "large";
  writingMode: "horizontal" | "vertical";
};

type CommonFit = {
  margin: number;
  panelWidth: number;
  panelPadding: number;
  fontSize: number;
  brandClearance: number;
};

export type SafetyImageTextFit =
  | (CommonFit & {
      kind: "horizontal";
      lines: string[];
      panelHeight: number;
    })
  | (CommonFit & {
      kind: "vertical";
      columns: string[][];
      columnGap: number;
      verticalPanelWidth: number;
      verticalPanelHeight: number;
    });

function normalizedText(value: string): string {
  return value.replace(/\r\n?/gu, "\n").trim();
}

export function visualUnits(value: string): number {
  return Array.from(value).reduce((sum, character) => {
    if (/\s/u.test(character)) return sum + 0.42;
    // The widest bundled Noto Sans Bold Latin glyphs approach one em.
    // 1.08 is intentionally conservative for Latin, CJK and combining text.
    return sum + 1.08;
  }, 0);
}

function splitOversizedToken(value: string, maximumUnits: number): string[] {
  const parts: string[] = [];
  let part = "";
  for (const character of Array.from(value)) {
    if (part && visualUnits(`${part}${character}`) > maximumUnits) {
      parts.push(part);
      part = character;
    } else {
      part += character;
    }
  }
  if (part) parts.push(part);
  return parts;
}

export function wrapSafetyImageText(value: string, maximumUnits: number): string[] {
  const explicit = normalizedText(value).split("\n");
  const result: string[] = [];
  for (const paragraph of explicit) {
    if (!paragraph) {
      result.push("");
      continue;
    }
    const originalWords = /\s/u.test(paragraph)
      ? paragraph.split(/\s+/u)
      : Array.from(paragraph);
    const words = originalWords.flatMap((word) =>
      visualUnits(word) > maximumUnits
        ? splitOversizedToken(word, maximumUnits)
        : [word],
    );
    let line = "";
    for (const word of words) {
      const separator = line && /\s/u.test(paragraph) ? " " : "";
      const candidate = `${line}${separator}${word}`;
      if (line && visualUnits(candidate) > maximumUnits) {
        result.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

export function fitSafetyImageText(options: {
  message: string;
  dimensions: SafetyImageTextFitDimensions;
  settings: SafetyImageTextFitSettings;
}): SafetyImageTextFit | undefined {
  const message = normalizedText(options.message);
  if (!message) return undefined;
  const { dimensions, settings } = options;
  const marginRatio = dimensions.width < dimensions.height ? 0.052 : 0.045;
  const margin = Math.round(dimensions.width * marginRatio);
  const panelWidth = dimensions.width - margin * 2;
  const paddingRatios = { small: 0.022, standard: 0.035, large: 0.05 } as const;
  const panelPadding = Math.round(panelWidth * paddingRatios[settings.padding]);
  const sizeRatios = { small: 0.041, standard: 0.052, large: 0.063 } as const;
  let fontSize = Math.round(dimensions.width * sizeRatios[settings.fontSize]);
  const brandClearance =
    settings.brand && settings.mode !== "clean" && settings.position === "bottom"
      ? Math.round(dimensions.width * 0.066)
      : 0;
  const maximumPanelHeight = dimensions.height - margin * 2 - brandClearance;
  const minimumFontSize = Math.max(18, Math.round(dimensions.width * 0.012));
  const decrement = Math.max(1, Math.round(dimensions.width * 0.001));

  if (settings.writingMode === "vertical" && settings.language === "ja") {
    const characters = Array.from(message.replaceAll("\n", ""));
    let charactersPerColumn = 0;
    let columnGap = 0;
    for (let candidate = fontSize; candidate >= minimumFontSize; candidate -= decrement) {
      const candidateGap = candidate * 1.18;
      const candidateRows = Math.max(
        1,
        Math.floor((maximumPanelHeight - panelPadding * 2) / (candidate * settings.lineHeight)),
      );
      const candidateColumns = Math.ceil(characters.length / candidateRows);
      if (
        panelPadding * 2 + candidateColumns * candidateGap <= panelWidth &&
        panelPadding * 2 + Math.min(candidateRows, characters.length) * candidate * settings.lineHeight <= maximumPanelHeight
      ) {
        fontSize = candidate;
        charactersPerColumn = candidateRows;
        columnGap = candidateGap;
        break;
      }
    }
    if (!charactersPerColumn) return undefined;
    const columns: string[][] = [];
    for (let index = 0; index < characters.length; index += charactersPerColumn) {
      columns.push(characters.slice(index, index + charactersPerColumn));
    }
    const verticalPanelWidth = Math.round(
      panelPadding * 2 + Math.max(1, columns.length) * columnGap,
    );
    const longestColumn = Math.max(...columns.map((column) => column.length), 1);
    const verticalPanelHeight = Math.round(
      panelPadding * 2 + longestColumn * fontSize * settings.lineHeight,
    );
    return {
      kind: "vertical",
      margin,
      panelWidth,
      panelPadding,
      fontSize,
      brandClearance,
      columns,
      columnGap,
      verticalPanelWidth,
      verticalPanelHeight,
    };
  }

  const availableWidth = panelWidth - panelPadding * 2;
  for (let candidate = fontSize; candidate >= minimumFontSize; candidate -= decrement) {
    const lines = wrapSafetyImageText(message, availableWidth / candidate);
    const widest = Math.max(...lines.map(visualUnits), 1);
    const panelHeight = Math.round(
      panelPadding * 2 + Math.max(candidate, lines.length * candidate * settings.lineHeight),
    );
    if (widest * candidate <= availableWidth && panelHeight <= maximumPanelHeight) {
      return {
        kind: "horizontal",
        margin,
        panelWidth,
        panelPadding,
        fontSize: candidate,
        brandClearance,
        lines,
        panelHeight,
      };
    }
  }
  return undefined;
}

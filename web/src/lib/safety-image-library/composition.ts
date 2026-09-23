type Rectangle = { x: number; y: number; width: number; height: number };

/** Keep multilingual wording clear of the safety illustration in every output. */
export function getSafetyImageComposition(
  dimensions: { width: number; height: number },
  settings: {
    mode: "clean" | "default" | "edited";
    languages?: readonly string[];
    position: "top" | "center" | "bottom";
    brand: boolean;
  },
): { artwork: Rectangle; text: Rectangle } {
  const full = { x: 0, y: 0, ...dimensions };
  if (settings.mode === "clean" || new Set(settings.languages).size < 2) {
    return { artwork: full, text: full };
  }

  // Reserve the same footer space used by the exported brand, even when the
  // user places the text at the top. All rectangles use output coordinates.
  const height = dimensions.height - (settings.brand ? Math.round(dimensions.width * 0.066) : 0);
  if (dimensions.width > dimensions.height) {
    const artworkWidth = Math.round(dimensions.width * 0.42);
    return {
      artwork: { x: 0, y: 0, width: artworkWidth, height },
      text: { x: artworkWidth, y: 0, width: dimensions.width - artworkWidth, height },
    };
  }

  const textHeight = Math.round(height * 0.44);
  const artworkHeight = height - textHeight;
  const textAtBottom = settings.position === "bottom";
  return {
    artwork: { x: 0, y: textAtBottom ? 0 : textHeight, width: dimensions.width, height: artworkHeight },
    text: { x: 0, y: textAtBottom ? artworkHeight : 0, width: dimensions.width, height: textHeight },
  };
}

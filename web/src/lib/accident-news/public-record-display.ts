// Owner decision 2026-11-07: the site does not show 110/119 emergency numbers. Public
// records (MHLW fatal accident narratives) are republished verbatim, so instead of editing
// their wording, the sentence that contains such a number is left out of the display.
const EMERGENCY_NUMBER = /(?:119|110|１１９|１１０)\s*番/u;

export function withoutEmergencyNumberSentences(text: string): string {
  if (!EMERGENCY_NUMBER.test(text)) return text;
  const sentences = text.match(/[^。！？!?]*(?:[。！？!?]|$)/gu) ?? [text];
  return sentences.filter((sentence) => sentence && !EMERGENCY_NUMBER.test(sentence)).join("");
}

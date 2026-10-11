/** Distinguish rotating-tool entanglement from electrical work on the tool. */
export function hasRotatingToolGloveIntent(value: string): boolean {
  const text = value.normalize("NFKC").replace(/\s+/g, "");
  const rotatingTool = /ボール盤|面取り盤|旋盤|回転刃物|回転(?:する|中の?).{0,8}(?:ドリル|刃)|(?:ドリル|刃).{0,8}回転/.test(text);
  const gloveRisk = /軍手|手袋|巻き込/.test(text);
  // Insulated gloves for wiring/energized maintenance are a different question.
  // A correction may name the discarded topic: 「配線ではなく」「感電ではなく」.
  // Remove only that explicitly rejected noun; keep real wiring work and
  // preventive wording such as 「感電しないよう」 as electrical signals.
  const activeWork = text.replace(
    /(?:配線|結線|充電部|感電|絶縁手袋|電源(?:の)?修理)(?:ではなく|じゃなく|でなく|ではない|じゃない)/g,
    "",
  );
  const electricalMaintenance = /配線|結線|充電部|感電|絶縁手袋|電源(?:の)?修理/.test(activeWork);
  return rotatingTool && gloveRisk && !electricalMaintenance;
}

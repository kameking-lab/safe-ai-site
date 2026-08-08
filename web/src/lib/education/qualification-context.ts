export type QualificationContextInput = {
  work: string;
  height: string;
  equipment: string;
  target: string;
  voltage: string;
  role: string;
};

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/フ[ォオ]?ーク\s*リフ[トド]/gi, "フォークリフト"],
  [/フオークリフト/gi, "フォークリフト"],
  [/玉\s*掛(?:け|ケ)?/g, "玉掛け"],
  [/アスベスト/gi, "石綿"],
  [/高圧電気|高圧\s*活線/g, "高圧電気"],
  [/低圧電気|低圧\s*活線/g, "低圧電気"],
];

export function normalizeQualificationText(value: string): string {
  return REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function qualificationMissingQuestions(input: QualificationContextInput): string[] {
  const text = normalizeQualificationText(
    [input.work, input.equipment, input.target, input.role].filter(Boolean).join(" ")
  );
  const missing: string[] = [];
  if (!input.work.trim()) missing.push("具体的な作業内容");
  if (!input.role.trim()) missing.push("立場・担当（運転、操作、補助、監督等）");
  if (!input.equipment.trim()) missing.push("使用する機械・設備と能力");
  if (!input.target.trim()) missing.push("対象物・材料");
  if (/(高所|足場|墜落|鉄骨)/.test(text) && !input.height.trim()) {
    missing.push("作業床・作業箇所の高さ");
  }
  if (/(電気|活線|充電|感電|電圧)/.test(text) && !input.voltage.trim()) {
    missing.push("電圧と充電部への接近・取扱い");
  }
  return [...new Set(missing)];
}

export function qualificationSearchTerms(input: QualificationContextInput): string[] {
  return normalizeQualificationText(
    [input.work, input.height, input.equipment, input.target, input.voltage, input.role]
      .filter((value) => value.trim())
      .join(" ")
  )
    .split(/[\s,、。]+/)
    .filter(Boolean);
}

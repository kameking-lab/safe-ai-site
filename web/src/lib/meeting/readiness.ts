import type { MeetingRecord } from "@/lib/meeting/schema";

export type MeetingReadinessIssue = {
  code:
    | "site"
    | "roles"
    | "weather"
    | "contractor"
    | "people"
    | "machines"
    | "hazard-control"
    | "risk-review"
    | "coordination"
    | "checklist";
  label: string;
};

const COORDINATION_LABELS: Array<
  [keyof MeetingRecord["coordination"], string]
> = [
  ["simultaneousWork", "同時作業"],
  ["deliveries", "搬入出"],
  ["fireWork", "火気作業"],
  ["heightWork", "高所作業"],
  ["electricalWork", "電気作業"],
  ["chemicalWork", "化学物質"],
  ["weather", "天候条件"],
  ["changes", "変更点"],
  ["newEntrants", "新規入場者"],
  ["nightWork", "夜間作業"],
  ["roles", "役割分担"],
];

const REQUIRED_GENERAL_CHECK_KEYS = new Set([
  "general-0", // 朝礼・KY実施
  "general-2", // 保護具着用
  "general-3", // 立入禁止措置
  "general-4", // 整理整頓
]);

export function validateMeetingForApproval(
  record: MeetingRecord,
): MeetingReadinessIssue[] {
  const issues: MeetingReadinessIssue[] = [];
  if (!record.siteName.trim()) {
    issues.push({ code: "site", label: "作業所名" });
  }
  if (
    !record.siteManager.trim() ||
    !record.supervisor.trim() ||
    !record.author.trim()
  ) {
    issues.push({
      code: "roles",
      label: "作業所長・主任・作成担当者",
    });
  }
  if (!record.weather.trim()) {
    issues.push({ code: "weather", label: "天候" });
  }
  const activeRows = record.contractors.filter(
    (row) =>
      [
        row.companyName,
        row.workContent,
        row.machines,
        row.plannedCount,
        row.safetyInstructions,
        row.responsibleName,
      ].some((value) => value.trim()) ||
      row.predictedDisasters.some((value) => value.trim()),
  );
  if (
    activeRows.length === 0 ||
    activeRows.some(
      (row) =>
        !row.companyName.trim() ||
        !row.workContent.trim() ||
        !row.responsibleName.trim(),
    )
  ) {
    issues.push({
      code: "contractor",
      label: "協力会社・主要作業・責任者",
    });
  }
  if (activeRows.some((row) => !row.plannedCount.trim())) {
    issues.push({ code: "people", label: "予定人員" });
  }
  if (activeRows.some((row) => !row.machines.trim())) {
    issues.push({
      code: "machines",
      label: "使用設備・重機（ない場合は「なし」）",
    });
  }
  if (
    activeRows.some(
      (row) =>
        row.predictedDisasters.every((value) => !value.trim()) ||
        !row.safetyInstructions.trim(),
    )
  ) {
    issues.push({
      code: "hazard-control",
      label: "予想災害・安全衛生指示",
    });
  }
  if (activeRows.some((row) => !row.risk.reviewed)) {
    issues.push({
      code: "risk-review",
      label: "リスク評価の人手確認",
    });
  }
  const missingCoordination = COORDINATION_LABELS.filter(
    ([key]) => !record.coordination[key].trim(),
  );
  if (missingCoordination.length > 0) {
    issues.push({
      code: "coordination",
      label: `調整条件（${missingCoordination
        .map(([, label]) => label)
        .join("・")}）`,
    });
  }
  const checklistItems = record.checklist.flatMap(
    (category) => category.items,
  );
  const requiredGeneralItems = checklistItems.filter((item) =>
    REQUIRED_GENERAL_CHECK_KEYS.has(item.key),
  );
  if (
    checklistItems.length === 0 ||
    checklistItems.every((item) => item.status === "na") ||
    checklistItems.some(
      (item) => item.status === "unreviewed" || item.status === "ng",
    ) ||
    requiredGeneralItems.length !== REQUIRED_GENERAL_CHECK_KEYS.size ||
    requiredGeneralItems.some((item) => item.status !== "ok")
  ) {
    issues.push({
      code: "checklist",
      label:
        "点検項目の未確認・要是正（朝礼KY・保護具・立入禁止・整理整頓は該当なしにできません）",
    });
  }
  return issues;
}

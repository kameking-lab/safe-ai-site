import { getPpeResult, normalizePpeAnswers } from "@/lib/ppe-guided-selection";

// Only validated choice IDs cross the page reload. No free text enters this slot.
const TRANSFER_KEY = "safeai-ppe-consult-selection-v1";
const MAX_AGE_MS = 2 * 60 * 1000;
type Transfer = { expiresAt: number; answers: string[] };
let pendingSelection: Transfer | null = null;

export function __clearPpeConsultMemoryForTests(): void {
  pendingSelection = null;
}

function readTransfer(raw: string): Transfer | null {
  if (raw.length > 512) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const entry = value as Record<string, unknown>;
    if (typeof entry.expiresAt !== "number" || !Number.isFinite(entry.expiresAt) || entry.expiresAt < Date.now() || entry.expiresAt > Date.now() + MAX_AGE_MS) return null;
    const answers = normalizePpeAnswers(entry.answers);
    if (JSON.stringify(answers) !== JSON.stringify(entry.answers)) return null;
    return getPpeResult(answers)?.blocked ? { expiresAt: entry.expiresAt, answers } : null;
  } catch {
    return null;
  }
}

export function preparePpeConsultDraft(answers: readonly string[]): void {
  const normalized = normalizePpeAnswers([...answers]);
  pendingSelection = getPpeResult(normalized)?.blocked
    ? { expiresAt: Date.now() + MAX_AGE_MS, answers: normalized }
    : null;
  try {
    window.sessionStorage.removeItem(TRANSFER_KEY);
    if (pendingSelection) window.sessionStorage.setItem(TRANSFER_KEY, JSON.stringify(pendingSelection));
  } catch {
    // Storage can be blocked; an in-memory same-page transition still works.
  }
}

export function consumePpeConsultDraft(): string | null {
  let transfer = pendingSelection;
  pendingSelection = null;
  try {
    const raw = window.sessionStorage.getItem(TRANSFER_KEY);
    window.sessionStorage.removeItem(TRANSFER_KEY);
    if (raw !== null) transfer = readTransfer(raw);
  } catch {
    // The memory fallback is validated below and expires on the same clock.
  }
  if (!transfer || transfer.expiresAt < Date.now()) return null;
  const result = getPpeResult(transfer.answers);
  if (!result?.blocked) return null;

  const condition = result.condition?.label ?? "未確認";
  const pending = result.missing.map((item) => `・${item}`).join("\n");
  return `【作業内容】\n${result.task.label}（${result.category.label}）\n\n【選択した作業条件】\n${condition}\n\n【未確認・相談したい点】\n${pending}\n\n【相談したいこと】\n上記の条件を確認したうえで、必要な保護具と作業上の対策を相談したいです。\n\n個人名・連絡先・社名・現場の機密・認証情報は記入しないでください。危険条件が未確認のまま製品を選んだり作業を開始したりせず、現場の責任者に確認してください。`;
}

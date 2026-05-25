/**
 * KY全面再設計 Phase 7: localStorage キーの引き継ぎ。
 *
 * 旧 /ky は手動保存を `safe-ai:ky-instruction-record:v1` に、自動保存を `ky-record` に
 * 分けて持っていた。一本化後の入口 /ky/paper は `ky-record` を真実の保存先にするため、
 * 旧キーにしかデータが無いユーザーが /ky/paper で「空」になるのを防ぐ。
 *
 * 方針: `ky-record` が空のときだけ、旧手動保存キーから引き継ぐ（冪等・非破壊）。
 */
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";

const CURRENT_KEY = "ky-record";
const LEGACY_MANUAL_KEY = "safe-ai:ky-instruction-record:v1";

/** 旧手動保存キーから ky-record へ引き継ぐ。移行したら true。 */
export function migrateLegacyKyRecord(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = window.localStorage.getItem(CURRENT_KEY);
    if (current && current.trim()) return false; // 既にデータあり → 触らない
    const legacy = window.localStorage.getItem(LEGACY_MANUAL_KEY);
    if (!legacy || !legacy.trim()) return false;
    const parsed: unknown = JSON.parse(legacy);
    if (!parsed || typeof parsed !== "object") return false;
    const normalized = normalizeKyInstructionRecord(parsed);
    window.localStorage.setItem(CURRENT_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

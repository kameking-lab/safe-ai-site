/**
 * KY全面再設計: 「昨日コピー」を“本当に”使えるものにする（監査 P0-2）。
 *
 * 旧実装は直近の「日誌」の作業内容しか流用しなかった。本モジュールは直近に
 * 保存したKY記録そのものを丸ごと複製し、当日分として再利用できる形に整える。
 * 危険・対策・参加者・現場名などは引き継ぎ、その日固有の項目（天候・気温・
 * 体調・終了確認・署名対象の当日ステータス）だけリセットする。
 */
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import { DEFAULT_APPROVAL } from "@/lib/ky/approval";

const KY_STORAGE_KEY = "safe-ai:ky-instruction-record:v1";
const KY_AUTOSAVE_KEY = "ky-record";

/**
 * 既存KYを「当日分の複製」に変換する純粋関数。
 * 引き継ぐ: 現場名/工事名/職長/協力会社/作業内容/危険・対策/参加者氏名/行動目標 等。
 * リセット: 日付→今日、天候・気温・備考・休憩・退出・終了確認・是正、各参加者の
 *           作業前体調と退場確認、確認印。
 */
export function copyKyForToday(
  src: KyInstructionRecordState,
  now: Date = new Date()
): KyInstructionRecordState {
  const base = normalizeKyInstructionRecord(src);
  return {
    ...base,
    reportStamps: ["", "", "", "", ""],
    workDateYear: String(now.getFullYear()),
    workDateMonth: String(now.getMonth() + 1),
    workDateDay: String(now.getDate()),
    workDateNote: "",
    weather: "",
    temperature: "",
    participants: base.participants.map((p) => ({ ...p, preWork: "", onExit: "" })),
    participantTotal: base.participantTotal,
    breaks: base.breaks.map(() => ""),
    safetyVest: "",
    exitLarge: "",
    exitMedium: "",
    exitSmall: "",
    closingNote: "",
    correctionNote: "",
    fallChecks: base.fallChecks.map(() => ({ good: "", bad: "", done: "" })),
    // 複製は新しい下書き＝承認状態はリセット（前回の承認を引き継がない）。
    approval: { ...DEFAULT_APPROVAL },
  };
}

/** 直近に保存したKY記録を読み出す。手動保存キー優先、無ければ自動保存キー。 */
export function loadLatestKyRecord(): KyInstructionRecordState | null {
  if (typeof window === "undefined") return null;
  for (const key of [KY_STORAGE_KEY, KY_AUTOSAVE_KEY]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return normalizeKyInstructionRecord(parsed);
      }
    } catch {
      // 次のキーへ
    }
  }
  return null;
}

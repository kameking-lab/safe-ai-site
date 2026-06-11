"use client";

/**
 * 安全カレンダー「今月やること」の消し込み（この端末のlocalStorage）。
 *
 * 月キー（YYYY-MM）ごとに消し込んだ項目ラベルを持つだけの最小構造。
 * 月が替わると自然に新しいキーになり、未消し込み状態から始まる。
 * 古い月のキーは読み出さないため実害はないが、肥大防止に直近12か月だけ残す。
 */

const STORE_KEY = "safe-ai:calendar-done:v1";
const KEEP_MONTHS = 12;

type DoneMap = Record<string, string[]>;

export function calendarMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ---- 純関数（テスト対象） ----

/** ラベルの有無をトグルした新しい配列を返す（元配列は変更しない） */
export function toggleLabel(done: string[], label: string): string[] {
  return done.includes(label) ? done.filter((l) => l !== label) : [...done, label];
}

/** 今月の定例項目のうち未消し込みの件数 */
export function countCalendarRemaining(labels: string[], done: string[]): number {
  return labels.filter((l) => !done.includes(l)).length;
}

/** 月キー降順で直近 keep 件だけ残す（YYYY-MM は辞書順=時系列順） */
export function pruneDoneMap(map: DoneMap, keep = KEEP_MONTHS): DoneMap {
  const keys = Object.keys(map).sort().reverse().slice(0, keep);
  return Object.fromEntries(keys.map((k) => [k, map[k]]));
}

// ---- localStorage 入出力 ----

function readMap(): DoneMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const map: DoneMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(v)) map[k] = v.filter((x): x is string => typeof x === "string");
    }
    return map;
  } catch {
    return {};
  }
}

export function getDoneLabels(monthKey: string): string[] {
  return readMap()[monthKey] ?? [];
}

/** 指定月の消し込みをトグルして保存し、その月の新しい消し込みリストを返す */
export function toggleDoneLabel(monthKey: string, label: string): string[] {
  const map = readMap();
  const next = toggleLabel(map[monthKey] ?? [], label);
  const pruned = pruneDoneMap({ ...map, [monthKey]: next });
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(pruned));
  } catch {
    // ストレージ不可（プライベートモード等）でも画面内の状態は維持される
  }
  return next;
}

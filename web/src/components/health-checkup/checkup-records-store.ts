"use client";

/**
 * 前回実施日レコードの共有ストア。
 *
 * 結果ページ最上部の結論カードと「漏れ・期限超過チェック」台帳が同じ
 * localStorage キーを読むため、useState を各コンポーネントに持たせると
 * 片方の入力がもう片方に反映されない。モジュールレベルのキャッシュ＋
 * リスナーを useSyncExternalStore で購読し、書き込みは write/clear 経由に
 * 一本化して同一タブ内で即時同期する。
 *
 * 保存形式は従来の MissingCheckupTracker と同一（キー・JSON とも不変）なので
 * 既存ユーザーの入力済みデータはそのまま読める。
 */

import { useCallback, useSyncExternalStore } from "react";

export type CheckupRecordMap = Record<string, string>;

const EMPTY: CheckupRecordMap = {};
const cache = new Map<string, CheckupRecordMap>();
const listeners = new Map<string, Set<() => void>>();

function load(key: string): CheckupRecordMap {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as CheckupRecordMap;
    return EMPTY;
  } catch {
    return EMPTY;
  }
}

function snapshot(key: string): CheckupRecordMap {
  let v = cache.get(key);
  if (!v) {
    v = load(key);
    cache.set(key, v);
  }
  return v;
}

function emit(key: string): void {
  listeners.get(key)?.forEach((l) => l());
}

function persist(key: string, value: CheckupRecordMap): void {
  cache.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 容量超過等は無視（メモリ上の状態は維持される） */
  }
  emit(key);
}

export function writeCheckupRecord(
  key: string,
  ruleId: string,
  value: string,
): void {
  const next = { ...snapshot(key) };
  if (value) next[ruleId] = value;
  else delete next[ruleId];
  persist(key, next);
}

export function clearCheckupRecords(key: string): void {
  persist(key, {});
}

/** 指定キーの実施日レコードを購読する（SSR では常に空）。 */
export function useCheckupRecords(key: string): CheckupRecordMap {
  const subscribe = useCallback(
    (cb: () => void) => {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(cb);
      return () => {
        set.delete(cb);
      };
    },
    [key],
  );
  return useSyncExternalStore(
    subscribe,
    () => snapshot(key),
    () => EMPTY,
  );
}

/**
 * サイネージ表示設定の永続化（Phase C）。言語選択を localStorage に保持する純粋ヘルパー。
 * SSR/未対応環境でも例外を投げない（KYの堅牢性方針を踏襲）。
 */
import { isSignageLang, type SignageLang } from "@/lib/signage/signage-labels";

export const SIGNAGE_LANG_KEY = "safe-ai:signage-lang:v1";

/** 保存済みの表示言語を読む（無効・未設定は "ja"）。 */
export function readStoredSignageLang(): SignageLang {
  if (typeof window === "undefined") return "ja";
  try {
    const v = window.localStorage.getItem(SIGNAGE_LANG_KEY);
    return isSignageLang(v) ? v : "ja";
  } catch {
    return "ja";
  }
}

/** 表示言語を保存する（失敗は無視）。 */
export function storeSignageLang(lang: SignageLang): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIGNAGE_LANG_KEY, lang);
  } catch {
    /* 容量超過等は無視 */
  }
}

/**
 * 画面スリープ抑止フック（Phase C / 軸2・軸4 P0-2）。
 *
 * 朝礼・常設サイネージ表示中に端末の画面が暗転すると現場運用が破綻する。
 * Screen Wake Lock API で画面の自動消灯を抑止する。非対応ブラウザ（iOS Safari 旧版等）では
 * 何もしない無害フォールバック。タブが背面→前面に戻ったときは自動で再取得する。
 *
 * 設計はKYの「クラウド未設定でも壊れない」方針を踏襲し、例外は握りつぶしてUIを止めない。
 */
import { useEffect } from "react";

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

/**
 * active が true の間、画面スリープを抑止する。
 * @param active 抑止を有効にするか（サイネージ表示中のみ true 推奨）。
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined") return;
    const wl = (navigator as unknown as WakeLockNavigator).wakeLock;
    if (!wl) return; // 非対応ブラウザ: 何もしない

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await wl.request("screen");
        if (cancelled) {
          void s.release().catch(() => {});
          return;
        }
        sentinel = s;
      } catch {
        /* 取得失敗（権限・非表示時など）は無視 */
      }
    };

    const onVisibility = () => {
      if (typeof document === "undefined") return;
      // 前面復帰時はロックが解放されていることがあるため取り直す。
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (sentinel) void sentinel.release().catch(() => {});
    };
  }, [active]);
}

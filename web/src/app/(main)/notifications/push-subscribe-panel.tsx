"use client";

import { useEffect, useState } from "react";
import { BellRing, Info, Smartphone, X } from "lucide-react";
import { PREFECTURE_CENTROIDS } from "@/data/jma/prefecture-centroids";
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from "@/lib/notifications/notification-store";

/**
 * 閉端末 Web Push の購読ボタン（NIQ-HUB1）。
 *
 * 【重要な作法】
 *  - 通知許可（Notification.requestPermission）はユーザーが「有効にする」を
 *    押した時のみ要求する。ページ表示だけでの自動要求は禁止（ブラウザにも嫌われる）。
 *  - 閉じている端末に届く本来のPush。OS通知（画面表示中）とは別レイヤーだが、
 *    対象地域は同じ端末内設定（notification-store）を共有する。
 *  - iOS Safari は「ホーム画面に追加」したPWAでのみPushが動く制約を正直に注記。
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type PanelState =
  | "checking" // 初期判定中
  | "unsupported" // ブラウザ非対応
  | "no-key" // サーバー側VAPID未設定（公開鍵が配布されていない）
  | "default" // 未購読・許可要求可能
  | "denied" // ブラウザでブロック済み
  | "subscribed"; // 購読済み

/** base64url の公開鍵を pushManager.subscribe 用の Uint8Array（ArrayBuffer裏付け）に変換。 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS(iPhone/iPad) かの簡易判定（PWA制約の注記出し分け用）。 */
function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOsUa = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ は Mac を騙るためタッチ有無でも判定
  const iPadOs = ua.includes("Macintosh") && "ontouchend" in document;
  return iOsUa || iPadOs;
}

/** スタンドアロン（ホーム画面から起動したPWA）で動作中か。 */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari 独自プロパティ
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function PushSubscribePanel() {
  const [state, setState] = useState<PanelState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [prefectureIso, setPrefectureIso] = useState<string | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!pushSupported()) {
        if (!cancelled) setState("unsupported");
        return;
      }
      const settings = loadNotificationSettings();
      if (!cancelled) {
        setPrefectureIso(settings.prefectureIso);
        setIosHint(isIos() && !isStandalone());
      }
      if (!VAPID_PUBLIC_KEY) {
        if (!cancelled) setState("no-key");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      // 既存購読があるか（許可要求はしない・読むだけ）
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (!cancelled) setState(existing ? "subscribed" : "default");
      } catch {
        if (!cancelled) setState("default");
      }
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefecture = (iso: string | null) => {
    setPrefectureIso(iso);
    // OS通知パネルと同じ端末内設定を共有（対象地域は1箇所で管理）
    const settings = loadNotificationSettings();
    saveNotificationSettings({ ...settings, prefectureIso: iso });
  };

  const enablePush = async () => {
    setBusy(true);
    setMessage(null);
    try {
      // 許可要求は「このクリック」でのみ行う
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        setMessage("通知が許可されませんでした。");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), prefecture: prefectureIso }),
      });
      if (res.ok) {
        setState("subscribed");
        setMessage("プッシュ通知を有効にしました。ブラウザを閉じていても警報が届きます。");
        return;
      }
      // サーバー側の正直な段階応答をそのまま伝える
      const data = (await res.json().catch(() => ({}))) as { reason?: string; message?: string };
      // 購読はブラウザ側で作られてしまうため、サーバー保存に失敗したら解除しておく
      await subscription.unsubscribe().catch(() => undefined);
      setState("default");
      if (data.reason === "table_not_ready" || data.reason === "not_configured") {
        setMessage(
          data.message ??
            "サーバー側の準備が完了していません。管理者の設定後に有効になります。"
        );
      } else {
        setMessage("登録に失敗しました。時間をおいて再度お試しください。");
      }
    } catch (err) {
      setMessage(err instanceof Error ? `エラー: ${err.message}` : "エラーが発生しました。");
      setState("default");
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        const endpoint = existing.endpoint;
        await existing.unsubscribe().catch(() => undefined);
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, {
          method: "DELETE",
        }).catch(() => undefined);
      }
      setState("default");
      setMessage("プッシュ通知を解除しました。");
    } catch (err) {
      setMessage(err instanceof Error ? `エラー: ${err.message}` : "エラーが発生しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-6"
      data-testid="push-subscribe-panel"
    >
      <div className="mb-3 flex items-center gap-2">
        <BellRing className="h-5 w-5 text-indigo-600" aria-hidden="true" />
        <h2 className="text-sm font-bold text-slate-800">
          閉じている端末にも届くプッシュ通知（Web Push）
        </h2>
      </div>

      <div className="space-y-3 text-xs leading-5 text-slate-600">
        <p>
          この端末で有効にすると、<span className="font-semibold">ブラウザを閉じていても</span>
          気象の警報・特別警報が発表された時にスマホ/PCへ直接プッシュ通知が届きます。
          対象地域は下で選んだ都道府県の警報級のみをお送りします。
        </p>

        {iosHint && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 font-semibold text-amber-900">
            <Smartphone className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            iPhone / iPad の注記: Web Push は
            <span className="underline">「ホーム画面に追加」したアプリ</span>
            からのみ有効化できます（Safariの共有ボタン →「ホーム画面に追加」→
            追加したアイコンから開いてこのボタンを押してください）。
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {state === "checking" && (
            <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-500">
              対応状況を確認中…
            </span>
          )}
          {state === "unsupported" && (
            <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-500">
              このブラウザはWeb Push（プッシュ通知）に対応していません。
            </span>
          )}
          {state === "no-key" && (
            <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-500">
              プッシュ通知は現在準備中です（サーバー側の設定完了後に有効化できます）。
            </span>
          )}
          {state === "denied" && (
            <span className="rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-700">
              通知がブラウザ設定でブロックされています。アドレスバーのサイト設定から許可してください。
            </span>
          )}
          {state === "default" && (
            <button
              type="button"
              onClick={() => void enablePush()}
              disabled={busy}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <BellRing className="h-4 w-4" aria-hidden="true" />
              {busy ? "設定中…" : "プッシュ通知を有効にする"}
            </button>
          )}
          {state === "subscribed" && (
            <>
              <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-50 px-3 font-semibold text-emerald-700">
                <BellRing className="h-4 w-4" aria-hidden="true" />
                この端末で有効です
              </span>
              <button
                type="button"
                onClick={() => void disablePush()}
                disabled={busy}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {busy ? "解除中…" : "解除する"}
              </button>
            </>
          )}
        </div>

        {message && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700" role="status">
            {message}
          </p>
        )}

        <label className="flex flex-wrap items-center gap-2 pt-1">
          <span className="font-semibold text-slate-700">警報を受け取る地域:</span>
          <select
            value={prefectureIso ?? ""}
            onChange={(e) => updatePrefecture(e.target.value || null)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 text-sm"
            aria-label="プッシュ通知の対象都道府県"
          >
            <option value="">未設定（気象警報を受け取らない）</option>
            {PREFECTURE_CENTROIDS.map((p) => (
              <option key={p.iso} value={p.iso}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <p className="flex items-start gap-1 text-[11px] text-slate-400">
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          地域の変更を購読に反映するには、一度「解除」してから再度「有効にする」を押してください。
        </p>
      </div>
    </div>
  );
}

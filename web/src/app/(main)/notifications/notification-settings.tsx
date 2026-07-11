"use client";

import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Info, MonitorSpeaker } from "lucide-react";
import { PREFECTURE_CENTROIDS } from "@/data/jma/prefecture-centroids";
import {
  loadNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from "@/lib/notifications/notification-store";
import {
  osNotifyPermission,
  requestOsNotifyPermission,
  showOsNotification,
} from "@/lib/notifications/os-notify";

/**
 * 通知センターの設定（端末内保存・鍵なし通知ライト）。
 * - OS通知（Notification API）の許可とトグル: サイネージ・常時表示端末向け
 * - 気象警報の対象都道府県
 * - 制約の正直な明記: 開いている画面にのみ届く（Web Pushは鍵発行後）
 */
export function NotificationSettingsPanel() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    // 端末内設定はSSRに存在しないためマウント後に読む（hydration安全）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadNotificationSettings());
    setPermission(osNotifyPermission());
  }, []);

  if (!settings) {
    return <div className="min-h-[160px] rounded-2xl border border-slate-200 bg-white" aria-hidden="true" />;
  }

  const update = (next: NotificationSettings) => {
    setSettings(next);
    saveNotificationSettings(next);
  };

  const enableOsNotify = async () => {
    const p = await requestOsNotifyPermission();
    setPermission(p);
    if (p === "granted") update({ ...settings, osNotify: true });
  };

  const sendTest = () => {
    showOsNotification({
      id: `test-${Date.now()}`,
      category: "weather",
      title: "テスト通知: 表示されれば設定完了です",
      body: "この端末でページを開いている間、警報級の新着をお知らせします。",
      date: new Date().toISOString(),
      internalHref: "/notifications",
      severity: "warning",
    });
    setTestSent(true);
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6" data-testid="notification-settings">
      <div className="mb-3 flex items-center gap-2">
        <MonitorSpeaker className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        <h2 className="text-sm font-bold text-slate-800">画面表示中のOS通知（サイネージ・常時表示端末向け）</h2>
      </div>

      <div className="space-y-3 text-xs leading-5 text-slate-600">
        <p>
          このサイトを開いている画面で、<span className="font-semibold">気象の警報・特別警報級の新着</span>を
          パソコン/タブレットのOS通知（画面右上のポップアップ）でお知らせします。休憩所のサイネージや
          事務所の常時表示ダッシュボードでの利用を想定しています。
        </p>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 font-semibold text-amber-900">
          <Info className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          制約（正直な注記）: この通知は<span className="underline">ページを開いているタブからのみ</span>発火します。
          ブラウザを閉じている端末には届きません。閉じていても届く本来のプッシュ通知（Web Push）は、
          通知鍵（VAPID）の発行後に対応予定です（発行手順は5分・docs/vapid-push-setup-guide に用意済み）。
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {permission === "unsupported" && (
            <span className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-500">
              このブラウザはOS通知（Notification API）に対応していません。
            </span>
          )}
          {permission === "denied" && (
            <span className="rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-700">
              通知がブラウザ設定でブロックされています。アドレスバーのサイト設定から許可してください。
            </span>
          )}
          {permission === "default" && (
            <button
              type="button"
              onClick={() => void enableOsNotify()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <BellRing className="h-4 w-4" aria-hidden="true" />
              OS通知を許可して有効にする
            </button>
          )}
          {permission === "granted" && (
            <>
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.osNotify}
                  onChange={(e) => update({ ...settings, osNotify: e.target.checked })}
                  className="h-4 w-4 accent-emerald-600"
                />
                画面表示中のOS通知を出す
              </label>
              <button
                type="button"
                onClick={sendTest}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                テスト通知を送る
              </button>
              {testSent && (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  送信しました
                </span>
              )}
            </>
          )}
        </div>

        <label className="flex flex-wrap items-center gap-2 pt-1">
          <span className="font-semibold text-slate-700">気象警報の対象地域:</span>
          <select
            value={settings.prefectureIso ?? ""}
            onChange={(e) => update({ ...settings, prefectureIso: e.target.value || null })}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 text-sm"
            aria-label="気象警報の対象都道府県"
          >
            <option value="">未設定（気象警報を通知に含めない）</option>
            {PREFECTURE_CENTROIDS.map((p) => (
              <option key={p.iso} value={p.iso}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[11px] text-slate-400">
          設定・既読はこの端末（ブラウザ）内にのみ保存されます。サーバーには送信されません。
        </p>
      </div>
    </div>
  );
}

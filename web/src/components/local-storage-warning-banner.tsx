"use client";

import { useSyncExternalStore, useState } from "react";
import { HardDrive, X, AlertTriangle } from "lucide-react";

const DISMISSED_KEY = "safe-ai:local-storage-warning-dismissed:v1";
const ACKNOWLEDGED_KEY = "safe-ai:local-storage-warning-acknowledged:v1";

function subscribe(_callback: () => void) {
  return () => {};
}

function getBannerVisibleSnapshot(): boolean {
  try {
    return !localStorage.getItem(DISMISSED_KEY);
  } catch {
    return false;
  }
}

function getModalVisibleSnapshot(): boolean {
  try {
    return !localStorage.getItem(ACKNOWLEDGED_KEY);
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function LocalStorageWarningBanner() {
  const bannerStored = useSyncExternalStore(
    subscribe,
    getBannerVisibleSnapshot,
    getServerSnapshot
  );
  const modalStored = useSyncExternalStore(
    subscribe,
    getModalVisibleSnapshot,
    getServerSnapshot
  );
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [modalAcknowledged, setModalAcknowledged] = useState(false);

  const showModal = modalStored && !modalAcknowledged;
  const showBanner = bannerStored && !bannerDismissed && !showModal;

  function dismissBanner() {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
    setBannerDismissed(true);
  }

  function acknowledgeModal() {
    try {
      localStorage.setItem(ACKNOWLEDGED_KEY, "1");
    } catch {
      // ignore
    }
    setModalAcknowledged(true);
  }

  return (
    <>
      {showModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ls-warning-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 print:hidden"
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-rose-500 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" aria-hidden />
              <div className="flex-1">
                <h2
                  id="ls-warning-modal-title"
                  className="text-base font-bold text-rose-900"
                >
                  入力データはこの端末にのみ保存されます
                </h2>
                <ul className="mt-3 space-y-1.5 text-sm leading-6 text-slate-800">
                  <li>
                    • <span className="font-semibold">サーバーには送信されません</span>
                    （ブラウザの localStorage に保存）
                  </li>
                  <li>
                    • ブラウザのキャッシュ・履歴を削除すると
                    <span className="font-semibold text-rose-700">
                      記録が完全に消失
                    </span>
                    します
                  </li>
                  <li>
                    • 別の端末・ブラウザからは閲覧できません
                  </li>
                  <li>
                    • 重要な記録は必ず
                    <span className="font-semibold">「エクスポート」</span>
                    で JSON バックアップを取ってください
                  </li>
                </ul>
              </div>
            </div>
            <button
              type="button"
              onClick={acknowledgeModal}
              className="mt-5 w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              理解しました（次回以降は表示されません）
            </button>
          </div>
        </div>
      ) : null}

      {showBanner ? (
        <div
          role="status"
          className="mb-4 flex items-start gap-3 rounded-xl border-2 border-rose-400 bg-rose-50 px-4 py-3 print:hidden"
        >
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
          <p className="flex-1 text-xs leading-5 text-rose-900">
            <span className="font-bold">
              データはこのブラウザのみに保存されます。
            </span>
            ブラウザのキャッシュ・履歴を削除すると記録が消えます。
            定期的に「エクスポート」で JSON バックアップを取ってください。
          </p>
          <button
            type="button"
            onClick={dismissBanner}
            className="rounded p-0.5 text-rose-600 hover:bg-rose-100"
            aria-label="警告を閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </>
  );
}

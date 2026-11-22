"use client";

import { useId, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { hasOptionalTrackingConsent, hasPrivacySignalOptOut } from "@/lib/analytics-privacy";
import { trackEvent } from "@/lib/track-events";
import type { WorkplaceShareKind, WorkplaceShareMethod } from "@/lib/workplace-share";

const actionClass =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

function trackShare(kind: WorkplaceShareKind, method: WorkplaceShareMethod) {
  if (kind !== "chemical_ra") {
    trackEvent("workplace_share", { content_kind: kind, method });
    return;
  }
  // RA keeps its third-party analytics exclusion. Record only the method in the
  // existing runtime logs, without a referrer, cookies, or a request body.
  if (!hasOptionalTrackingConsent() || hasPrivacySignalOptOut()) return;
  void fetch("/api/chemical-ra/share-event", {
    method: "POST",
    headers: { "X-Share-Method": method },
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true,
  }).catch(() => {});
}

export function WorkplaceShare({
  kind,
  title,
  summary,
  url,
}: {
  kind: WorkplaceShareKind;
  title: string;
  summary: string;
  url: string;
}) {
  const optionsId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [opened, setOpened] = useState(false);
  const [feedback, setFeedback] = useState<"copied" | "manual-copy" | "share-failed" | null>(null);
  const message = `${url}\n\n${title}\n${summary}`;

  async function share() {
    setFeedback(null);
    // Share targets can put the separate URL field after the text.
    const data = { title, text: message };
    if (typeof navigator.share !== "function" || navigator.canShare?.(data) === false) {
      setOpened(!opened);
      return;
    }
    setOpened(false);
    try {
      await navigator.share(data);
      trackShare(kind, "native");
    } catch (error) {
      // AbortError also covers devices without a usable share target.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setOpened(true);
        setFeedback("share-failed");
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setFeedback("copied");
      trackShare(kind, "copy");
    } catch {
      setFeedback("manual-copy");
    }
  }

  return (
    <div
      className="print:hidden"
      onKeyDown={(event) => {
        if (!opened || event.key !== "Escape") return;
        event.stopPropagation();
        setOpened(false);
        setFeedback(null);
        trigger.current?.focus();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={opened}
        aria-controls={optionsId}
        className={actionClass}
        onClick={share}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {kind === "chemical_ra" ? "結果の要約を共有" : "職場に共有"}
      </button>
      <div id={optionsId} hidden={!opened}>
        {opened && (
          <>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={actionClass} onClick={copy}>要点とリンクをコピー</button>
              <a
                className={actionClass}
                href={`https://line.me/R/share?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackShare(kind, "line")}
              >
                LINEで送る
              </a>
            </div>
            <div role="status" className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {feedback === "copied" && "コピーしました"}
              {feedback === "share-failed" && "共有シートを開けませんでした。コピーかLINEで共有できます。"}
            </div>
            {feedback === "manual-copy" && (
              <label className="mt-2 block text-sm font-bold text-slate-800 dark:text-slate-100">
                共有文を選択してコピー
                <textarea
                  value={message}
                  readOnly
                  rows={5}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-base font-normal text-slate-900"
                />
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
}

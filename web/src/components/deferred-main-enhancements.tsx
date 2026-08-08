"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isWorkContextPath } from "@/lib/usage-tracker";

const FeedbackGateModal = dynamic(() =>
  import("@/components/FeedbackGateModal").then(
    (module) => module.FeedbackGateModal,
  ),
);
const ShareButtons = dynamic(() =>
  import("@/components/share-buttons").then((module) => module.ShareButtons),
);

const LOAD_DELAY_MS = 15_000;

/**
 * 本文・ナビ・相談導線と無関係な補助UIを初期hydrateから外す。
 * 15秒後には従来どおり利用でき、固定シェアを押すために必要な本文読了時間より短い。
 */
export function DeferredMainEnhancements() {
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const blocksTask = isWorkContextPath(pathname);

  useEffect(() => {
    if (blocksTask) return;
    let delayElapsed = false;
    const loadWhenAvailable = () => {
      if (delayElapsed && window.navigator.onLine) setReady(true);
    };
    const timer = window.setTimeout(() => {
      delayElapsed = true;
      loadWhenAvailable();
    }, LOAD_DELAY_MS);
    window.addEventListener("online", loadWhenAvailable);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", loadWhenAvailable);
    };
  }, [blocksTask]);

  if (blocksTask || !ready) return null;
  return (
    <>
      <FeedbackGateModal />
      <ShareButtons fixed />
    </>
  );
}

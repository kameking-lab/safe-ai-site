"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MascotGuide } from "@/components/mascot-guide";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[安全AIポータル] main route error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <MascotGuide
        variant="error"
        title="このページの表示で問題が発生しました"
        titleAs="h2"
        message={
          <>
            <p>
              再試行しても解決しない場合は、トップへ戻って別のページからやり直してください。
            </p>
            {error.digest ? (
              <p className="mt-2 break-all text-[11px]">
                エラーID: {error.digest}
              </p>
            ) : null}
          </>
        }
        action={
          <>
            <button
              type="button"
              onClick={reset}
              className="portal-button-primary text-xs"
            >
              再試行
            </button>
            <Link href="/" className="portal-button-secondary text-xs">
              トップへ戻る
            </Link>
          </>
        }
      />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";

export function ShareFragmentView() {
  useEffect(() => {
    if (!window.location.hash) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-black tracking-tight text-slate-950">
        会話共有は終了しました
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        安衛法AIで新しく質問できます。
      </p>
      <Link
        href="/chatbot"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-blue-700 px-5 py-2 text-sm font-bold text-white hover:bg-blue-800"
      >
        安衛法AIを開く
      </Link>
    </div>
  );
}

"use client";

/** A picture source also prevents the animated asset loading under reduced motion. */
export function ChatThinking() {
  return <div role="status" aria-label="回答を作成中" data-chat-thinking="" className="flex justify-start py-2">
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet="/mascot/mascot-searching-still.webp" />
      <img src="/mascot/mascot-searching.gif" alt="" width={144} height={144} decoding="sync" fetchPriority="high" className="h-36 w-36 rounded-2xl bg-white object-contain" />
    </picture>
  </div>;
}

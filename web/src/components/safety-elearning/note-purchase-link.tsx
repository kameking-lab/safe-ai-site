"use client";

import { trackAffiliateClick } from "@/lib/track-events";

export function SafetyNotePurchaseLink({ noteKey, title, courseId }: {
  noteKey: string;
  title: string;
  courseId: string;
}) {
  const href = `https://note.com/anzen_ai_jp/n/${noteKey}?utm_source=anzen_ai_portal&utm_medium=referral&utm_campaign=safety_learning&utm_content=${noteKey}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => trackAffiliateClick({
        productId: noteKey,
        productName: title,
        network: "other",
        url: href,
        page: `/e-learning/safety/${courseId}`,
      })}
      className="mt-3 inline-flex min-h-11 items-center font-black text-sky-900 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200"
    >
      noteで無料部分・収録内容を確認する ↗
      <span className="sr-only">（新しいタブで開きます）</span>
    </a>
  );
}

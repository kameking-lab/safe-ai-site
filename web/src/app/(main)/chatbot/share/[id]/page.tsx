import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "旧形式の共有URLは終了しました",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Legacy URLs embedded the entire conversation in the request path. Never
 * decode or render that path parameter. New shares use /chatbot/share#v1=...
 * so the payload stays in the browser fragment.
 */
export default function RetiredLegacyChatSharePage() {
  notFound();
}

import type { Metadata } from "next";
import { ShareFragmentView } from "@/components/chatbot/share-fragment-view";

export const metadata: Metadata = {
  title: "会話共有は終了しました | 安衛法AI",
  description: "安衛法AIで新しく質問できます。",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ChatSharePage() {
  return <ShareFragmentView />;
}

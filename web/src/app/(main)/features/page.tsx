import type { Metadata } from "next";
import { FeaturesIndexClient } from "./features-index-client";

export const metadata: Metadata = {
  title: "機能紹介 | ANZEN AI",
  description:
    "ANZEN AIの全26機能を1ページで一覧。安衛法チャットボット・KY用紙・化学物質RA・事故DB・Eラーニングなど、業種・用途から探せます。",
  openGraph: {
    title: "機能紹介 | ANZEN AI",
    description:
      "ANZEN AIの全26機能を1ページで一覧。安衛法チャットボット・KY用紙・化学物質RA・事故DB・Eラーニングなど、業種・用途から探せます。",
  },
};

export default function FeaturesPage() {
  return <FeaturesIndexClient />;
}

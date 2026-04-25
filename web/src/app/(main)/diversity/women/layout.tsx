import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";

const _title = "女性労働者の安全衛生｜就業制限・母性保護・ハラスメント対策";
const _desc =
  "女性労働者の就業制限（重量物・有害業務）・母性健康管理・ハラスメント防止・生理休暇・産前産後休業など、女性が安全に働くための法令と実務情報を解説。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/diversity/women" },
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function DiversityWomenLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

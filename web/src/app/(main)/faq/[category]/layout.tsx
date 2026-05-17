import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/og-url";
import {
  FAQ_CATEGORY_LABELS,
  FAQ_CATEGORY_DESCRIPTIONS,
  FAQ_SLUG_TO_CATEGORY,
  type FAQCategory,
} from "@/types/faq";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = FAQ_SLUG_TO_CATEGORY[slug] as FAQCategory | undefined;
  if (!category) return { alternates: { canonical: "/faq" } };
  const label = FAQ_CATEGORY_LABELS[category];
  const desc = FAQ_CATEGORY_DESCRIPTIONS[category];
  const title = `${label} FAQ`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/faq/${slug}` },
    openGraph: {
      title,
      description: desc,
      images: [{ url: ogImageUrl(title, desc), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogImageUrl(title, desc)] },
  };
}

export default function FAQCategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";
type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;
  return {
    title: "FAQの検証状況",
    description: "旧FAQは一次資料との照合が完了するまで公開停止中です。",
    alternates: { canonical: "/faq" },
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
  };
}

export default function FAQCategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

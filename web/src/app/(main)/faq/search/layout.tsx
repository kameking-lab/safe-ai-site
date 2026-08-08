import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
  alternates: {
    canonical: "/faq",
  },
};

export default function FaqSearchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}

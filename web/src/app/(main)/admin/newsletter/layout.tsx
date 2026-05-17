import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ニュースレター管理｜管理画面",
  robots: { index: false, follow: false },
};

export default function AdminNewsletterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

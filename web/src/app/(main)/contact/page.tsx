import type { Metadata } from "next";
import { Suspense } from "react";
import ContactForm from "./ContactForm";
import InquiryForm from "./InquiryForm";
import { PAID_MODE } from "@/lib/paid-mode";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: PAID_MODE ? "お問い合わせ" : "ご意見・ご質問・改善提案",
  description: PAID_MODE
    ? "安全AIポータルへのお問い合わせはこちらから。機能のご要望・バグ報告・ご質問をお待ちしています。"
    : "安全AIポータル（労働安全 × AI/DX 研究プロジェクト）へのご意見・ご質問・改善提案・データ誤りの指摘を受け付けています。匿名でも投稿できます。",
  alternates: { canonical: "/contact" },
  openGraph: withSiteOpenGraph("/contact", {
    title: PAID_MODE ? "お問い合わせ" : "ご意見・改善提案",
    description: PAID_MODE
      ? "安全AIポータルへのお問い合わせはこちらから。機能のご要望・バグ報告・ご質問をお待ちしています。"
      : "個人運営の研究プロジェクトへのご意見・ご質問・改善提案を受け付けています。",
  }),
  twitter: withSiteTwitter({
    card: "summary",
    title: PAID_MODE ? "お問い合わせ" : "ご意見・改善提案",
    description: PAID_MODE
      ? "安全AIポータルへのお問い合わせはこちらから。"
      : "安全AIポータル（研究プロジェクト）へのご意見・ご質問を受け付けています。",
  }),
};

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="お問い合わせ" description="安全AIポータル へのお問い合わせフォーム。法人案内・取材依頼・OEM/再販相談などをこちらから。" path="/contact" />
      {PAID_MODE ? <ContactForm /> : <InquiryForm />}
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import ContactForm from "./ContactForm";
import InquiryForm from "./InquiryForm";
import { PAID_MODE } from "@/lib/paid-mode";

export const metadata: Metadata = {
  title: PAID_MODE ? "お問い合わせ" : "ご意見・ご質問・改善提案",
  description: PAID_MODE
    ? "ANZEN AIへのお問い合わせはこちらから。機能のご要望・バグ報告・ご質問をお待ちしています。"
    : "ANZEN AI（労働安全 × AI/DX 研究プロジェクト）へのご意見・ご質問・改善提案・データ誤りの指摘を受け付けています。匿名でも投稿できます。",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: PAID_MODE ? "お問い合わせ｜ANZEN AI" : "ご意見・改善提案｜ANZEN AI",
    description: PAID_MODE
      ? "ANZEN AIへのお問い合わせはこちらから。機能のご要望・バグ報告・ご質問をお待ちしています。"
      : "個人運営の研究プロジェクトへのご意見・ご質問・改善提案を受け付けています。",
  },
  twitter: {
    card: "summary",
    title: PAID_MODE ? "お問い合わせ｜ANZEN AI" : "ご意見・改善提案｜ANZEN AI",
    description: PAID_MODE
      ? "ANZEN AIへのお問い合わせはこちらから。"
      : "ANZEN AI（研究プロジェクト）へのご意見・ご質問を受け付けています。",
  },
};

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      {PAID_MODE ? <ContactForm /> : <InquiryForm />}
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: "ANZEN AIへのお問い合わせはこちらから。機能のご要望・バグ報告・ご質問をお待ちしています。",
  openGraph: {
    title: "お問い合わせ｜ANZEN AI",
    description: "ANZEN AIへのお問い合わせはこちらから。機能のご要望・バグ報告・ご質問をお待ちしています。",
  },
};

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      <ContactForm />
    </Suspense>
  );
}

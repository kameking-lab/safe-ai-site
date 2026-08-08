import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import InquiryForm from "./InquiryForm";

const title = "ご意見・ご質問・お問い合わせ";
const description =
  "安全AIポータルのデータ訂正、機能改善、ご質問を受け付ける窓口です。業務自動化・講習・資料作成の相談は保護された専用フォームへ案内します。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  openGraph: withSiteOpenGraph("/contact", { title, description }),
  twitter: withSiteTwitter({ card: "summary", title, description }),
};

function ContactFallback() {
  return (
    <PageContainer width="narrow" className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">お問い合わせ窓口</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">{description}</p>
      </header>
      <p role="status" className="text-sm text-slate-600">
        入力フォームを読み込んでいます。
      </p>
    </PageContainer>
  );
}

export default function ContactPage() {
  return (
    <>
      <PageJsonLd name={title} description={description} path="/contact" />
      <Suspense fallback={<ContactFallback />}>
        <InquiryForm />
      </Suspense>
    </>
  );
}

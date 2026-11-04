import type { Metadata } from "next";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";
import InquiryForm, { type InquiryInitialParams } from "./InquiryForm";

const title = "ご意見・ご質問・お問い合わせ";
const description =
  "安全AIポータルのデータ訂正、機能改善、ご質問を受け付ける窓口です。業務自動化・講習・資料作成の相談は専用ページで受付方法を確認できます。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  openGraph: withSiteOpenGraph("/contact", { title, description }),
  twitter: withSiteTwitter({ card: "summary", title, description }),
};

export default async function ContactPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const initialParams: InquiryInitialParams = {};
  for (const key of ["course", "topic", "tab", "category", "industry"] as const) {
    const raw = query[key];
    // Match URLSearchParams.get(): repeated keys use their first value.
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string") initialParams[key] = value;
  }
  return (
    <>
      <PageJsonLd name={title} description={description} path="/contact" />
      <div data-inquiry-form>
        <InquiryForm key={JSON.stringify(initialParams)} initialParams={initialParams} />
      </div>
      <noscript>
        <style>{`[data-inquiry-form] form, [data-inquiry-form] [role="tablist"] { display: none !important; }`}</style>
        <PageContainer width="narrow" className="space-y-3">
          <p className="text-sm leading-7 text-slate-700">
            フォーム送信にはJavaScriptが必要です。メールでの連絡は、受付方法のページからご利用ください。
          </p>
          <a href="/contact/automation-email" className="inline-flex min-h-11 items-center font-bold text-emerald-800 underline">
            メールでの受付方法を確認する
          </a>
        </PageContainer>
      </noscript>
    </>
  );
}

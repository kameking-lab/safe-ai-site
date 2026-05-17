import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, MessageSquarePlus, BookOpen, Users } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { ogImageUrl } from "@/lib/og-url";
import { PageJsonLd } from "@/components/page-json-ld";

const TITLE = "Q&Aナレッジ — 質問募集中";
const DESCRIPTION =
  "労働安全に関するQ&Aを募集中。現在は /faq の200問FAQを活用ください。実際の質問投稿が集まり次第、ナレッジベースとして順次公開します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/qa-knowledge" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
};

export default function QaKnowledgePage() {
  return (
    <PageContainer width="prose">
      <PageJsonLd name={TITLE} description={DESCRIPTION} path="/qa-knowledge" />
      <header className="mb-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-200">
          <HelpCircle className="h-3.5 w-3.5" />
          Q&Aナレッジ
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          Q&Aナレッジ — 質問募集中
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          現場の疑問・ヒヤリハット・法令解釈など、労働安全に関する質問を募集しています。
          投稿された質問はコンサルタントが回答し、順次ナレッジベースとして公開します。
        </p>
      </header>

      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-700" />
            <div>
              <p className="font-bold text-emerald-900">まずは FAQ 200問をご活用ください</p>
              <p className="mt-1 text-sm text-emerald-800">
                法令・管理体制・化学物質・健康管理の200問を法令根拠付きで解説しています。
              </p>
              <Link
                href="/faq"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                FAQ 200問を見る →
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-700" />
            <div>
              <p className="font-bold text-sky-900">事例・Q&Aを投稿する</p>
              <p className="mt-1 text-sm text-sky-800">
                現場での気づき・ヒヤリハット・法令解釈の疑問などを共有してください。
              </p>
              <Link
                href="/community-cases/submit"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
              >
                <MessageSquarePlus className="h-4 w-4" />
                質問・事例を投稿する
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500">
          Q&Aナレッジベースは投稿が集まり次第、随時公開します。
          現在はコンサルタントが厳選した
          <Link href="/faq" className="mx-1 font-semibold text-emerald-700 hover:underline">
            FAQ 200問
          </Link>
          をご利用ください。
        </div>
      </div>
    </PageContainer>
  );
}

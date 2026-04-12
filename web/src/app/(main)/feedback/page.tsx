import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "フィードバック",
};

const FEEDBACK_FORM_URL = process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL;

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">サイトへのご要望</h1>
        <p className="mt-2 text-sm text-slate-600">
          機能の改善要望・バグ報告・新機能のアイデアなど、お気軽にお聞かせください。
          いただいたご意見はサービス改善に活用いたします。
        </p>
      </div>

      {FEEDBACK_FORM_URL ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <iframe
            src={FEEDBACK_FORM_URL}
            width="100%"
            height="700"
            frameBorder="0"
            marginHeight={0}
            marginWidth={0}
            className="block w-full"
            title="フィードバックフォーム"
          >
            読み込み中…
          </iframe>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-700">ご要望・バグ報告は下記からお送りください。</p>
          <p className="mt-4">
            <a
              href="/contact"
              className="inline-block rounded-xl bg-[#1a7a4c] px-6 py-3 text-sm font-bold text-white hover:bg-[#15633e]"
            >
              お問い合わせフォームへ
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { AutomationConsultCopyButton } from "@/app/(main)/services/automation/AutomationConsultCopyButton";
import {
  AUTOMATION_MAIL_SUBJECT,
  AUTOMATION_MAIL_TEMPLATE,
  getAutomationMailRecipients,
} from "@/lib/automation-consult/mail-draft";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "業務自動化・講習をメールで相談",
  description:
    "安全AIポータルの業務自動化・講習相談を、利用者のメールアプリで作成するための非公開導線です。",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function AutomationEmailContactPage() {
  const mailRecipients = getAutomationMailRecipients();
  const mailReady = mailRecipients !== null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/services/automation"
        prefetch={false}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg font-bold text-emerald-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        自動化例・料金へ戻る
      </Link>

      <article className="mt-5 rounded-3xl border-2 border-emerald-800 bg-white p-5 shadow-sm sm:p-8">
        <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-950">
          {mailReady ? "メール相談受付中" : "受付停止中"}
        </p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          メールアプリで相談文を作成
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
          ボタンを押すと、お使いのメールアプリで定型の相談文を作成します。相談者が内容を編集し、宛先と本文を確認してから送信してください。
        </p>

        <aside className="mt-6 rounded-2xl border border-amber-500 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <h2 className="flex items-center gap-2 font-black">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            送信前の注意
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>個人情報、健康情報、会社・現場の機密、認証情報は記入しないでください。</li>
            <li>最初のメールへファイルを添付しないでください。</li>
            <li>相談本文は、このサイトのフォーム、analytics、RUM、生成AIへ送信しません。</li>
          </ul>
        </aside>

        {mailReady ? (
          <form
            method="post"
            action="/contact/automation-email/draft"
            className="mt-6"
          >
            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30 sm:w-auto"
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
              メールで相談する
            </button>
          </form>
        ) : (
          <p role="status" className="mt-6 rounded-xl border border-slate-400 bg-slate-100 p-4 font-bold text-slate-800">
            現在、メール相談を開始できません。料金と自動化例は引き続き確認できます。
          </p>
        )}

        <section aria-labelledby="mail-template-title" className="mt-8 border-t border-slate-200 pt-6">
          <h2 id="mail-template-title" className="text-xl font-black text-slate-950">
            メールアプリが開かない場合
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            宛先・件名・本文を選択して、普段使っているメールアプリへ貼り付けてください。JavaScriptが無効でも各項目を選択できます。
          </p>
          {mailRecipients ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-black text-slate-950">宛先</dt>
                <dd className="mt-1">
                  <input
                    aria-label="コピー用の宛先"
                    type="email"
                    readOnly
                    value={mailRecipients.to}
                    autoComplete="off"
                    spellCheck={false}
                    className="min-h-11 w-full rounded-xl border border-slate-400 bg-slate-50 px-3 font-mono text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-black text-slate-950">件名</dt>
                <dd className="mt-1">
                  <input
                    aria-label="コピー用の件名"
                    type="text"
                    readOnly
                    value={AUTOMATION_MAIL_SUBJECT}
                    autoComplete="off"
                    spellCheck={false}
                    className="min-h-11 w-full rounded-xl border border-slate-400 bg-slate-50 px-3 text-sm text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  />
                </dd>
              </div>
            </dl>
          ) : (
            <p role="status" className="mt-4 rounded-xl border border-slate-400 bg-slate-100 p-3 text-sm font-bold text-slate-800">
              受付停止中のため宛先は表示していません。受付再開後にこの画面で確認できます。
            </p>
          )}
          <textarea
            aria-label="コピー用の相談テンプレート"
            readOnly
            value={AUTOMATION_MAIL_TEMPLATE}
            rows={18}
            className="mt-3 w-full rounded-xl border border-slate-400 bg-slate-50 p-3 font-mono text-sm leading-6 text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          />
          <AutomationConsultCopyButton template={AUTOMATION_MAIL_TEMPLATE} />
          <noscript>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              上の宛先・件名・本文を選択し、端末のコピー操作をご利用ください。
            </p>
          </noscript>
        </section>
      </article>
    </div>
  );
}

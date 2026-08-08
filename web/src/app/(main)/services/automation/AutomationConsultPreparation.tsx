import Link from "next/link";
import { Mail } from "lucide-react";
import { AUTOMATION_MAIL_TEMPLATE } from "@/lib/automation-consult/mail-draft";
import { AutomationConsultCopyButton } from "./AutomationConsultCopyButton";

export function AutomationConsultPreparation({
  mailAvailable,
}: {
  mailAvailable: boolean;
}) {
  return (
    <div className="mt-5">
      <div
        role="status"
        data-mail-consult-state={mailAvailable ? "available" : "stopped"}
        className="text-sm font-bold text-slate-800"
      >
        {mailAvailable
          ? "利用者のメールアプリから送信します。Webフォームへ相談本文を入力する方式ではありません。"
          : "受付停止中"}
      </div>

      {mailAvailable ? (
        <>
          <form
            method="post"
            action="/contact/automation-email/draft"
            className="mt-3"
          >
            <button
              type="submit"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-5 py-3 font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30 sm:w-auto"
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
              メールで相談する
            </button>
          </form>
          <details className="mt-4 rounded-xl border border-slate-300 px-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-bold text-slate-900">
              相談文テンプレートを使う
            </summary>
            <div className="pb-4">
              <p className="text-sm leading-6 text-slate-700">
                個人情報・健康情報・機密・認証情報は記入せず、最初のメールへファイルを添付しないでください。
              </p>
              <textarea
                aria-label="コピー用の相談テンプレート"
                readOnly
                value={AUTOMATION_MAIL_TEMPLATE}
                rows={12}
                className="mt-3 w-full rounded-xl border border-slate-400 bg-slate-50 p-3 font-mono text-sm leading-6 text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              />
              <AutomationConsultCopyButton
                template={AUTOMATION_MAIL_TEMPLATE}
                label="相談内容をコピーする"
              />
              <noscript>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  上の定型文を選択して端末のコピー操作をご利用ください。
                </p>
              </noscript>
            </div>
          </details>
        </>
      ) : (
        <Link
          href="#pricing"
          className="mt-3 inline-flex min-h-11 items-center font-bold text-emerald-900 underline underline-offset-4"
        >
          料金を見る
        </Link>
      )}
    </div>
  );
}

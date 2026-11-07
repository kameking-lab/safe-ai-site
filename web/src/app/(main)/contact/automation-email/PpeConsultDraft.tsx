"use client";

import { useEffect, useState } from "react";
import { consumePpeConsultDraft } from "@/lib/ppe-consult-draft";

export function PpeConsultDraft({
  recipient,
  subject,
  template,
}: {
  recipient: string | null;
  subject: string;
  template: string;
}) {
  const [body, setBody] = useState(template);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      const draft = consumePpeConsultDraft();
      if (draft) setBody(draft);
      setReady(true);
    });
  }, []);

  const mailto = recipient
    ? `mailto:${encodeURIComponent(recipient)}?${new URLSearchParams({ subject, body })}`
    : null;

  return (
    <section aria-labelledby="ppe-draft-title" className="mt-6 border-t border-slate-200 pt-6">
      <h2 id="ppe-draft-title" className="text-xl font-black text-slate-950">相談文の下書き</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        選んだ作業と未確認点を端末内で下書きに反映します。内容を編集・確認してからメールアプリを開いてください。ここで入力した内容はサイトへ送信しません。
      </p>
      <label htmlFor="ppe-consult-body" className="mt-4 block text-sm font-bold text-slate-950">{ready ? "相談文（編集できます）" : "相談文（準備中）"}</label>
      <textarea
        id="ppe-consult-body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        disabled={!ready}
        rows={18}
        autoComplete="off"
        className="mt-2 w-full rounded-xl border border-slate-400 bg-white p-3 text-sm leading-6 text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
      />
      <p className="mt-2 text-sm leading-6 text-amber-950">個人情報・社名・現場の機密・認証情報を含めないでください。メールアプリで宛先と本文を再確認し、自分で送信してください。</p>
      {!mailto && <p role="status" className="mt-3 text-sm font-bold text-slate-800">現在はメール相談の宛先を表示できません。下書きの編集は端末内で続けられます。</p>}
      {!ready && <div className="mt-4 rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
        <p className="font-bold">JavaScriptを利用できない場合は、下の宛先・件名・ひな形をコピーし、メールアプリで編集してください。</p>
        {recipient && <label className="mt-3 block">宛先<input readOnly value={recipient} className="mt-1 block w-full rounded-lg border border-slate-400 bg-white p-2" /></label>}
        <label className="mt-3 block">件名<input readOnly value={subject} className="mt-1 block w-full rounded-lg border border-slate-400 bg-white p-2" /></label>
        <label className="mt-3 block">相談文のひな形<textarea readOnly value={template} rows={8} className="mt-1 block w-full rounded-lg border border-slate-400 bg-white p-2" /></label>
      </div>}
      {ready && mailto && <a
        href={mailto}
        className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 font-black text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30"
      >
        内容を確認してメールアプリを開く
      </a>}
    </section>
  );
}

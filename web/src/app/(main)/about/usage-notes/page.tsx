import type { Metadata } from "next";
import Link from "next/link";

const TITLE = "ご利用上の注意";
const DESCRIPTION =
  "安全AIポータルで法令、気象、化学物質、KY、教育、自動化相談を利用する際の注意事項です。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about/usage-notes" },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
      noarchive: true,
    },
  },
};

const NOTES = [
  {
    title: "緊急時",
    body: "人命に関わる事故や急病は119へ連絡し、現場の緊急手順に従ってください。",
  },
  {
    title: "法令情報",
    body: "回答は作業条件で変わります。条文番号、施行日、対象設備を確認し、最終判断は公式原文や所管機関で確認してください。",
  },
  {
    title: "AI",
    body: "AIの回答は公式見解や法的助言ではありません。根拠が不足する場合は回答を保留します。",
  },
  {
    title: "個人情報",
    body: "氏名、会社名、現場名、連絡先、健康情報は入力しないでください。検出した場合は送信を止めます。",
  },
  {
    title: "気象・WBGT",
    body: "表示値は取得時刻と実測・推定の別を確認してください。取得できない時や情報が古い時は、公式情報と現場の測定値を確認してください。",
  },
  {
    title: "化学物質",
    body: "物質名、CAS番号、SDS記載名、含有率を照合してください。候補が複数ある場合は自動で確定しません。",
  },
  {
    title: "KY・帳票",
    body: "候補は現場確認前の下書きです。設備、作業手順、周囲の状況を確認してから共有・印刷してください。",
  },
  {
    title: "教育・資格",
    body: "教材や資格案内は学習と確認の補助です。受講要件や資格区分は実施機関と公式情報で確認してください。",
  },
  {
    title: "データ更新",
    body: "画面の対象日と取得時刻を確認してください。事故の編集事例や学習例は出典区分を確認してください。取得できない状態を、警報なし・該当なし・安全とは表示しません。",
  },
  {
    title: "自動化相談",
    body: "受付方法と現在の受付状態は自動化相談ページに表示します。受付停止中は送信できません。",
  },
] as const;

export default function UsageNotesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="パンくず" className="text-sm text-portal-muted">
        <Link href="/" prefetch={false} className="underline underline-offset-4">
          ホーム
        </Link>{" "}
        / ご利用上の注意
      </nav>
      <header className="mt-3">
        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {TITLE}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
          必要な確認先と、入力・判断時の注意をまとめています。
        </p>
      </header>

      <div className="mt-7 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5 sm:px-7">
        {NOTES.map((note) => (
          <section key={note.title} className="py-5" aria-labelledby={`note-${note.title}`}>
            <h2 id={`note-${note.title}`} className="text-lg font-black text-slate-950">
              {note.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">{note.body}</p>
          </section>
        ))}
      </div>

      <nav aria-label="関連情報" className="mt-6 flex flex-wrap gap-x-5 gap-y-1">
        <Link href="/about/data-sources" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">
          データの出典
        </Link>
        <Link href="/about/quality" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">
          情報品質
        </Link>
        <Link href="/privacy" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4">
          プライバシー
        </Link>
      </nav>
    </div>
  );
}

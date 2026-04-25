import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "共有チャット | ANZEN AI 安衛法チャットボット",
  description: "ANZEN AI の安衛法チャットボットで行われた会話の共有ビューです。",
  robots: { index: false, follow: false },
};

type SharedMessage = {
  r: "u" | "a";
  c: string;
  s?: { l: string; a: string }[];
};

const MAX_SHARE_ID_BYTES = 16 * 1024;
const MAX_MESSAGES = 200;
const MAX_MESSAGE_LEN = 8000;
const MAX_SOURCES_PER_MESSAGE = 20;

function decodeShare(id: string): SharedMessage[] | null {
  if (id.length > MAX_SHARE_ID_BYTES) return null;
  try {
    const binary = atob(id);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length > MAX_MESSAGES) return null;
    const messages: SharedMessage[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") return null;
      const m = item as Record<string, unknown>;
      const r = m.r;
      const c = m.c;
      if (r !== "u" && r !== "a") return null;
      if (typeof c !== "string" || c.length > MAX_MESSAGE_LEN) return null;
      const result: SharedMessage = { r, c };
      if (Array.isArray(m.s)) {
        if (m.s.length > MAX_SOURCES_PER_MESSAGE) return null;
        const sources: { l: string; a: string }[] = [];
        for (const src of m.s) {
          if (!src || typeof src !== "object") return null;
          const s = src as Record<string, unknown>;
          if (typeof s.l !== "string" || typeof s.a !== "string") return null;
          if (s.l.length > 200 || s.a.length > 2000) return null;
          sources.push({ l: s.l, a: s.a });
        }
        result.s = sources;
      }
      messages.push(result);
    }
    return messages;
  } catch {
    return null;
  }
}

export default async function ChatSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const messages = decodeShare(id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-900">共有された会話</h1>
          <p className="text-xs text-slate-500 mt-0.5">ANZEN AI 安衛法チャットボット</p>
        </div>
        <Link
          href="/chatbot"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          自分でも質問する →
        </Link>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 mb-4">
        <p className="text-xs text-amber-800">
          ⚠ これは共有された会話の閲覧ビューです。回答は法的助言ではありません。
        </p>
      </div>

      {!messages || messages.length === 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700 font-semibold">共有URLが無効または期限切れです</p>
          <p className="mt-1 text-xs text-red-600">URLが正しいか確認してください。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i}>
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-6 ${
                  msg.r === "u"
                    ? "ml-auto bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.c}</p>
              </div>
              {msg.s && msg.s.length > 0 && (
                <div className="mt-2 max-w-[88%] space-y-1">
                  {msg.s.map((src, j) => (
                    <div key={j} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                      <span className="font-semibold text-blue-700">{src.l}</span> {src.a}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/chatbot" className="text-sm text-blue-600 underline hover:text-blue-800">
          安衛法チャットボットを開く
        </Link>
      </div>
    </main>
  );
}

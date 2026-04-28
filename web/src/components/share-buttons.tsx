"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Share2, Linkedin, Facebook, Link2, Check, MessageSquare } from "lucide-react";
import { SITE_STATS } from "@/data/site-stats";

const SUPPORT_TEMPLATE = `ANZEN AI を応援しています。労働安全衛生分野の AI・DX 研究プロジェクトで、通達 ${SITE_STATS.lawArticleCount} 条文・事故DB ${SITE_STATS.accidentDbCount} 件・化学物質情報を一次ソース付きで無料公開しています。`;

type ShareButtonsProps = {
  /** シェア対象のテキスト（記事タイトル・AI応答要約・KY結果サマリー等） */
  title?: string;
  /** 機能別シェア時に追加する文脈ハッシュタグ（例: ["AI応答", "労働安全"]） */
  hashtags?: string[];
  /** 画面右下に固定表示するか（true=固定バー、false=インライン） */
  fixed?: boolean;
};

function buildAbsoluteUrl(pathname: string): string {
  if (typeof window === "undefined") {
    return `https://safe-ai-site.vercel.app${pathname}`;
  }
  return `${window.location.origin}${pathname}${window.location.search}`;
}

export function ShareButtons({ title, hashtags, fixed = true }: ShareButtonsProps) {
  const pathname = usePathname() ?? "/";
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const text = title ? `${title} | ANZEN AI` : SUPPORT_TEMPLATE;
  const tags = (hashtags ?? ["ANZENAI", "労働安全", "DX"]).map((t) => t.replace(/^#/, ""));
  const url = buildAbsoluteUrl(pathname);
  const tagStr = tags.map((t) => `#${t}`).join(" ");

  const links = {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} ${tagStr}`)}&url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    threads: `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    note: `https://note.com/intent/post?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  } as const;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  }

  // 固定モード: モバイルはボトムシート風（下端固定）、PCは右下固定
  if (fixed) {
    if (!mounted) return null;
    return (
      <>
        {/* トグルボタン */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "シェアメニューを閉じる" : "シェアメニューを開く"}
          className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 sm:bottom-6 sm:right-6"
        >
          <Share2 className="h-5 w-5" />
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label="シェアメニュー"
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-slate-200 bg-white p-4 shadow-2xl sm:inset-x-auto sm:bottom-20 sm:right-6 sm:w-72 sm:rounded-2xl sm:border"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">シェアして応援する</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <ShareGrid links={links} onCopy={copyUrl} copied={copied} />
            <p className="mt-3 text-[11px] text-slate-500">
              応援テンプレ：「{SUPPORT_TEMPLATE.slice(0, 60)}…」
            </p>
          </div>
        ) : null}
      </>
    );
  }

  // インラインモード（個別機能の出力に挿入）
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <Share2 className="h-3.5 w-3.5" /> シェア
      </p>
      <ShareGrid links={links} onCopy={copyUrl} copied={copied} />
    </div>
  );
}

function ShareGrid({
  links,
  onCopy,
  copied,
}: {
  links: Record<"x" | "linkedin" | "threads" | "facebook" | "note", string>;
  onCopy: () => void;
  copied: boolean;
}) {
  const itemClass =
    "flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-700 hover:border-emerald-400 hover:bg-emerald-50";
  return (
    <div className="grid grid-cols-3 gap-2">
      <a href={links.x} target="_blank" rel="noopener noreferrer" className={itemClass} aria-label="X (Twitter) でシェア">
        <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-slate-900 text-[10px] font-extrabold text-white">
          X
        </span>
        X
      </a>
      <a
        href={links.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClass}
        aria-label="LinkedIn でシェア"
      >
        <Linkedin className="h-4 w-4 text-[#0a66c2]" /> LinkedIn
      </a>
      <a
        href={links.threads}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClass}
        aria-label="Threads でシェア"
      >
        <MessageSquare className="h-4 w-4" /> Threads
      </a>
      <a
        href={links.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClass}
        aria-label="Facebook でシェア"
      >
        <Facebook className="h-4 w-4 text-[#1877f2]" /> Facebook
      </a>
      <a
        href={links.note}
        target="_blank"
        rel="noopener noreferrer"
        className={itemClass}
        aria-label="note でシェア"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700 text-[8px] font-bold text-white">
          n
        </span>
        note
      </a>
      <button type="button" onClick={onCopy} className={itemClass} aria-label="URLをコピー">
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4" />}
        {copied ? "コピー済" : "URLコピー"}
      </button>
    </div>
  );
}

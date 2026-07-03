"use client";

import { useEffect, useState } from "react";
import { Link2, Download, Copy, Check, HelpCircle } from "lucide-react";
import type { MeetingContractorRow } from "@/lib/meeting/schema";
import { mergeContributionsIntoContractors } from "@/lib/meeting/distributed";
import { isMeetingCloudEnabled, cloudCreateMeetingShare, cloudFetchMeetingContributions } from "@/lib/meeting/cloud";

// 初見ガイドの既読フラグ（一度×で恒久非表示）。KY/打合せ書の初見ガイドと同方針。
const GUIDE_KEY = "safe-ai:meeting-distributed-guide-dismissed:v1";

/**
 * 元請UI: 「協力会社に入力を依頼（共有リンク発行）」＋「協力会社の入力を取り込む（自動集約）」。
 * クラウド未設定時は、その旨だけ表示（既存機能は壊さない）。印刷物には出さない（print:hidden）。
 */
export function DistributedInputBar(props: {
  meetingId: string;
  siteName: string;
  workDate: string;
  contractors: MeetingContractorRow[];
  onImport: (merged: MeetingContractorRow[]) => void;
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "share" | "import">("");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // 初見ガイド（多者間フローが非自明なので、初回だけ手順を提示。×で恒久非表示）
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- マウント直後の一度きりのlocalStorage hydration
      if (localStorage.getItem(GUIDE_KEY) !== "1") setGuideOpen(true);
    } catch { /* localStorage不可 */ }
  }, []);
  const dismissGuide = () => {
    setGuideOpen(false);
    try { localStorage.setItem(GUIDE_KEY, "1"); } catch { /* 無視 */ }
  };

  if (!isMeetingCloudEnabled()) {
    return (
      <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 print:hidden">
        💡 協力会社による分散入力（共有リンクで各社が自社分を入力→自動集約）は、クラウド設定時に有効になります。
      </div>
    );
  }

  const onShare = async () => {
    setBusy("share"); setMsg(null);
    const token = await cloudCreateMeetingShare(props.meetingId, props.siteName, props.workDate);
    setBusy("");
    if (!token) { setMsg("共有リンクの発行に失敗しました。時間をおいて再度お試しください。"); return; }
    const url = `${window.location.origin}/safety-diary/contribute/${token}`;
    setShareUrl(url);
    setMsg("共有リンクを発行しました。各協力会社にLINE等で送ってください。");
  };

  const onImport = async () => {
    setBusy("import"); setMsg(null);
    const contribs = await cloudFetchMeetingContributions(props.meetingId);
    setBusy("");
    if (contribs === null) { setMsg("取り込みに失敗しました。"); return; }
    if (contribs.length === 0) { setMsg("まだ協力会社の入力はありません。"); return; }
    const merged = mergeContributionsIntoContractors(props.contractors, contribs);
    props.onImport(merged);
    setMsg(`${contribs.length}社の入力を取り込みました（当日欄・追記は保持）。`);
  };

  const copy = async () => {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
  };

  return (
    <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 print:hidden">
      {guideOpen ? (
        <div className="mb-2 rounded-md border border-emerald-300 bg-white p-2.5">
          <div className="flex items-start gap-1.5">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div className="flex-1 text-[11px] leading-5 text-slate-700">
              <p className="font-bold text-emerald-900">協力会社の入力を、各社のスマホから集める使い方</p>
              <ol className="mt-0.5 list-decimal pl-4">
                <li><span className="font-semibold">「協力会社に入力を依頼」</span>で共有リンクを発行</li>
                <li>そのリンクを各協力会社に <span className="font-semibold">LINE等で送る</span>（相手はログイン不要・リンクが鍵）</li>
                <li>各社が自分のスマホで<span className="font-semibold">自社分だけ入力</span>（他社の入力は見えません）</li>
                <li><span className="font-semibold">「協力会社の入力を取り込む」</span>で各社の入力をこの打合せ書に自動集約→確認・確定・印刷</li>
              </ol>
              <p className="mt-0.5 text-[10px] text-slate-500">毎日の重層下請の集約（各社へ電話/転記）が、リンク1本で済みます。当日欄・追記は元請のまま保持されます。</p>
            </div>
            <button type="button" onClick={dismissGuide} aria-label="使い方を閉じる" className="shrink-0 rounded px-1 text-[11px] font-bold text-slate-400 hover:text-slate-600">×</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setGuideOpen(true)} className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:underline">
          <HelpCircle className="h-3 w-3" aria-hidden="true" /> 分散入力の使い方
        </button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-emerald-800">協力会社 分散入力</span>
        <button type="button" onClick={() => void onShare()} disabled={busy !== ""}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
          <Link2 className="h-3 w-3" /> {busy === "share" ? "発行中…" : "協力会社に入力を依頼"}
        </button>
        <button type="button" onClick={() => void onImport()} disabled={busy !== ""}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
          <Download className="h-3 w-3" /> {busy === "import" ? "取り込み中…" : "協力会社の入力を取り込む"}
        </button>
      </div>
      {shareUrl && (
        <div className="mt-2 flex items-center gap-2">
          <input readOnly value={shareUrl} className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" onClick={() => void copy()} className="inline-flex min-h-[44px] items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />} {copied ? "コピー済" : "コピー"}
          </button>
        </div>
      )}
      {msg && <p className="mt-1 text-[11px] text-emerald-700">{msg}</p>}
    </div>
  );
}

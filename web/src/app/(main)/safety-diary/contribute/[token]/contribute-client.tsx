"use client";

import { useEffect, useState } from "react";
import { CONTRACTOR_TYPES, type ContractorType } from "@/lib/meeting/schema";
import type { ContributionPayload } from "@/lib/meeting/distributed";
import { fetchContributeContext, submitContribution, revertContribution } from "@/lib/meeting/cloud";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";

const CID_KEY = (token: string) => `safe-ai:meeting-contrib-cid:${token}`;
const emptyPayload = (): ContributionPayload => ({
  companyName: "",
  type: "1次",
  workContent: "",
  machines: "",
  qualifications: [],
  plannedCount: "",
  predictedDisasters: [],
  risk: { severity: 1, likelihood: 1, priority: 1 },
  safetyInstructions: "",
  responsibleName: "",
});

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

export function ContributeClient({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "ok" | "invalid">("loading");
  const [ctx, setCtx] = useState<{ siteName: string; workDate: string }>({ siteName: "", workDate: "" });
  const [p, setP] = useState<ContributionPayload>(emptyPayload());
  const [cid, setCid] = useState<string | null>(null);
  const [base, setBase] = useState<string | undefined>(undefined); // 楽観ロックの基準(submittedAt)
  const [historyCount, setHistoryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const reload = (storedCid: string | null) =>
    fetchContributeContext(token, storedCid ?? undefined).then((res) => {
      if (!res) { setState("invalid"); return null; }
      setCtx(res.context);
      if (res.mine) {
        setCid(res.mine.contributionId);
        setBase(res.mine.submittedAt);
        setHistoryCount(res.historyCount);
        setP({ ...emptyPayload(), ...res.mine.payload });
      } else if (storedCid) {
        setCid(storedCid);
      }
      setState("ok");
      return res;
    });

  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(CID_KEY(token)); } catch { /* noop */ }
    void reload(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const patch = (over: Partial<ContributionPayload>) => setP((prev) => ({ ...prev, ...over }));

  const onSubmit = async () => {
    if (!p.companyName.trim()) return;
    setSaving(true);
    const res = await submitContribution(token, p, { cid: cid ?? undefined, baseSubmittedAt: base });
    setSaving(false);
    if (res.ok) {
      setCid(res.contributionId);
      setBase(res.submittedAt);
      setHistoryCount((n) => n + 1);
      try { localStorage.setItem(CID_KEY(token), res.contributionId); } catch { /* noop */ }
      setDone(true);
    } else if (res.reason === "conflict") {
      // 他端末で更新済み。黙って上書きせず、最新を読み直してから再編集を促す。
      await reload(cid);
      setState("ok");
      window.alert("この入力は別の端末で更新されていました。最新の内容を読み込みました。必要なら編集して再送信してください。");
    } else {
      window.alert("送信に失敗しました。時間をおいて再度お試しください。");
    }
  };

  const onRevert = async () => {
    if (!cid) return;
    if (!window.confirm("一つ前の入力内容に戻します。よろしいですか？")) return;
    setSaving(true);
    const r = await revertContribution(token, cid);
    setSaving(false);
    if (r.ok) { await reload(cid); window.alert("一つ前の内容に戻しました。"); }
    else if (r.reason === "no_previous") window.alert("戻せる履歴がありません（これが最初の入力です）。");
    else window.alert("復元に失敗しました。");
  };

  if (state === "loading") {
    return <div className="mx-auto max-w-xl px-4 py-10 text-sm text-slate-500">読み込み中…</div>;
  }
  if (state === "invalid") {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-lg font-bold text-slate-900">リンクが無効です</h1>
        <p className="mt-2 text-sm text-slate-600">
          共有リンクが正しくないか、有効期限が切れています。元請の担当者に最新のリンクの再発行をご依頼ください。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-lg font-bold text-slate-900">協力会社 入力フォーム</h1>

      {/* 結論カード（柱0）: いまの状態＝未送信/編集中/送信済みを3秒で。 */}
      <div className="mt-3">
        <ConclusionCard
          tone={done ? "safe" : "info"}
          title={done ? "送信済み" : cid ? "編集中（送信済みあり）" : "未送信"}
          description={
            done
              ? "元請の画面に自動集約されました。修正があれば続けて編集し、再送信してください。"
              : cid
                ? "前回の送信内容を編集できます。修正のうえ再送信してください。"
                : "自社分の内容を入力し、送信してください。送信すると元請の画面に自動で集約されます。"
          }
        >
          <StatusBadge tone="neutral" size="sm">現場: {ctx.siteName || "（未設定）"}</StatusBadge>
          <StatusBadge tone="neutral" size="sm">作業日: {ctx.workDate || "（未設定）"}</StatusBadge>
          {cid && <StatusBadge tone="info" size="sm">この端末は編集者として登録済み</StatusBadge>}
        </ConclusionCard>
      </div>

      {done ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="text-xs">このリンクを再度開いて編集・再送信できます（この端末で開けば前回内容が復元されます）。</p>
          <button type="button" onClick={() => setDone(false)} className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700">続けて編集する</button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block"><span className="text-xs font-semibold text-slate-700">会社名 *</span>
            <input className={inp} value={p.companyName} onChange={(e) => patch({ companyName: e.target.value })} placeholder="例: ○○建設" /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-700">区分</span>
            <select className={inp} value={p.type} onChange={(e) => patch({ type: e.target.value as ContractorType })}>
              {CONTRACTOR_TYPES.filter((t) => t !== "元請").map((t) => <option key={t} value={t}>{t}</option>)}
            </select></label>
          <label className="block"><span className="text-xs font-semibold text-slate-700">作業内容</span>
            <textarea className={inp} rows={2} value={p.workContent} onChange={(e) => patch({ workContent: e.target.value })} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-700">使用機械（カンマ区切り）</span>
            <input className={inp} value={p.machines} onChange={(e) => patch({ machines: e.target.value })} placeholder="例: バックホウ, 移動式クレーン" /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-700">予想される災害（カンマ区切り）</span>
            <input className={inp} value={p.predictedDisasters.join(", ")} onChange={(e) => patch({ predictedDisasters: e.target.value.split(/[,、]/).map((s) => s.trim()).filter(Boolean) })} placeholder="例: 墜落, はさまれ" /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="text-xs font-semibold text-slate-700">予定人員</span>
              <input className={inp} value={p.plannedCount} onChange={(e) => patch({ plannedCount: e.target.value })} placeholder="例: 5" /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-700">責任者</span>
              <input className={inp} value={p.responsibleName} onChange={(e) => patch({ responsibleName: e.target.value })} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="text-xs font-semibold text-slate-700">重大性(1-3)</span>
              <select className={inp} value={p.risk.severity} onChange={(e) => patch({ risk: { ...p.risk, severity: Number(e.target.value) } })}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            <label className="block"><span className="text-xs font-semibold text-slate-700">可能性(1-3)</span>
              <select className={inp} value={p.risk.likelihood} onChange={(e) => patch({ risk: { ...p.risk, likelihood: Number(e.target.value) } })}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          </div>
          <label className="block"><span className="text-xs font-semibold text-slate-700">安全対策・指示事項</span>
            <textarea className={inp} rows={2} value={p.safetyInstructions} onChange={(e) => patch({ safetyInstructions: e.target.value })} /></label>
          <button type="button" disabled={saving || !p.companyName.trim()} onClick={() => void onSubmit()}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "送信中…" : cid ? "内容を更新して再送信" : "この内容で送信（元請に集約）"}
          </button>
          {cid && historyCount > 1 && (
            <button type="button" disabled={saving} onClick={() => void onRevert()}
              className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              ↩ 一つ前の入力内容に戻す（履歴は30日保持）
            </button>
          )}
          <p className="text-center text-[11px] text-slate-400">入力は元請の打合せ書にのみ反映されます。他社の入力は見えません。入力履歴は30日間保持され、自動で消えます。</p>
        </div>
      )}
    </div>
  );
}

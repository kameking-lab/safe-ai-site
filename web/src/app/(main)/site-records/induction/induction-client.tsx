"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Printer,
  Download,
  Save,
  FilePlus2,
  FolderOpen,
  CheckSquare,
  UserPlus,
} from "lucide-react";
import {
  getInductionList,
  getInductionById,
  getAllInductionFull,
  saveInduction,
  deleteInduction,
  defaultInductionItems,
  rosterToCsv,
  buildRoster,
  distinctSites,
  distinctMonths,
  rosterFileName,
  newInductionId,
  type InductionCheckItem,
  type InductionRecord,
  type InductionSummary,
} from "@/lib/site-records/induction-store";
import { countInductionRemaining, inductionConclusion } from "@/lib/site-records/record-conclusions";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { SAFETY_TONE, type SafetyTone } from "@/lib/design/safety-tone";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function InductionClient() {
  const [recId, setRecId] = useState("");
  const [date, setDate] = useState("");
  const [siteName, setSiteName] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [company, setCompany] = useState("");
  const [trade, setTrade] = useState("");
  const [educator, setEducator] = useState("");
  const [items, setItems] = useState<InductionCheckItem[]>([]);
  const [note, setNote] = useState("");
  const [confirmedWorker, setConfirmedWorker] = useState(false);
  const [confirmedEducator, setConfirmedEducator] = useState(false);
  const [list, setList] = useState<InductionSummary[]>([]);
  const [savedNote, setSavedNote] = useState("");
  const [savedTone, setSavedTone] = useState<SafetyTone>("safe");
  // 名簿CSVの本社月次提出用フィルタ（現場・月）。
  const [rosterSite, setRosterSite] = useState("");
  const [rosterMonth, setRosterMonth] = useState("");

  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの既定値（SSRハイドレーション差異回避）
    setRecId(newInductionId());
    setDate(today);
    setItems(defaultInductionItems());
    setList(getInductionList());
  }, []);

  const doneCount = useMemo(() => items.filter((i) => i.checked).length, [items]);
  // 記入のこり（KY用紙と同じ文法）: 氏名＋未チェック項目＋実施者/本人の確認
  const remaining = useMemo(
    () => countInductionRemaining({ workerName, items, confirmedWorker, confirmedEducator }),
    [workerName, items, confirmedWorker, confirmedEducator],
  );
  // 名簿CSVフィルタの選択肢（保存一覧から現場・月を抽出）。
  const rosterSites = useMemo(() => distinctSites(list), [list]);
  const rosterMonths = useMemo(() => distinctMonths(list), [list]);
  const rosterCount = useMemo(
    () =>
      list.filter(
        (s) =>
          (rosterSite ? s.siteName.trim() === rosterSite : true) &&
          (rosterMonth ? s.date.slice(0, 7) === rosterMonth : true),
      ).length,
    [list, rosterSite, rosterMonth],
  );

  function toggleItem(key: string) {
    setItems((arr) => arr.map((i) => (i.key === key ? { ...i, checked: !i.checked } : i)));
    setSavedNote("");
  }

  function checkAll(v: boolean) {
    setItems((arr) => arr.map((i) => ({ ...i, checked: v })));
    setSavedNote("");
  }

  function buildRecord(): InductionRecord {
    return {
      id: recId,
      date,
      siteName: siteName.trim(),
      workerName: workerName.trim(),
      company: company.trim(),
      trade: trade.trim(),
      educator: educator.trim(),
      items,
      note: note.trim(),
      confirmedWorker,
      confirmedEducator,
      savedAt: new Date().toISOString(),
    };
  }

  function handleSave() {
    if (!workerName.trim()) {
      setSavedTone("danger");
      setSavedNote("新規入場者の氏名を入力してください。");
      return;
    }
    setList(saveInduction(buildRecord()));
    setSavedTone("safe");
    setSavedNote("この端末に保存しました。");
  }

  function handleSaveAndNextWorker() {
    if (!workerName.trim()) {
      setSavedTone("danger");
      setSavedNote("新規入場者の氏名を入力してください。");
      return;
    }
    // 現在の入場者を保存してから、同じ現場・実施者・実施日・教育項目を引き継いで次の人へ。
    // 1回の受入教育で入場した複数名を記録する現場の標準フローを1タップで回す。
    setList(saveInduction(buildRecord()));
    setRecId(newInductionId());
    setWorkerName("");
    setCompany("");
    setTrade("");
    setNote("");
    setConfirmedWorker(false);
    setConfirmedEducator(false);
    setSavedTone("safe");
    setSavedNote("保存しました。同じ現場・実施者で次の入場者を記録できます。");
  }

  function handleNew() {
    const now = new Date();
    setRecId(newInductionId());
    setDate(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`);
    setSiteName("");
    setWorkerName("");
    setCompany("");
    setTrade("");
    setEducator("");
    setItems(defaultInductionItems());
    setNote("");
    setConfirmedWorker(false);
    setConfirmedEducator(false);
    setSavedNote("");
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleRosterCsv() {
    if (typeof window === "undefined") return;
    const all = getAllInductionFull();
    if (all.length === 0) {
      setSavedTone("danger");
      setSavedNote("CSV出力する保存済み記録がありません。先に保存してください。");
      return;
    }
    // 現場・月で絞り込み、本社提出向けに「現場→実施日昇順」で並べる。
    const filter = { site: rosterSite, month: rosterMonth };
    const target = buildRoster(all, filter);
    if (target.length === 0) {
      setSavedTone("danger");
      setSavedNote("選んだ現場・月に該当する記録がありません。条件を変えてください。");
      return;
    }
    const csv = rosterToCsv(target);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = rosterFileName(filter);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    const where = [rosterMonth || "全期間", rosterSite || "全現場"].join("／");
    setSavedTone("safe");
    setSavedNote(`名簿CSVを出力しました（${where}・${target.length}名）。`);
  }

  function openSaved(id: string) {
    const r = getInductionById(id);
    if (!r) return;
    setRecId(r.id);
    setDate(r.date);
    setSiteName(r.siteName);
    setWorkerName(r.workerName);
    setCompany(r.company);
    setTrade(r.trade);
    setEducator(r.educator);
    setItems(r.items);
    setNote(r.note);
    setConfirmedWorker(r.confirmedWorker);
    setConfirmedEducator(r.confirmedEducator);
    setSavedTone("safe");
    setSavedNote("保存済みの記録を開きました。");
  }

  function deleteSaved(id: string) {
    if (typeof window !== "undefined" && !window.confirm("この記録を削除します。よろしいですか？")) return;
    setList(deleteInduction(id));
  }

  return (
    <div className="space-y-6">
      {/* 結論カード（柱0）: KY用紙と同じ「記入のこりN（青）→ 記入完了（緑）」。
          印刷帳票（正式書式）には載せない */}
      {date !== "" && (
        <ConclusionCard {...inductionConclusion(remaining)} className="print:hidden" />
      )}

      {/* 印刷時のみの帳票タイトル（元請・監督署へ提出する書類として何の記録かを明示） */}
      <div className="hidden text-center print:block">
        <h1 className="text-black">新規入場者 受入教育 実施記録</h1>
        <p className="mt-1 text-[11px] text-slate-600">労働安全衛生法第59条・労働安全衛生規則第35条</p>
      </div>

      {/* 基本情報＋帳票ヘッダー */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-slate-900 print:hidden">受入教育 実施記録</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="実施日"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="現場名"><Inp value={siteName} onChange={setSiteName} placeholder="例: ○○ビル新築工事" /></Field>
          <Field label="教育実施者（職長等）"><Inp value={educator} onChange={setEducator} placeholder="例: 職長 山田" /></Field>
          <Field label="新規入場者 氏名"><Inp value={workerName} onChange={setWorkerName} placeholder="例: 新人 太郎" /></Field>
          <Field label="所属（下請会社）"><Inp value={company} onChange={setCompany} placeholder="例: △△工業(株)" /></Field>
          <Field label="職種"><Inp value={trade} onChange={setTrade} placeholder="例: 鉄筋工" /></Field>
        </div>
      </section>

      {/* 教育項目チェック */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">教育項目（実施したらチェック）</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{doneCount}/{items.length} 実施</span>
            <button type="button" onClick={() => checkAll(true)} className="min-h-[44px] rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 print:hidden">
              全て実施
            </button>
            <button type="button" onClick={() => checkAll(false)} className="min-h-[44px] rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 print:hidden">
              クリア
            </button>
          </div>
        </div>
        <ul className="divide-y divide-slate-100">
          {items.map((it) => (
            <li key={it.key}>
              <label className="flex cursor-pointer items-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={it.checked}
                  onChange={() => toggleItem(it.key)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                />
                <span className={`text-sm leading-6 ${it.checked ? "text-slate-900" : "text-slate-600"}`}>
                  {it.checked && <CheckSquare className="mr-1 inline h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />}
                  {it.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Field label="備考（保有資格・特別教育の修了状況など）">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="例: 玉掛け技能講習・フルハーネス特別教育 修了済" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={confirmedEducator} onChange={(e) => setConfirmedEducator(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
            実施者確認
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={confirmedWorker} onChange={(e) => setConfirmedWorker(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
            本人 受講確認
          </label>
        </div>

        {/* 署名・押印欄（印刷時のみ）。元請・監督署提出時に「誰が教育し・誰が受けたか」の証跡を残す。
            氏名は入力値をプレフィルするが、上から自筆署名・押印できるよう下線と㊞枠を設ける。 */}
        <div className="mt-4 hidden grid-cols-1 gap-3 print:grid sm:grid-cols-2">
          <SignBox role="教育実施者" name={educator} />
          <SignBox role="受講者（本人）" name={workerName} />
        </div>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          教育項目は労働安全衛生法第59条・労働安全衛生規則第35条（2024年改正で全業種に拡大）の事項と、建設現場の受入教育で標準的な項目に基づく一般的なひな形です。教育記録は3年間の保存が求められます。実際の項目・内容は現場・業務に応じて事業者が定めてください。
        </p>

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 min-h-[44px] px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
            <Save className="h-3.5 w-3.5" aria-hidden="true" /> この端末に保存
          </button>
          <button type="button" onClick={handleSaveAndNextWorker} className="inline-flex items-center gap-1 rounded-lg border border-emerald-600 bg-emerald-50 min-h-[44px] px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> 保存して同じ現場で次の人へ
          </button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-slate-700 min-h-[44px] px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> 受講記録を印刷
          </button>
          <button type="button" onClick={handleNew} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" /> 新規
          </button>
          {savedNote && <span role="status" className={`self-center text-xs font-semibold ${SAFETY_TONE[savedTone].text}`}>{savedNote}</span>}
        </div>
      </section>

      {/* 保存済み一覧 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FolderOpen className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          保存した受入教育記録（この端末）
        </h2>

        {/* 名簿CSV（本社月次提出）：現場・月で絞り、現場→実施日昇順で出力する */}
        {list.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-700">名簿CSV（本社へ月次提出）</p>
            <p className="mt-0.5 text-[11px] text-slate-500">現場・月で絞り込み、現場ごと・実施日の早い順に並べて出力します。</p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-600">現場</span>
                <select
                  value={rosterSite}
                  onChange={(e) => setRosterSite(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">すべての現場</option>
                  {rosterSites.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-600">月</span>
                <select
                  value={rosterMonth}
                  onChange={(e) => setRosterMonth(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">全期間</option>
                  {rosterMonths.map((m) => (
                    <option key={m} value={m}>{m.replace("-", "年")}月</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleRosterCsv}
                disabled={rosterCount === 0}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-700 min-h-[44px] px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> 名簿CSVを出力（{rosterCount}名）
              </button>
              {(rosterSite || rosterMonth) && (
                <button
                  type="button"
                  onClick={() => { setRosterSite(""); setRosterMonth(""); }}
                  className="min-h-[44px] text-xs font-semibold text-slate-500 underline hover:text-slate-700"
                >
                  絞り込み解除
                </button>
              )}
            </div>
          </div>
        )}

        {list.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">まだ保存された記録はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.workerName || "（氏名なし）"}<span className="ml-2 text-xs font-normal text-slate-500">{s.company}</span></p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.date}／{s.siteName || "現場名なし"}／教育 {s.doneCount}/{s.total}項目</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => openSaved(s.id)} className="min-h-[44px] rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50">開く</button>
                  <button type="button" onClick={() => deleteSaved(s.id)} className="min-h-[44px] rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">削除</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SignBox({ role, name }: { role: string; name: string }) {
  return (
    <div className="rounded border border-slate-400 p-3 text-black">
      <p className="text-[11px] font-semibold text-slate-700">{role} 署名</p>
      <div className="mt-4 flex items-center gap-2">
        <span className="flex-1 border-b border-slate-500 pb-1 text-sm">{name}</span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-400 text-[10px] text-slate-500">㊞</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Inp({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
    />
  );
}

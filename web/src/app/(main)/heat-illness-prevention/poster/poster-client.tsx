"use client";

import { useEffect, useState } from "react";
import { Printer, Phone } from "lucide-react";

type PosterFields = {
  siteName: string;
  company: string;
  createdDate: string;
  foreman: string; // 職長・現場代理人（名前/無線・内線）
  restPlace: string; // 搬送先（日陰・休憩室の場所）
  doctor: string; // 産業医（氏名/電話）
  hospital: string; // 最寄り救急（病院名/電話）
  emergencyNet: string; // 会社・緊急連絡網
};

const STORAGE_KEY = "safe-ai:heat-poster:v1";

const DEFAULTS: PosterFields = {
  siteName: "",
  company: "",
  createdDate: "",
  foreman: "",
  restPlace: "",
  doctor: "",
  hospital: "",
  emergencyNet: "",
};

type Step = {
  no: number;
  title: string;
  body: string;
  ribbon: string; // bg color for the number ribbon
  band: string; // light band bg
};

// 出典: 厚生労働省/R7コンプライアンス「緊急対応フロー（現場掲示用ひな形）」に準拠。
const STEPS: Step[] = [
  {
    no: 1,
    title: "発見・作業中止",
    body: "めまい・吐き気・けいれん・意識もうろう等を確認したら、直ちに作業を中止する。",
    ribbon: "bg-rose-600",
    band: "bg-rose-50",
  },
  {
    no: 2,
    title: "通報（意識障害・けいれんは即119）",
    body: "職長・現場代理人へただちに連絡。意識障害・けいれんがあれば迷わず119番通報する。",
    ribbon: "bg-orange-600",
    band: "bg-orange-50",
  },
  {
    no: 3,
    title: "涼しい場所へ搬送",
    body: "日陰・冷房の効いた休憩室へ移動させる。",
    ribbon: "bg-amber-500",
    band: "bg-amber-50",
  },
  {
    no: 4,
    title: "からだを冷やす",
    body: "衣服を緩め、首・脇の下・脚の付け根を氷のうで冷却。皮膚に水をかけ扇風機で送風する。",
    ribbon: "bg-sky-600",
    band: "bg-sky-50",
  },
  {
    no: 5,
    title: "水分・塩分の補給",
    body: "意識がはっきりしていれば経口補水液を少量ずつ。意識がない・吐き気がある場合は飲ませない。",
    ribbon: "bg-teal-600",
    band: "bg-teal-50",
  },
  {
    no: 6,
    title: "医療連携",
    body: "産業医・最寄りの救急医療機関・家族へ連絡し、指示を仰ぐ。",
    ribbon: "bg-indigo-600",
    band: "bg-indigo-50",
  },
  {
    no: 7,
    title: "記録",
    body: "発生時刻・WBGT値・対応内容を記録し、後日の振り返りに活用する。",
    ribbon: "bg-slate-600",
    band: "bg-slate-50",
  },
];

export function PosterClient() {
  const [f, setF] = useState<PosterFields>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // 既定値・保存値の読込（マウント時）。
  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    let initial: PosterFields = { ...DEFAULTS, createdDate: today };
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) initial = { ...initial, ...(JSON.parse(raw) as Partial<PosterFields>) };
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 保存済み記入値・既定日付の初期反映（SSRハイドレーション差異回避）
    setF(initial);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 読込完了フラグ
    setLoaded(true);
  }, []);

  // 記入値の永続化（localStorageへの書込のみ。setStateなし）。
  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      /* ignore */
    }
  }, [f, loaded]);

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function up<K extends keyof PosterFields>(k: K, v: PosterFields[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  return (
    <div className="space-y-6">
      {/* 記入パネル（印刷時は非表示） */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="text-base font-bold text-slate-900">現場・緊急連絡先を入力</h2>
        <p className="mt-1 text-xs text-slate-500">
          入力するとプレビューに即反映され、この端末に保存されます。印刷ボタンでA4掲示用に出力できます。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="現場名"><Inp value={f.siteName} onChange={(v) => up("siteName", v)} placeholder="例: ○○ビル新築工事" /></Field>
          <Field label="会社・元請名"><Inp value={f.company} onChange={(v) => up("company", v)} placeholder="例: ○○建設(株)" /></Field>
          <Field label="職長・現場代理人（氏名／無線・内線）"><Inp value={f.foreman} onChange={(v) => up("foreman", v)} placeholder="例: 山田職長 / 無線2ch" /></Field>
          <Field label="涼しい休憩・搬送場所"><Inp value={f.restPlace} onChange={(v) => up("restPlace", v)} placeholder="例: 1F 詰所（冷房）" /></Field>
          <Field label="産業医（氏名／電話）"><Inp value={f.doctor} onChange={(v) => up("doctor", v)} placeholder="例: ○○医師 / 03-xxxx-xxxx" /></Field>
          <Field label="最寄りの救急医療機関（名称／電話）"><Inp value={f.hospital} onChange={(v) => up("hospital", v)} placeholder="例: ○○病院 / 03-xxxx-xxxx" /></Field>
          <Field label="会社・緊急連絡網"><Inp value={f.emergencyNet} onChange={(v) => up("emergencyNet", v)} placeholder="例: 安全衛生担当 090-xxxx-xxxx" /></Field>
          <Field label="作成日"><Inp type="date" value={f.createdDate} onChange={(v) => up("createdDate", v)} /></Field>
        </div>
        <div className="mt-4">
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
            <Printer className="h-4 w-4" aria-hidden="true" /> A4で印刷／PDF保存
          </button>
        </div>
      </section>

      {/* ポスター本体（画面＝プレビュー、印刷＝掲示物） */}
      <section className="overflow-hidden rounded-2xl border-4 border-rose-600 bg-white p-6 shadow-sm print:border-2">
        <header className="border-b-4 border-rose-600 pb-3 text-center">
          <p className="text-sm font-bold tracking-widest text-rose-700">熱中症 緊急時対応</p>
          <h2 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">いのちを守る 7つの手順</h2>
          <p className="mt-2 text-sm text-slate-700">
            {f.siteName || "（現場名）"}
            {f.company ? `　／　${f.company}` : ""}
          </p>
        </header>

        {/* 119 強調バー */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-rose-600 px-4 py-3 text-white">
          <Phone className="h-7 w-7 shrink-0" aria-hidden="true" />
          <p className="text-lg font-black sm:text-2xl">
            意識がない・けいれん・反応がおかしい → ためらわず <span className="underline">119</span>
          </p>
        </div>

        {/* 連絡先 */}
        <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <ContactRow label="職長・現場代理人" value={f.foreman} />
          <ContactRow label="涼しい休憩・搬送場所" value={f.restPlace} />
          <ContactRow label="産業医" value={f.doctor} />
          <ContactRow label="最寄りの救急医療機関" value={f.hospital} />
          <ContactRow label="会社・緊急連絡網" value={f.emergencyNet} />
        </div>

        {/* 手順 */}
        <ol className="mt-5 space-y-2">
          {STEPS.map((s) => (
            <li key={s.no} className={`flex items-stretch overflow-hidden rounded-xl ${s.band} print:break-inside-avoid`}>
              <span className={`flex w-12 shrink-0 items-center justify-center text-2xl font-black text-white ${s.ribbon}`}>
                {s.no}
              </span>
              <div className="px-3 py-2">
                <p className="text-base font-bold text-slate-900">{s.title}</p>
                <p className="mt-0.5 text-sm leading-6 text-slate-700">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* 予防の要点 */}
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-bold text-amber-900">日々の予防の要点</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            こまめな水分・塩分補給／暑い時間帯の作業見直し・休憩の徹底／作業前と作業中の体調確認・声かけ／
            暑さに慣れていない人（新規・休み明け）は特に注意／WBGTを測って当日のリスクと作業可否を判断する。
          </p>
        </div>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-[11px] text-slate-500">
          <span>作成日: {f.createdDate || "—"}　／　出典: 厚生労働省「職場における熱中症予防」</span>
          <span>当ポータルの掲示用ひな形（最終判断は事業者・職長・産業医）</span>
        </footer>
      </section>

      <p className="text-xs text-slate-500 print:hidden">
        当日のWBGTとリスク判定は{" "}
        <a href="/heat-illness-prevention/wbgt-calculator" className="font-semibold text-amber-700 hover:underline">WBGT計算機</a>、
        日々の記録は{" "}
        <a href="/heat-illness-prevention/log" className="font-semibold text-amber-700 hover:underline">WBGT日次記録簿</a>{" "}
        をご利用ください。
      </p>
    </div>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
      <span className="shrink-0 text-xs font-bold text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 border-b border-dotted border-slate-300 text-sm font-semibold text-slate-900">
        {value || "　"}
      </span>
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

function Inp({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
    />
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileUp, Plus, X, Trash2, Sparkles } from "lucide-react";
import { loadProfile, saveProfile } from "@/lib/company-profile";

const SITE_LIST_KEY = "chemical-ra:site-list-v1";

type SiteChemical = {
  name: string;
  cas?: string;
  addedAt: string;
};

function loadSiteList(): SiteChemical[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SITE_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSiteList(list: SiteChemical[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SITE_LIST_KEY, JSON.stringify(list));
}

export function ChemicalRaExtras() {
  const [list, setList] = useState<SiteChemical[]>([]);
  const [name, setName] = useState("");
  const [cas, setCas] = useState("");
  const [sdsBusy, setSdsBusy] = useState(false);
  const [sdsResult, setSdsResult] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadSiteList();
    if (stored.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setList(stored);
    } else {
      // 初回はプロファイルから移行
      const profile = loadProfile();
      if (profile.chemicals.length > 0) {
        const initial: SiteChemical[] = profile.chemicals.map((c) => ({
          name: c,
          addedAt: new Date().toISOString(),
        }));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setList(initial);
        saveSiteList(initial);
      }
    }
  }, []);

  const addItem = () => {
    if (!name.trim()) return;
    const next = [
      { name: name.trim(), cas: cas.trim() || undefined, addedAt: new Date().toISOString() },
      ...list.filter((c) => c.name !== name.trim()),
    ];
    setList(next);
    saveSiteList(next);
    // プロファイルの chemicals にも追加
    const profile = loadProfile();
    if (!profile.chemicals.includes(name.trim())) {
      saveProfile({ ...profile, chemicals: [...profile.chemicals, name.trim()] });
    }
    setName("");
    setCas("");
  };

  const removeItem = (n: string) => {
    const next = list.filter((c) => c.name !== n);
    setList(next);
    saveSiteList(next);
  };

  const handleSdsUpload = async (file: File) => {
    setSdsBusy(true);
    setSdsResult(null);
    // 注: 実際のPDF抽出はサーバー側に持っていない。簡易デモとして
    // ファイル名から物質名を推測し、一覧に追加するのみとする。
    await new Promise((r) => setTimeout(r, 600));
    const guessed = file.name
      .replace(/\.(pdf|PDF)$/, "")
      .replace(/[\-_].*$/, "")
      .replace(/SDS|sds/g, "")
      .trim();
    if (guessed) {
      const next = [
        { name: guessed, addedAt: new Date().toISOString() },
        ...list.filter((c) => c.name !== guessed),
      ];
      setList(next);
      saveSiteList(next);
    }
    setSdsResult(
      `SDSファイル「${file.name}」をローカル登録しました。物質名「${guessed || "（推定不可）"}」をリストに追加。詳細RAは下のフォームで実行してください。`
    );
    setSdsBusy(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-3 px-4 lg:px-8">
      {/* SDSアップロード */}
      <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-violet-900">
            <Sparkles className="mr-1 inline h-3.5 w-3.5" />
            SDS PDF アップロード（AI 読取・実験的）
          </h2>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700">
            <FileUp className="h-3.5 w-3.5" />
            {sdsBusy ? "解析中…" : "PDFを選ぶ"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleSdsUpload(f);
              }}
            />
          </label>
        </div>
        <p className="mt-1 text-[11px] text-violet-800">
          現在は実験的サポート: ファイル名から物質名を推定して一覧に登録します。本番AI読取は管理者向けに整備予定。
        </p>
        {sdsResult && (
          <p className="mt-2 rounded border border-violet-300 bg-white px-2 py-1 text-[11px] text-violet-800">
            {sdsResult}
          </p>
        )}
      </section>

      {/* 現場の化学物質リスト */}
      <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-emerald-900">📋 現場の化学物質リスト（端末内に保存）</h2>
          <span className="text-[11px] text-slate-500">{list.length}件</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="物質名"
            className="flex-1 min-w-[160px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={cas}
            onChange={(e) => setCas(e.target.value)}
            placeholder="CAS No.（任意）"
            className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!name.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            追加
          </button>
        </div>

        {list.length > 0 ? (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {list.map((c) => {
              const raLink = `/chemical-ra?${c.cas ? `cas=${encodeURIComponent(c.cas)}` : `name=${encodeURIComponent(c.name)}`}`;
              const ppeLink = `/equipment-finder?chemical=${encodeURIComponent(c.name)}`;
              return (
                <li
                  key={c.name}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">{c.name}</p>
                    {c.cas && <p className="text-[10px] text-slate-500">CAS: {c.cas}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Link
                      href={raLink}
                      className="rounded border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
                    >
                      RA再評価
                    </Link>
                    <Link
                      href={ppeLink}
                      className="rounded border border-sky-300 bg-white px-2 py-1 text-[11px] font-semibold text-sky-800 hover:bg-sky-50"
                    >
                      保護具を探す →
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeItem(c.name)}
                      aria-label={`${c.name}を削除`}
                      className="rounded p-1 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
            まだ登録された化学物質はありません。物質名と任意でCAS No.を入力して追加してください。
          </p>
        )}
      </section>
    </div>
  );
}

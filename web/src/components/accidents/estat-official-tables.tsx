"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Database, Loader2 } from "lucide-react";

/**
 * P3-1 e-Stat 公式統計表カタログ表示。/api/accidents/estat から労働災害関連の
 * 公式統計表（実データのメタ情報）を取得し、e-Statリンクで誘導する。
 * 未設定/失敗時は何も表示しない（既存ページ非干渉）。
 */
interface EstatTable {
  id: string;
  statName: string;
  title: string;
  govOrg: string;
  surveyDate: string;
  updatedDate: string;
  url: string;
}

export function EstatOfficialTables() {
  const [tables, setTables] = useState<EstatTable[] | null>(null);
  const [state, setState] = useState<"loading" | "done" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/accidents/estat?q=労働災害")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("ng"))))
      .then((d: unknown) => {
        if (cancelled) return;
        const t = (d as { ok?: boolean; tables?: EstatTable[] });
        if (t.ok && Array.isArray(t.tables) && t.tables.length > 0) {
          setTables(t.tables);
          setState("done");
        } else {
          setState("unavailable");
        }
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "unavailable") return null;

  return (
    <section className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 sm:p-5 space-y-2">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <Database className="h-5 w-5 text-indigo-600" aria-hidden="true" />
        e-Stat 公式統計表（労働災害・政府統計）
      </h2>
      <p className="text-xs text-slate-600">
        政府統計の総合窓口(e-Stat)のAPIから労働災害関連の公式統計表を取得しています。最新の確定統計は各表でご確認ください。
      </p>
      {state === "loading" && (
        <p className="flex items-center gap-2 text-sm text-indigo-700">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          e-Statから取得中…
        </p>
      )}
      {tables && (
        <ul className="space-y-1.5">
          {tables.map((t) => (
            <li key={t.id}>
              <a
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 hover:border-indigo-300"
              >
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-800">{t.title || t.statName}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {t.govOrg} ／ {t.statName}
                    {t.updatedDate ? ` ／ 更新 ${t.updatedDate}` : ""}
                  </span>
                </span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-slate-400">
        ※ 出典: 政府統計の総合窓口(e-Stat)。政府標準利用規約2.0に基づき出典明示で利用。
      </p>
    </section>
  );
}

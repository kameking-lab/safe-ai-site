import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, LockKeyhole, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout";
import {
  listChemicalRaLedger,
  type ChemicalRaLedgerRow,
  type GovernanceSql,
} from "@/lib/chemical/ra-governance-repository";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganizationAccess } from "@/lib/server/organization-access";
import { ChemicalRaLedgerPrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "組織用化学物質RA台帳",
  description:
    "SDS版、作業条件、対策、承認、再評価を組織・拠点ごとに管理する認証必須の台帳です。",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: null as unknown as string },
};

function dateLabel(value: Date | null): string {
  if (!value) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
  }).format(value);
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "下書き",
    "identity-unresolved": "物質同定未解決",
    "input-incomplete": "入力不足",
    "screening-complete": "簡易確認完了",
    "review-required": "レビュー待ち",
    "changes-requested": "修正依頼",
    approved: "承認済み",
    superseded: "旧版",
    "reassessment-due": "再評価期限",
    archived: "保管",
  };
  return labels[status] ?? "状態不明";
}

export default async function ChemicalRaLedgerPage() {
  let records: ChemicalRaLedgerRow[] = [];
  let organizationName: string | null = null;
  let unavailableReason:
    | "scope"
    | "authentication_not_configured"
    | "authentication_required"
    | "database_unavailable"
    | "membership_required"
    | "insufficient_role"
    | "ledger_unavailable"
    | null = null;

  const access = await requireCurrentOrganizationAccess("viewer");
  if (!access.ok) {
    unavailableReason = access.reason;
  } else {
    if (!prisma) {
      unavailableReason = "database_unavailable";
    } else {
      organizationName = access.organizationName;
      try {
        records = await listChemicalRaLedger(
          prisma as unknown as GovernanceSql,
          access.organizationId,
          null,
        );
      } catch {
        unavailableReason = "ledger_unavailable";
      }
    }
  }

  return (
    <PageContainer width="wide">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-teal-100 p-2 text-teal-800">
            <FlaskConical className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-teal-800">認証必須・組織運用</p>
            <h1 className="text-2xl font-black text-slate-950">
              組織用化学物質RA台帳
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">
          SDSの版、作業条件、既存・追加対策、担当、レビュー、承認、次回再評価を不変版として残します。
          未承認の記録は正式評価として表示しません。
        </p>
      </header>

      <section
        aria-labelledby="ra-boundaries"
        className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      >
        <h2 id="ra-boundaries" className="sr-only">
          4つの役割の違い
        </h2>
        {[
          {
            title: "簡易スクリーニング",
            text: "匿名で物質・SDS・不足条件を整理。正式評価ではありません。",
            href: "/chemical-ra",
            link: "簡易確認を開く",
          },
          {
            title: "組織用RA台帳",
            text: "認証・組織権限・版管理・承認・監査履歴を備えた本画面です。",
          },
          {
            title: "公式CREATE-SIMPLE",
            text: "厚生労働省「職場のあんぜんサイト」が提供する公式支援ツールです。",
            href: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/ankgc07_3.htm",
            link: "公式ツールを確認",
          },
          {
            title: "専門家確認",
            text: "SDS、実測、工程固有リスク、法令適用は担当者・専門家が最終確認します。",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <h3 className="font-bold text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-650">{item.text}</p>
            {item.href ? (
              <Link
                href={item.href}
                className="mt-3 inline-flex min-h-11 items-center font-bold text-blue-800 underline underline-offset-4"
                {...(item.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {item.link}
              </Link>
            ) : null}
          </article>
        ))}
      </section>

      {unavailableReason ? (
        <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-800"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-bold text-amber-950">
                組織台帳は接続されていません
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                認証、組織メンバー権限、共有DB、対象拠点が確認できた場合だけ台帳を表示します。
                現在はfail-closedのため、組織記録の閲覧・作成・承認はできません。
              </p>
              <p className="mt-2 text-xs text-amber-800">
                接続状態: {unavailableReason}
              </p>
              <Link
                href="/chemical-ra"
                className="mt-3 inline-flex min-h-11 items-center font-bold text-amber-950 underline underline-offset-4"
              >
                匿名の簡易スクリーニングを使う
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-5" aria-labelledby="ledger-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <h2 id="ledger-heading" className="text-lg font-black text-slate-950">
                {organizationName} の台帳
              </h2>
              <p className="text-sm text-slate-600">
                {records.length}件。拠点境界と権限はサーバー側で再確認済みです。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/api/organization/chemical-ra?format=csv"
                className="inline-flex min-h-11 items-center rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white"
              >
                CSV出力
              </Link>
              <ChemicalRaLedgerPrintButton />
            </div>
          </div>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs text-slate-700">
                <tr>
                  <th className="p-3">管理番号・物質</th>
                  <th className="p-3">拠点</th>
                  <th className="p-3">SDS版</th>
                  <th className="p-3">状態</th>
                  <th className="p-3">最終評価</th>
                  <th className="p-3">次回評価</th>
                  <th className="p-3">担当</th>
                  <th className="p-3">未解決</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="p-3">
                      <strong>{record.assessmentNumber}</strong>
                      <span className="block text-slate-600">
                        {record.chemicalIdentity}
                        {record.casNumber ? ` / CAS ${record.casNumber}` : ""}
                      </span>
                    </td>
                    <td className="p-3">{record.siteName}</td>
                    <td className="p-3">
                      {record.sdsVersionLabel ?? "未登録"}
                      <span className="block text-xs text-slate-500">
                        {dateLabel(record.sdsIssueDate)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          record.status === "approved"
                            ? "font-bold text-emerald-800"
                            : "font-bold text-amber-800"
                        }
                      >
                        {statusLabel(record.status)}
                      </span>
                      {record.status !== "approved" ? (
                        <span className="block text-xs text-rose-700">
                          正式評価ではありません
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">{dateLabel(record.approvedAt)}</td>
                    <td className="p-3">{dateLabel(record.reassessmentDate)}</td>
                    <td className="p-3">{record.ownerUserId}</td>
                    <td className="p-3">{record.unresolvedWarningCount}件</td>
                  </tr>
                ))}
                {records.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-slate-600" colSpan={8}>
                      登録済みの組織用RAはありません。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <aside className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            承認には、確認済みCASまたは混合物、SDS版、必須作業条件、対策、担当、再評価日、
            reviewer、approver、AI候補の人手確認、出典、未解決警告0件が必要です。
            SDS・成分・濃度・量・工程・換気・PPE・法令・事故または定期日が変わると再評価対象になります。
          </p>
        </div>
      </aside>
    </PageContainer>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, LockKeyhole, ShieldAlert } from "lucide-react";
import { PageContainer } from "@/components/layout";
import type { GovernanceSql } from "@/lib/chemical/ra-governance-repository";
import {
  listTrainingProgress,
  type TrainingProgressRow,
} from "@/lib/education/training-governance-repository";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganizationAccess } from "@/lib/server/organization-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "組織用 教育・資格進捗",
  description:
    "本人確認、受講時間、実技、講師、試験、管理者確認を区別して管理する認証必須の組織進捗画面です。",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: null as unknown as string },
};

function dateLabel(value: Date | null): string {
  if (!value) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeZone: "Asia/Tokyo",
  }).format(value);
}

function completionDisplay(row: TrainingProgressRow): {
  label: string;
  formal: boolean;
} {
  if (
    row.completionLevel === "formal-statutory-completion" &&
    row.formalApprovedAt
  ) {
    return { label: "正式な法定教育の修了（承認済み）", formal: true };
  }
  if (row.completionLabel) return { label: row.completionLabel, formal: false };
  if (row.progressPercent >= 100) return { label: "学習完了", formal: false };
  return { label: "受講中", formal: false };
}

export default async function TrainingProgressPage() {
  let records: TrainingProgressRow[] = [];
  let organizationName: string | null = null;
  let unavailable:
    | "scope"
    | "authentication_not_configured"
    | "authentication_required"
    | "database_unavailable"
    | "membership_required"
    | "insufficient_role"
    | "progress_unavailable"
    | null = null;

  const access = await requireCurrentOrganizationAccess("viewer");
  if (!access.ok) {
    unavailable = access.reason;
  } else {
    if (!prisma) {
      unavailable = "database_unavailable";
    } else {
      organizationName = access.organizationName;
      try {
        records = await listTrainingProgress(
          prisma as unknown as GovernanceSql,
          access.organizationId,
          null,
        );
      } catch {
        unavailable = "progress_unavailable";
      }
    }
  }

  const completed = records.filter((record) =>
    ["learning-complete", "internal-training-record", "formal-statutory-completion"].includes(
      record.completionLevel ?? "",
    ),
  ).length;
  const overdue = records.filter(
    (record) => record.status === "overdue",
  ).length;
  const unverified = records.filter(
    (record) => record.identityStatus !== "verified",
  ).length;
  return (
    <PageContainer width="wide">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-indigo-100 p-2 text-indigo-800">
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-indigo-800">認証必須・組織運用</p>
            <h1 className="text-2xl font-black text-slate-950">
              教育・資格の組織進捗
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">
          受講者、本人確認状態、コース版、出席時間、実技、講師、試験、確認者、期限、再受講を拠点・コース別に管理します。
          自己学習と法定教育、技能講習、特別教育、職長教育、作業主任者、就業制限を混同しません。
        </p>
      </header>

      <aside className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-800"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-bold text-rose-950">修了表示の安全境界</h2>
            <p className="mt-1 text-sm leading-6 text-rose-900">
              本人確認、必要時間、出席、必要な実技・講師資格・試験、法令出典、固定コース版、
              実施主体の権限、確認者、承認者がすべて揃った記録だけを正式修了として扱います。
              条件不足時は「自己確認」「学習完了」「社内受講記録」に限定し、正式な修了証は生成しません。
            </p>
          </div>
        </div>
      </aside>

      {unavailable ? (
        <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-800"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-bold text-amber-950">
                組織の受講記録は接続されていません
              </h2>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                認証、組織権限、共有DB、拠点が確認できないためfail-closedです。
                匿名Eラーニングは引き続き利用できますが、端末内進捗は正式な受講記録ではありません。
              </p>
              <p className="mt-2 text-xs text-amber-800">接続状態: {unavailable}</p>
              <Link
                href="/e-learning"
                className="mt-3 inline-flex min-h-11 items-center font-bold text-amber-950 underline underline-offset-4"
              >
                匿名Eラーニングを開く
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="mt-5" aria-labelledby="progress-summary">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="progress-summary" className="text-lg font-black text-slate-950">
                  {organizationName} の進捗
                </h2>
                <p className="text-sm text-slate-600">
                  site・courseフィルタはサーバー側の組織境界内だけに適用されます。
                </p>
              </div>
              <Link
                href="/api/organization/training?format=csv"
                className="inline-flex min-h-11 items-center rounded-lg bg-indigo-800 px-4 py-2 text-sm font-bold text-white"
              >
                CSV出力
              </Link>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["受講登録", records.length],
                ["完了", completed],
                ["期限超過・未完了", overdue],
                ["本人確認未完了", unverified],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <p className="text-xs font-bold text-slate-600">{label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[1120px] w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs text-slate-700">
                <tr>
                  <th className="p-3">受講者・本人確認</th>
                  <th className="p-3">拠点</th>
                  <th className="p-3">コース・区分</th>
                  <th className="p-3">版</th>
                  <th className="p-3">進捗・時間</th>
                  <th className="p-3">完了表示</th>
                  <th className="p-3">期限</th>
                  <th className="p-3">再受講</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((record) => {
                  const completion = completionDisplay(record);
                  return (
                    <tr key={record.enrollmentId}>
                      <td className="p-3">
                        <strong>{record.displayName}</strong>
                        <span
                          className={
                            record.identityStatus === "verified"
                              ? "block text-xs text-emerald-800"
                              : "block text-xs font-bold text-amber-800"
                          }
                        >
                          本人確認: {record.identityStatus}
                        </span>
                      </td>
                      <td className="p-3">{record.siteName}</td>
                      <td className="p-3">
                        <strong>{record.courseTitle}</strong>
                        <span className="block text-xs text-slate-600">
                          {record.classification} / {record.legalCategory}
                        </span>
                      </td>
                      <td className="p-3">{record.courseVersion}</td>
                      <td className="p-3">
                        {record.progressPercent}%
                        <span className="block text-xs text-slate-600">
                          {record.learningMinutes}/{record.requiredMinutes}分
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            completion.formal
                              ? "font-bold text-emerald-800"
                              : "font-bold text-slate-800"
                          }
                        >
                          {completion.label}
                        </span>
                        {!completion.formal ? (
                          <span className="block text-xs text-rose-700">
                            正式な修了証ではありません
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3">{dateLabel(record.dueDate)}</td>
                      <td className="p-3">{dateLabel(record.renewalDueAt)}</td>
                    </tr>
                  );
                })}
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-600">
                      登録済みの受講者・コースはありません。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      )}
    </PageContainer>
  );
}

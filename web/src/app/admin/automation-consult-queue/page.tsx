import type { Metadata } from "next";
import { Inbox, LockKeyhole } from "lucide-react";
import type { GovernanceSql } from "@/lib/chemical/ra-governance-repository";
import {
  automationConsultQueueConfiguration,
  listAutomationConsultQueue,
  type AutomationConsultQueueRow,
} from "@/lib/automation-consult/queue";
import { prisma } from "@/lib/prisma";
import { AutomationConsultTicketActions } from "./ticket-actions";

export const metadata: Metadata = {
  title: "自動化相談 受付キュー",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: null as unknown as string },
};

function dateTime(value: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(value);
}

export default async function AutomationConsultQueuePage() {
  const configuration = automationConsultQueueConfiguration();
  let rows: AutomationConsultQueueRow[] = [];
  let databaseReady = Boolean(prisma);
  if (prisma) {
    try {
      rows = await listAutomationConsultQueue(prisma as unknown as GovernanceSql);
    } catch {
      databaseReady = false;
    }
  }
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-xl border border-slate-300 bg-white p-5">
          <div className="flex items-center gap-3">
            <Inbox className="h-6 w-6 text-blue-800" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-blue-800">admin only</p>
              <h1 className="text-2xl font-black">自動化相談 受付キュー</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            一覧は本文・氏名・メールを含みません。内容は必要時だけ復号し、ログ・RUM・analytics・生成AIへ送りません。
            CSV等の一括exportは無効です。
          </p>
        </header>

        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["共有DB", databaseReady ? "ready" : "unavailable"],
            ["暗号化・保持設定", configuration.ok ? "ready" : "preparing"],
            ["受付件数", rows.length],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-slate-300 bg-white p-4"
            >
              <p className="text-xs font-bold text-slate-600">{label}</p>
              <p className="mt-1 text-xl font-black">{value}</p>
            </div>
          ))}
        </section>

        {!configuration.ok ? (
          <aside className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <LockKeyhole
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-900"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-amber-950">
                保持期間、暗号鍵版、運用担当、admin review pathの確認が揃っていないため、
                公開フォームからのキュー受付は開始しません。
              </p>
            </div>
          </aside>
        ) : null}

        <section className="mt-4 space-y-3" aria-label="相談チケット">
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-slate-300 bg-white p-4"
            >
              <div className="mb-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p>
                  <strong>受付番号:</strong> {row.referenceId}
                </p>
                <p>
                  <strong>状態:</strong> {row.status}
                </p>
                <p>
                  <strong>email:</strong> {row.emailDeliveryStatus}
                </p>
                <p>
                  <strong>保持期限:</strong> {dateTime(row.retentionUntil)}
                </p>
              </div>
              <AutomationConsultTicketActions
                ticketId={row.id}
                initialStatus={row.status}
                initialAssignee={row.assignedUserId}
              />
            </article>
          ))}
          {rows.length === 0 ? (
            <p className="rounded-xl border border-slate-300 bg-white p-6 text-center text-slate-600">
              受付キューは空です。
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

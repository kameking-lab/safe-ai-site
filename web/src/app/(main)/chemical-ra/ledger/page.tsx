import { ChemicalRaLedgerView } from "./ledger-view";
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

  return <ChemicalRaLedgerView records={records} organizationName={organizationName} unavailableReason={unavailableReason}/>;
}

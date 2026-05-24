"use client";

/**
 * P0-006 (usability-audit-day2-2026-05-24):
 * 計画プレビュー画面で表示された計画を localStorage 履歴に追加する。
 * Server Component の preview/[id]/page.tsx から計画メタ情報を受け取り、
 * Client 側で useEffect 経由で recordPlanHistory を呼ぶ。
 *
 * 副作用のみで UI 出力なし。CopilotPlanSync と並べて配置する。
 */

import { useEffect } from "react";
import { recordPlanHistory } from "@/lib/safety-plan/history";

export type PlanHistorySaverProps = {
  id: string;
  previewHref: string;
  industry: string;
  industryLabel: string;
  scale: string;
  scaleLabel: string;
  fiscalYear: number;
  organizationName: string | null;
};

export function PlanHistorySaver({
  id,
  previewHref,
  industry,
  industryLabel,
  scale,
  scaleLabel,
  fiscalYear,
  organizationName,
}: PlanHistorySaverProps) {
  useEffect(() => {
    recordPlanHistory({
      id,
      previewHref,
      industry,
      industryLabel,
      scale,
      scaleLabel,
      fiscalYear,
      organizationName,
    });
  }, [
    id,
    previewHref,
    industry,
    industryLabel,
    scale,
    scaleLabel,
    fiscalYear,
    organizationName,
  ]);
  return null;
}

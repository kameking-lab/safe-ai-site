"use client";

import { useEffect, useMemo, useState } from "react";
import { SignageShell } from "@/components/signage/signage-shell";
import { SignageHeader } from "@/components/signage/signage-header";
import { RiskHeroCard } from "@/components/signage/risk-hero-card";
import { WeatherAlertPanel } from "@/components/signage/weather-alert-panel";
import { IncidentHighlightsPanel } from "@/components/signage/incident-highlights-panel";
import { LawHighlightsPanel } from "@/components/signage/law-highlights-panel";
import { AutoRefreshStatus } from "@/components/signage/auto-refresh-status";
import { createServices } from "@/lib/services/service-factory";
import type { LawRevision, SiteRiskWeather, AccidentCase } from "@/lib/types/domain";
import type { ApiMode, ServiceStatus } from "@/lib/types/api";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

type DashboardState = {
  mode: ApiMode;
  regionLabel: string;
  nowText: string;
  lastUpdatedText: string;
  riskStatus: ServiceStatus;
  riskData: SiteRiskWeather | null;
  accidentStatus: ServiceStatus;
  accidentCases: AccidentCase[] | null;
  lawStatus: ServiceStatus;
  lawRevisions: LawRevision[] | null;
  workType: "高所作業" | "電気作業" | "足場作業" | "一般作業";
};

export default function SignagePage() {
  const services = useMemo(() => createServices(), []);
  const [state, setState] = useState<DashboardState>(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const nowText = formatter.format(now);
    return {
      mode: services.mode,
      regionLabel: services.weatherRisk.getAvailableRegions()[0]?.label ?? "地域未選択",
      nowText,
      lastUpdatedText: nowText,
      riskStatus: "idle",
      riskData: null,
      accidentStatus: "idle",
      accidentCases: null,
      lawStatus: "idle",
      lawRevisions: null,
      workType: "一般作業",
    };
  });

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const timer = window.setInterval(() => {
      setState((prev) => ({
        ...prev,
        nowText: formatter.format(new Date()),
      }));
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    async function refreshAll() {
      setState((prev) => ({
        ...prev,
        riskStatus: "loading",
        accidentStatus: "loading",
        lawStatus: "loading",
      }));

      const [riskResult, accidentResult, revisionResult] = await Promise.all([
        services.weatherRisk.getTodaySiteRisk(),
        services.accident.getAccidentCases({ type: "すべて" }),
        services.revision.getLawRevisions(),
      ]);

      if (cancelled) return;

      setState((prev) => {
        const next: DashboardState = { ...prev };
        const nowText = formatter.format(new Date());
        next.lastUpdatedText = nowText;

        if (riskResult.ok) {
          next.riskStatus = "success";
          next.riskData = riskResult.data;
          next.regionLabel = riskResult.data.regionName;
        } else {
          next.riskStatus = "error";
          next.riskData = null;
        }

        if (accidentResult.ok) {
          next.accidentStatus = "success";
          next.accidentCases = accidentResult.data;
        } else {
          next.accidentStatus = "error";
          next.accidentCases = null;
        }

        if (revisionResult.ok) {
          next.lawStatus = "success";
          next.lawRevisions = revisionResult.data;
        } else {
          next.lawStatus = "error";
          next.lawRevisions = null;
        }

        return next;
      });
    }

    void refreshAll();
    const intervalId = window.setInterval(() => {
      void refreshAll();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [services]);

  const briefingLines =
    state.riskData == null
      ? [
          "現地の天候・足元・仮設設備を確認し、危険と感じる作業は無理に開始しないこと。",
          "「おかしい」と感じたら必ず作業を止めて、責任者に報告すること。",
        ]
      : [];

  return (
    <SignageShell>
      <SignageHeader
        regionLabel={state.regionLabel}
        nowText={state.nowText}
        mode={state.mode}
        lastUpdatedText={state.lastUpdatedText}
      />

      <div className="flex flex-1 flex-col gap-4">
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.1fr)]">
          <RiskHeroCard data={state.riskData} status={state.riskStatus} workBriefingLines={briefingLines} />
          <WeatherAlertPanel data={state.riskData} status={state.riskStatus} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <IncidentHighlightsPanel cases={state.accidentCases} status={state.accidentStatus} />
          <LawHighlightsPanel revisions={state.lawRevisions} status={state.lawStatus} />
        </div>

        <AutoRefreshStatus intervalMinutes={REFRESH_INTERVAL_MS / 60000} lastUpdatedText={state.lastUpdatedText} />
      </div>
    </SignageShell>
  );
}


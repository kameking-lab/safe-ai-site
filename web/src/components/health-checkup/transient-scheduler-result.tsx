"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout";
import {
  CrossToolLinks,
  HEALTH_CHECKUP_TO_SLUG,
} from "@/components/cross-tool-links";
import { buildDecision } from "@/lib/health-checkup-engine";
import {
  consumeHealthCheckupHandoff,
  type HealthCheckupHandoff,
} from "@/lib/transient-navigation-handoff";
import { CheckupConclusionCard } from "./checkup-conclusion-card";
import { PrintButton } from "./print-button";
import { SchedulerDocument, buildTrackerData } from "./scheduler-document";

export function TransientSchedulerResult() {
  const [profile, setProfile] = useState<HealthCheckupHandoff | null>(null);

  useEffect(() => {
    const transient = consumeHealthCheckupHandoff();
    const frame = window.requestAnimationFrame(() => setProfile(transient));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const decision = useMemo(
    () => (profile ? buildDecision(profile) : null),
    [profile],
  );
  const tracker = useMemo(
    () => (profile && decision ? buildTrackerData(profile, decision) : null),
    [decision, profile],
  );

  if (!profile || !decision || !tracker) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-950">健診条件を入力してください</h1>
        <p className="mt-3 text-sm text-slate-700">
          入力内容はこのタブの画面遷移時だけ引き継ぎます。再読込後は残りません。
        </p>
        <Link
          href="/health-checkup-scheduler"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white"
        >
          入力へ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageContainer width="prose" className="py-6 md:py-10">
        <div className="mb-6 flex flex-col items-stretch gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/health-checkup-scheduler"
            className="text-sm text-emerald-700 hover:underline"
          >
            ← 入力に戻る
          </Link>
          <PrintButton />
        </div>
        <div className="mb-6 print:hidden">
          <CheckupConclusionCard
            entries={tracker.entries}
            storageKey={tracker.storageKey}
            requiredTotal={decision.required.length}
          />
        </div>
        <SchedulerDocument
          profile={profile}
          decision={decision}
          generatedAt={new Date().toISOString().slice(0, 10)}
        />
      </PageContainer>
      <div className="print:hidden">
        <CrossToolLinks
          industry={HEALTH_CHECKUP_TO_SLUG[profile.industry]}
          exclude="health-checkup"
          heading="同業種の関連ツール"
        />
      </div>
    </div>
  );
}

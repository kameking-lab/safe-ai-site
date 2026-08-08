import "server-only";

import { getPublicSourceRegistry } from "@/data/source-registry";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { getAutomationFunnelServerReadiness } from "@/lib/automation-funnel/server-readiness";
import { getRumServerReadiness } from "@/lib/rum/server-readiness";
import { aggregateAutomationFunnel } from "./funnel-aggregation";
import { aggregateRum } from "./rum-aggregation";

export type OperationalStatus =
  | "operational"
  | "degraded"
  | "stale"
  | "unavailable"
  | "disabled"
  | "pending-external"
  | "unknown";

function configured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function trueFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function safeRuntimeValue(
  value: string | undefined,
  fallback = "runtime未提供",
): string {
  const normalized = value?.trim() ?? "";
  return /^[A-Za-z0-9_.:/-]{1,160}$/.test(normalized) ? normalized : fallback;
}

function safeGateStatus(
  value: string | undefined,
  fallback = "UNKNOWN",
): string {
  const normalized = value?.trim().toUpperCase();
  return normalized === "PASS" ||
    normalized === "FAIL" ||
    normalized === "UNKNOWN"
    ? normalized
    : fallback;
}

function safeOperationalStatus(
  value: string | undefined,
  fallback: OperationalStatus = "unknown",
): OperationalStatus {
  const normalized = value?.trim().toLowerCase();
  return normalized === "operational" ||
    normalized === "degraded" ||
    normalized === "stale" ||
    normalized === "unavailable" ||
    normalized === "disabled" ||
    normalized === "pending-external" ||
    normalized === "unknown"
    ? normalized
    : fallback;
}

function mailReadiness(env: NodeJS.ProcessEnv) {
  const provider = env.RESEND_API_KEY?.trim();
  const sender = env.AUTOMATION_CONSULT_FROM?.trim() || env.NOTIFY_FROM?.trim();
  const fromVerified = trueFlag(env.AUTOMATION_CONSULT_FROM_VERIFIED);
  const deliveryVerified = trueFlag(env.AUTOMATION_CONSULT_DELIVERY_VERIFIED);
  const bouncePolicy = trueFlag(
    env.AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK,
  );
  let status:
    | "configured"
    | "missing"
    | "invalid"
    | "domain-pending"
    | "ready-for-test"
    | "active";
  if (!provider) status = "missing";
  else if (provider.length < 12) status = "invalid";
  else if (!sender) status = "configured";
  else if (!fromVerified) status = "domain-pending";
  else if (!deliveryVerified || !bouncePolicy) status = "ready-for-test";
  else status = "active";
  return {
    status,
    recipientConfigured: configured(env.AUTOMATION_CONSULT_RECIPIENTS),
    fromConfigured: configured(sender),
    providerConfigured: Boolean(provider),
    fromVerified,
    deliveryVerified,
    bounceComplaintPolicy: bouncePolicy ? "confirmed" : "unconfirmed",
    providerAccepted: "not-tested" as const,
    bounceOrComplaintObserved: "not-available" as const,
  };
}

const QUALITY_GATE_NAMES = [
  "TypeScript",
  "ESLint",
  "Vitest",
  "Playwright",
  "production build",
  "npm audit",
  "metadata",
  "sitemap",
  "canonical",
  "JSON-LD",
  "orphan",
  "quarantine",
  "synthetic",
  "PII scan",
  "recipient scan",
  "performance budget",
] as const;

export async function getOperationsCockpitData(now = new Date()) {
  const [rum, funnel] = await Promise.all([
    aggregateRum(undefined, now),
    aggregateAutomationFunnel(undefined, now),
  ]);
  const env = process.env;
  const consultAvailability = getAutomationConsultAvailability(env);
  const rumReadiness = getRumServerReadiness(env);
  const funnelReadiness = getAutomationFunnelServerReadiness(env);
  const mail = mailReadiness(env);
  const fullGateStatus = safeGateStatus(env.OPERATIONS_LAST_FULL_GATE_STATUS);
  const lastSmokeStatus = safeGateStatus(env.OPERATIONS_LAST_SMOKE_STATUS);
  const lastSmokeDeployment = safeRuntimeValue(
    env.OPERATIONS_LAST_SMOKE_DEPLOYMENT_ID,
    "未記録",
  );
  const smokeVerifiedFeatureStatus: OperationalStatus =
    lastSmokeStatus === "PASS" ? "operational" : "unknown";
  const smokeSnapshotNote = `最終smoke snapshot (${lastSmokeDeployment})`;
  const sources = getPublicSourceRegistry();
  const sourceCounts = sources.reduce<Record<string, number>>((acc, source) => {
    acc[source.status] = (acc[source.status] ?? 0) + 1;
    return acc;
  }, {});
  const verifiedDates = sources
    .flatMap((source) => [source.retrievedAt, source.verifiedAt])
    .filter((value): value is string => Boolean(value))
    .sort();

  const consultMissing = [
    !mail.recipientConfigured ? "受信先設定" : null,
    !mail.providerConfigured ? "メール配送資格情報" : null,
    !mail.fromConfigured ? "送信元設定" : null,
    !mail.fromVerified ? "送信ドメイン確認" : null,
    !trueFlag(env.AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK)
      ? "bounce・complaint運用確認"
      : null,
    !mail.deliveryVerified ? "限定配送確認" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    generatedAt: now.toISOString(),
    deployment: {
      deploymentId: safeRuntimeValue(env.VERCEL_DEPLOYMENT_ID),
      buildId: safeRuntimeValue(
        env.VERCEL_GIT_COMMIT_SHA ?? env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
      ),
      deploymentAt: safeRuntimeValue(
        env.VERCEL_DEPLOYMENT_CREATED_AT ?? env.OPERATIONS_DEPLOYMENT_AT,
      ),
      productionUrl: "https://www.anzen-ai-portal.jp/",
      health: safeOperationalStatus(env.OPERATIONS_HEALTH_STATUS),
      rollbackDeploymentId: safeRuntimeValue(
        env.OPERATIONS_ROLLBACK_DEPLOYMENT_ID,
        "設定待ち",
      ),
      lastSmoke: {
        status: lastSmokeStatus,
        at: safeRuntimeValue(env.OPERATIONS_LAST_SMOKE_AT, "未記録"),
        deploymentId: lastSmokeDeployment,
        scope:
          "限定read-only production smokeの記録。現在deploymentとは別に表示",
      },
      lastFullGate: {
        status: fullGateStatus,
        at: safeRuntimeValue(env.OPERATIONS_LAST_FULL_GATE_AT, "未記録"),
        scope: "現在のsource stateに対する最終full gate記録",
      },
      featureFlags: [
        {
          name: "RUM collection",
          enabled: rumReadiness.ready,
        },
        {
          name: "automation funnel collection",
          enabled: funnelReadiness.ready,
        },
        {
          name: "automation consultation intake",
          enabled: consultAvailability.accepting,
        },
        {
          name: "heat-illness index release",
          enabled: false,
        },
      ],
    },
    rum,
    funnel,
    errors: {
      observedAt: "2026-07-29 15:50–15:52 JST",
      deployment: "dpl_FVEvuUYTeWTsegXRDEx8Vv7Th9aB",
      source: "固定時点のprivacy-safe本番ログレビュー（live queryではない）",
      rows: [
        {
          statusClass: "4xx",
          routeTemplate: "/[public-page]",
          count: 2,
          lastObserved: "2026-07-29",
          previousPeriodChange: null,
          trafficClass: "likely-automated（UAなしのため断定不可）",
          reproduction: "主要機能影響を再現せず",
          responseStatus: "monitoring",
        },
        {
          statusClass: "5xx",
          routeTemplate: "/api/automation-consult",
          count: 1,
          lastObserved: "2026-07-29",
          previousPeriodChange: null,
          trafficClass: "smoke",
          reproduction: "Webフォーム停止時の期待503",
          responseStatus: "accepted-fail-closed",
        },
        {
          statusClass: "429",
          routeTemplate: "all monitored templates",
          count: 0,
          lastObserved: "観測なし",
          previousPeriodChange: null,
          trafficClass: "区別対象なし",
          reproduction: "なし",
          responseStatus: "monitoring",
        },
        {
          statusClass: "timeout",
          routeTemplate: "all monitored templates",
          count: 0,
          lastObserved: "観測なし",
          previousPeriodChange: null,
          trafficClass: "区別対象なし",
          reproduction: "なし",
          responseStatus: "monitoring",
        },
      ],
      privacy:
        "raw body・query・IP・Cookie・token・個人識別子は保存・表示しない",
    },
    features: [
      [
        "JMA",
        smokeVerifiedFeatureStatus,
        `${smokeSnapshotNote}・公開JSON・fail-closed`,
      ],
      [
        "Open-Meteo",
        smokeVerifiedFeatureStatus,
        `${smokeSnapshotNote}・キー不要・fallbackあり`,
      ],
      [
        "WBGT",
        smokeVerifiedFeatureStatus,
        `${smokeSnapshotNote}・推定値と実測値を区別`,
      ],
      [
        "chatbot",
        smokeVerifiedFeatureStatus,
        `${smokeSnapshotNote}・引用・保留境界あり`,
      ],
      [
        "chemical RA",
        smokeVerifiedFeatureStatus,
        `${smokeSnapshotNote}・簡易スクリーニング`,
      ],
      ["KY", smokeVerifiedFeatureStatus, `${smokeSnapshotNote}・人手確認前提`],
      [
        "工程書",
        smokeVerifiedFeatureStatus,
        `${smokeSnapshotNote}・人手確認前提`,
      ],
      [
        "資格finder",
        smokeVerifiedFeatureStatus,
        `${smokeSnapshotNote}・未確認は保留`,
      ],
      [
        "事故検索",
        smokeVerifiedFeatureStatus,
        `${smokeSnapshotNote}・syntheticを区別`,
      ],
      [
        "法令検索",
        smokeVerifiedFeatureStatus,
        `${smokeSnapshotNote}・一次資料を優先`,
      ],
      [
        "サイネージ",
        smokeVerifiedFeatureStatus,
        `${smokeSnapshotNote}・stale/offline表示あり`,
      ],
      [
        "自動化相談",
        consultAvailability.accepting ? "operational" : "pending-external",
        consultAvailability.label,
      ],
      [
        "RUM",
        rumReadiness.ready ? "operational" : "unavailable",
        "明示同意・production only・非PII",
      ],
      ["Search Console", "pending-external", "property権限待ち"],
      ["熱中症review", "pending-external", "専門家承認待ち"],
      [
        "cron",
        configured(env.CRON_SECRET) && rumReadiness.ready
          ? "operational"
          : configured(env.CRON_SECRET)
            ? "degraded"
            : "unavailable",
        "server secret必須",
      ],
      [
        "health",
        safeOperationalStatus(env.OPERATIONS_HEALTH_STATUS),
        "現在deploymentのsmoke完了記録がない場合はunknown",
      ],
    ] as Array<[string, OperationalStatus, string]>,
    consultation: {
      currentStatus: consultAvailability.status,
      accepting: consultAvailability.accepting,
      label: consultAvailability.label,
      recipientConfigured: mail.recipientConfigured,
      fromConfigured: mail.fromConfigured,
      providerConfigured: mail.providerConfigured,
      providerReadiness: mail.status,
      sharedState:
        configured(env.AUTOMATION_CONSULT_STATE_BACKEND) &&
        trueFlag(env.AUTOMATION_CONSULT_STATE_VERIFIED)
          ? "active"
          : "unavailable",
      rateLimit:
        configured(env.AUTOMATION_CONSULT_STATE_HASH_SECRET) &&
        configured(env.AUTOMATION_CONSULT_STATE_BACKEND)
          ? "active"
          : "unavailable",
      idempotency:
        configured(env.AUTOMATION_CONSULT_STATE_BACKEND) &&
        configured(env.AUTOMATION_CONSULT_STATE_HASH_SECRET)
          ? "active"
          : "unavailable",
      lastDryRun: {
        status: "PASS",
        at: "2026-07-29 JST",
        scope: "固定時点のartifact snapshot・provider呼出0",
      },
      lastProviderAccepted: {
        status: "未実施",
        at: "2026-07-29 JST",
        scope: "資格情報不足のため送信していない",
      },
      bounceComplaint: mail.bounceComplaintPolicy,
      bounceOrComplaintObserved: mail.bounceOrComplaintObserved,
      formDisplayCondition:
        "受信先・provider・From・送信ドメイン・bounce/complaint方針・共有state・rate limit・idempotency・限定配送確認がすべて有効",
      missingItems: consultMissing,
    },
    searchConsole: {
      status: "blocked-external",
      serviceAccount:
        "token/API有効、対象property権限なし（識別情報は画面非表示）",
      oauth: "invalid_grant（再試行停止）",
      targetProperty: "sc-domain:anzen-ai-portal.jp",
      requiredExternalAction:
        "既存service accountを対象propertyへ1回だけ追加する",
      requiredPermission: "Full user（sitemap送信・URL inspectionに必要）",
      lastCheckedAt: "2026-07-29 JST",
      clicks: null,
      impressions: null,
      ctr: null,
      averagePosition: null,
      indexStatus: "取得不能",
      sitemapStatus: "未送信（権限待ち）",
      coreWebVitals: "取得不能",
      previewExcluded: true,
      operationsCron:
        env.SEARCH_CONSOLE_OPERATIONS_ENABLED?.trim().toLowerCase() === "true"
          ? "enabled"
          : "disabled-until-property-access",
      snapshotKind: "2026-07-29 JSTの外部readiness確認",
    },
    dataQuality: {
      sourceRegistryCount: sources.length,
      stale: sourceCounts.stale ?? 0,
      quarantine: sourceCounts.quarantined ?? 0,
      humanReviewPending: sources.filter(
        (source) => source.status === "pending" || source.verifiedAt === null,
      ).length,
      brokenSource: sourceCounts.unavailable ?? 0,
      hashMismatch: 0,
      claimDrift: 0,
      synthetic: "存在・明示ラベル・公式データと分離",
      official: sources.filter(
        (source) =>
          source.status === "humanVerified" ||
          source.status === "snapshotConfirmed" ||
          source.status === "urlConfirmed",
      ).length,
      lastSuccessfulUpdate: verifiedDates.at(-1) ?? "未記録",
      lastFailure: "重大な再現可能障害なし（2026-07-29）",
    },
    heatReview: {
      legal: 12,
      medical: 15,
      editorial: 18,
      duplicate: 1,
      sourceGap: 0,
      needsRewrite: 0,
      approved: 0,
      pending: 46,
      noindex: true,
      sitemapExcluded: true,
      lastClaimDrift: 0,
      importValidator: "ready",
      asOf: "2026-07-29 JST",
      snapshotKind: "外部承認台帳の固定時点snapshot",
      releaseBoundary:
        "必要な全専門領域承認と人間の最終公開承認が揃うまでindex解除不可",
    },
    qualityGates: QUALITY_GATE_NAMES.map((name) => ({
      name,
      status: fullGateStatus,
      lastRunAt: safeRuntimeValue(env.OPERATIONS_LAST_FULL_GATE_AT, "未記録"),
    })),
    externalReadiness: {
      mailProvider: mail.status,
      searchConsole: "blocked-external",
      rum: rumReadiness.ready ? "active" : "missing",
      funnel: funnelReadiness.ready ? "active" : "missing",
      heatReviewImport: "ready",
    },
  };
}

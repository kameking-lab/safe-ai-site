import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Monitor,
  Radio,
  Settings2,
} from "lucide-react";
import type { GovernanceSql } from "@/lib/chemical/ra-governance-repository";
import {
  listSignageFleet,
  type SignageFleetRow,
} from "@/lib/signage/fleet-repository";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAccess } from "@/lib/server/organization-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "サイネージ多拠点管理",
  description:
    "認証済み端末の接続、heartbeat、配信版、acknowledgement、段階配信、rollbackを組織・拠点別に確認します。",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: null as unknown as string },
};

function scope(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value)
    ? value
    : null;
}

function dateTime(value: Date | null): string {
  if (!value) return "接続未確認";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(value);
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    online: "オンライン",
    delayed: "遅延",
    offline: "オフライン",
    stale: "情報期限切れ",
    degraded: "一部劣化",
    maintenance: "保守中",
    emergency: "緊急表示",
    unknown: "接続未確認",
  };
  return labels[value] ?? "状態不明";
}

function statusClass(value: string): string {
  if (value === "online") return "bg-emerald-100 text-emerald-900";
  if (value === "emergency" || value === "offline") {
    return "bg-rose-100 text-rose-900";
  }
  if (["delayed", "stale", "degraded"].includes(value)) {
    return "bg-amber-100 text-amber-900";
  }
  return "bg-slate-200 text-slate-800";
}

export default async function SignageFleetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const organizationId = scope(query.organization);
  let records: SignageFleetRow[] = [];
  let organizationName: string | null = null;
  let unavailable:
    | "scope"
    | "authentication_not_configured"
    | "authentication_required"
    | "database_unavailable"
    | "membership_required"
    | "insufficient_role"
    | "fleet_unavailable"
    | null = null;
  if (!organizationId) {
    unavailable = "scope";
  } else {
    const access = await requireOrganizationAccess(organizationId, "viewer");
    if (!access.ok) {
      unavailable = access.reason;
    } else if (!prisma) {
      unavailable = "database_unavailable";
    } else {
      organizationName = access.organizationName;
      try {
        records = await listSignageFleet(
          prisma as unknown as GovernanceSql,
          organizationId,
        );
      } catch {
        unavailable = "fleet_unavailable";
      }
    }
  }

  const sites = [...new Map(records.map((record) => [record.siteId, record])).values()];
  const devices = records.filter((record) => record.deviceId);
  const active = devices.filter((record) =>
    ["online", "emergency"].includes(record.effectiveStatus),
  ).length;
  const attention = devices.filter((record) =>
    ["delayed", "offline", "stale", "degraded"].includes(record.effectiveStatus),
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <nav className="mb-4 flex flex-wrap gap-2 print:hidden" aria-label="サイネージ操作">
          <Link
            href="/signage"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            サイネージ表示へ
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold"
          >
            ポータルへ戻る
          </Link>
        </nav>

        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-cyan-100 p-2 text-cyan-900">
              <Monitor className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold text-cyan-900">認証必須・実端末のみ</p>
              <h1 className="text-2xl font-black">サイネージ多拠点管理</h1>
            </div>
          </div>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-700">
            拠点・端末、最終接続、ソフトウェア版、配信設定版、段階配信、acknowledgement、
            stale／offline、緊急override、rollbackを監視します。ブラウザーPreviewやmockは本番端末数に含めません。
          </p>
        </header>

        {unavailable ? (
          <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-900"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-bold text-amber-950">端末未登録・接続未確認</h2>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  認証、組織権限、共有DB、実端末登録を確認できないため、運用中とは表示しません。
                  公開サイネージ画面はPreview用途として利用できますが、この管理画面の実端末には数えません。
                </p>
                <p className="mt-2 text-xs text-amber-800">接続状態: {unavailable}</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-5" aria-labelledby="fleet-summary">
              <div>
                <h2 id="fleet-summary" className="text-lg font-black">
                  {organizationName} の実端末
                </h2>
                <p className="text-sm text-slate-600">
                  DBへ登録された組織境界内の拠点・端末だけを集計しています。
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ["拠点", sites.length],
                  ["登録端末", devices.length],
                  ["接続中", active],
                  ["要確認", attention],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-bold text-slate-600">{label}</p>
                    <p className="mt-1 text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sites.map((site) => {
                const siteDevices = devices.filter(
                  (device) => device.siteId === site.siteId,
                );
                return (
                  <article
                    key={site.siteId}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <h3 className="font-black">{site.siteName}</h3>
                    <p className="text-xs text-slate-600">拠点コード: {site.siteCode}</p>
                    <p className="mt-2 text-sm">
                      {siteDevices.length
                        ? `登録端末 ${siteDevices.length}台`
                        : "端末未登録"}
                    </p>
                    <p className="text-xs text-slate-600">
                      offline／stale alert対象:{" "}
                      {
                        siteDevices.filter((device) =>
                          ["offline", "stale"].includes(device.effectiveStatus),
                        ).length
                      }
                      台
                    </p>
                  </article>
                );
              })}
            </section>

            <section className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="bg-slate-200 text-xs">
                  <tr>
                    <th className="p-3">拠点・端末</th>
                    <th className="p-3">状態</th>
                    <th className="p-3">最終接続</th>
                    <th className="p-3">ソフトウェア</th>
                    <th className="p-3">配信版</th>
                    <th className="p-3">layout</th>
                    <th className="p-3">rollout</th>
                    <th className="p-3">acknowledgement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {records.map((record) =>
                    record.deviceId ? (
                      <tr key={record.deviceId}>
                        <td className="p-3">
                          <strong>{record.siteName}</strong>
                          <span className="block text-slate-600">
                            {record.deviceName}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(record.effectiveStatus)}`}
                          >
                            {statusLabel(record.effectiveStatus)}
                          </span>
                        </td>
                        <td className="p-3">{dateTime(record.lastSeenAt)}</td>
                        <td className="p-3">
                          {record.softwareVersion ?? "未報告"}
                        </td>
                        <td className="p-3">
                          {record.configurationVersion ?? "未配信"}
                          {record.rolloutConfigurationVersion &&
                          record.configurationVersion !==
                            record.rolloutConfigurationVersion ? (
                            <span className="block text-xs font-bold text-amber-800">
                              version mismatch
                            </span>
                          ) : null}
                        </td>
                        <td className="p-3">{record.assignedLayout ?? "未設定"}</td>
                        <td className="p-3">
                          {record.rolloutStage ?? "なし"} /{" "}
                          {record.rolloutStatus ?? "なし"}
                        </td>
                        <td className="p-3">{dateTime(record.acknowledgedAt)}</td>
                      </tr>
                    ) : (
                      <tr key={`empty-${record.siteId}`}>
                        <td className="p-3 font-bold">{record.siteName}</td>
                        <td className="p-3" colSpan={7}>
                          端末未登録
                        </td>
                      </tr>
                    ),
                  )}
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-600">
                        拠点未登録です。
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          </>
        )}

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Settings2,
              title: "配信・schedule",
              text: "署名済みconfigをpreview→canary→staged→allの順で配信し、checksum一致を確認します。",
            },
            {
              icon: Radio,
              title: "heartbeat・alert",
              text: "端末tokenをHMAC化し、nonce再利用を拒否。遅延、stale、offline、版不一致を区別します。",
            },
            {
              icon: AlertTriangle,
              title: "emergency・rollback",
              text: "緊急overrideも署名設定として配信し、端末ackを確認。直前configへのrollbackを別履歴で残します。",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <item.icon className="h-5 w-5 text-cyan-900" aria-hidden="true" />
              <h2 className="mt-2 font-black">{item.title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">{item.text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

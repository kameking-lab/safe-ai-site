// トップページ「本日の安全トピック」3本柱のデータ選定（サーバー側）。
//
// C-1（モバイル実速度の構造是正）: 以前は client の home-three-pillars.tsx が
// 事故データセット全件（生約340KB）・法改正データ・JMA警報JSONを静的 import して
// クライアント側で選定していた。トップ("/")の client バンドルが肥大するうえ、
// 全ページのロゴ等から "/" へ Link しているため、RSC プリフェッチ経由で
// サイト全ページがこのデータチャンクをダウンロードしていた。
// 選定はこのモジュールで server（page.tsx）側に移し、結果の小さな値だけを
// props で渡す。JMA警報JSONは定期コミット→再デプロイで更新されるため、
// サーバー計算でも鮮度は従来（静的バンドル）と同等。

import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import warningsData from "@/data/jma/warnings.json";
import type { AccidentCase, LawRevisionCore } from "@/lib/types/domain";
import { isAccidentEligibleForOperationalEvidence } from "@/lib/accident-source";

export type WarningLevel = "warning" | "advisory" | "none";

export type WarningEntry = {
  iso: string;
  prefecture: string;
  level: WarningLevel;
  headline: string;
  reportDatetime?: string;
};

export type HomeWeatherTrustStatus =
  | "live"
  | "stale"
  | "partial"
  | "unavailable";

export type HomeWeatherState = {
  status: HomeWeatherTrustStatus;
  warnings: WarningEntry[];
  fetchedAt: string | null;
  targetAt: string | null;
  checkedAt: string;
  sourceUrl: "https://www.jma.go.jp/bosai/warning/";
  reason:
    | "verified_current_snapshot"
    | "snapshot_too_old"
    | "warning_report_too_old"
    | "incomplete_prefecture_coverage"
    | "invalid_snapshot"
    | "future_timestamp";
};

export type HomeThreePillarsData = {
  fatal: AccidentCase | null;
  lawRevisions: LawRevisionCore[];
  weather: HomeWeatherState;
};

const PREFECTURE_LABELS: Record<string, string> = {
  "JP-01": "北海道",
  "JP-02": "青森県",
  "JP-03": "岩手県",
  "JP-04": "宮城県",
  "JP-05": "秋田県",
  "JP-06": "山形県",
  "JP-07": "福島県",
  "JP-08": "茨城県",
  "JP-09": "栃木県",
  "JP-10": "群馬県",
  "JP-11": "埼玉県",
  "JP-12": "千葉県",
  "JP-13": "東京都",
  "JP-14": "神奈川県",
  "JP-15": "新潟県",
  "JP-16": "富山県",
  "JP-17": "石川県",
  "JP-18": "福井県",
  "JP-19": "山梨県",
  "JP-20": "長野県",
  "JP-21": "岐阜県",
  "JP-22": "静岡県",
  "JP-23": "愛知県",
  "JP-24": "三重県",
  "JP-25": "滋賀県",
  "JP-26": "京都府",
  "JP-27": "大阪府",
  "JP-28": "兵庫県",
  "JP-29": "奈良県",
  "JP-30": "和歌山県",
  "JP-31": "鳥取県",
  "JP-32": "島根県",
  "JP-33": "岡山県",
  "JP-34": "広島県",
  "JP-35": "山口県",
  "JP-36": "徳島県",
  "JP-37": "香川県",
  "JP-38": "愛媛県",
  "JP-39": "高知県",
  "JP-40": "福岡県",
  "JP-41": "佐賀県",
  "JP-42": "長崎県",
  "JP-43": "熊本県",
  "JP-44": "大分県",
  "JP-45": "宮崎県",
  "JP-46": "鹿児島県",
  "JP-47": "沖縄県",
};

export function isVerifiableOfficialAccident(accident: AccidentCase): boolean {
  return isAccidentEligibleForOperationalEvidence(accident);
}

function pickLatestFatalAccident(): AccidentCase | null {
  const today = new Date().toISOString().slice(0, 10);
  const fatal = getAccidentCasesDataset().filter(
    (c) =>
      c.severity === "死亡" &&
      c.occurredOn <= today &&
      isVerifiableOfficialAccident(c),
  );
  if (fatal.length === 0) return null;
  return [...fatal].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))[0] ?? null;
}

function pickRecentLawRevisions(): LawRevisionCore[] {
  return [...lawRevisionCores]
    .sort((a, b) => {
      const aKey = a.enforcement_date || a.publishedAt;
      const bKey = b.enforcement_date || b.publishedAt;
      return bKey.localeCompare(aKey);
    })
    .slice(0, 3);
}

type WarningsShape = {
  fetchedAt?: unknown;
  byIso?: Record<
    string,
    {
      level?: unknown;
      entries?: {
        headline?: unknown;
        level?: unknown;
        reportDatetime?: unknown;
      }[];
    }
  >;
};

const JMA_WARNING_URL = "https://www.jma.go.jp/bosai/warning/" as const;
const SNAPSHOT_MAX_AGE_MS = 90 * 60 * 1_000;
const WARNING_REPORT_MAX_AGE_MS = 12 * 60 * 60 * 1_000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1_000;

function weatherState(
  status: HomeWeatherTrustStatus,
  reason: HomeWeatherState["reason"],
  now: number,
  options?: {
    warnings?: WarningEntry[];
    fetchedAt?: string | null;
    targetAt?: string | null;
  },
): HomeWeatherState {
  return {
    status,
    reason,
    warnings: status === "live" ? (options?.warnings ?? []) : [],
    fetchedAt: options?.fetchedAt ?? null,
    targetAt: options?.targetAt ?? null,
    checkedAt: new Date(now).toISOString(),
    sourceUrl: JMA_WARNING_URL,
  };
}

/**
 * A repository snapshot is not current weather merely because it can be
 * parsed. Only complete, recent, non-future data may support an all-clear or
 * active-warning statement. Every other state withholds the conclusion.
 */
export function assessHomeWarningWeather(
  input: unknown,
  now = Date.now(),
): HomeWeatherState {
  if (!input || typeof input !== "object") {
    return weatherState("unavailable", "invalid_snapshot", now);
  }
  const data = input as WarningsShape;
  if (!data.byIso || typeof data.byIso !== "object") {
    return weatherState("unavailable", "invalid_snapshot", now);
  }

  const expectedIsos = Object.keys(PREFECTURE_LABELS);
  const actualIsos = Object.keys(data.byIso);
  if (
    actualIsos.length !== expectedIsos.length ||
    expectedIsos.some((iso) => !(iso in data.byIso!))
  ) {
    return weatherState("partial", "incomplete_prefecture_coverage", now, {
      fetchedAt: typeof data.fetchedAt === "string" ? data.fetchedAt : null,
    });
  }

  if (typeof data.fetchedAt !== "string") {
    return weatherState("unavailable", "invalid_snapshot", now);
  }
  const fetchedMs = Date.parse(data.fetchedAt);
  if (!Number.isFinite(fetchedMs)) {
    return weatherState("unavailable", "invalid_snapshot", now);
  }
  if (fetchedMs > now + FUTURE_TOLERANCE_MS) {
    return weatherState("unavailable", "future_timestamp", now, {
      fetchedAt: data.fetchedAt,
    });
  }
  if (now - fetchedMs > SNAPSHOT_MAX_AGE_MS) {
    return weatherState("stale", "snapshot_too_old", now, {
      fetchedAt: data.fetchedAt,
    });
  }

  const records = Object.values(data.byIso);
  if (
    records.some(
      (record) =>
        !record ||
        typeof record !== "object" ||
        !(
          record.level === "warning" ||
          record.level === "advisory" ||
          record.level === "none"
        ) ||
        !Array.isArray(record.entries) ||
        ((record.level === "warning" || record.level === "advisory") &&
          (typeof record.entries[0]?.headline !== "string" ||
            typeof record.entries[0]?.reportDatetime !== "string")),
    )
  ) {
    return weatherState("unavailable", "invalid_snapshot", now, {
      fetchedAt: data.fetchedAt,
    });
  }

  const all: WarningEntry[] = Object.entries(data.byIso).map(([iso, v]) => {
    const first = Array.isArray(v.entries) ? v.entries[0] : undefined;
    const headline =
      typeof first?.headline === "string" ? first.headline : "";
    const reportDatetime =
      typeof first?.reportDatetime === "string"
        ? first.reportDatetime
        : undefined;
    const level: WarningLevel =
      v.level === "warning" || v.level === "advisory" || v.level === "none"
        ? v.level
        : "none";
    return {
      iso,
      prefecture: PREFECTURE_LABELS[iso] ?? iso,
      level,
      headline,
      reportDatetime,
    };
  });

  const activeEntries = all.filter(
    (entry) =>
      (entry.level === "warning" || entry.level === "advisory") &&
      entry.headline.length > 0,
  );
  const reportTimes = activeEntries
    .map((entry) =>
      entry.reportDatetime ? Date.parse(entry.reportDatetime) : Number.NaN,
    )
    .filter(Number.isFinite);
  if (
    activeEntries.some((entry) => !entry.reportDatetime) ||
    reportTimes.length !== activeEntries.length
  ) {
    return weatherState("unavailable", "invalid_snapshot", now, {
      fetchedAt: data.fetchedAt,
    });
  }
  if (reportTimes.some((value) => value > now + FUTURE_TOLERANCE_MS)) {
    return weatherState("unavailable", "future_timestamp", now, {
      fetchedAt: data.fetchedAt,
    });
  }
  const targetAt =
    reportTimes.length > 0
      ? new Date(Math.max(...reportTimes)).toISOString()
      : data.fetchedAt;
  if (reportTimes.some((value) => now - value > WARNING_REPORT_MAX_AGE_MS)) {
    return weatherState("stale", "warning_report_too_old", now, {
      fetchedAt: data.fetchedAt,
      targetAt,
    });
  }

  const warnings = all.filter((e) => e.level === "warning");
  if (warnings.length > 0) {
    return weatherState("live", "verified_current_snapshot", now, {
      warnings: warnings.slice(0, 5),
      fetchedAt: data.fetchedAt,
      targetAt,
    });
  }
  // 警報がない場合は注意報を最大3件表示（屋外作業の参考として）
  return weatherState("live", "verified_current_snapshot", now, {
    warnings: all
      .filter((e) => e.level === "advisory" && e.headline)
      .slice(0, 3),
    fetchedAt: data.fetchedAt,
    targetAt,
  });
}

export function getHomeThreePillarsData(): HomeThreePillarsData {
  return {
    fatal: pickLatestFatalAccident(),
    lawRevisions: pickRecentLawRevisions(),
    weather: assessHomeWarningWeather(warningsData),
  };
}

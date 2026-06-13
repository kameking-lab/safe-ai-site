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
import { realLawRevisions } from "@/data/mock/real-law-revisions";
import { realLawRevisionsExtra } from "@/data/mock/real-law-revisions-extra";
import warningsData from "@/data/jma/warnings.json";
import type { AccidentCase, LawRevisionCore } from "@/lib/types/domain";

export type WarningLevel = "warning" | "advisory" | "none";

export type WarningEntry = {
  iso: string;
  prefecture: string;
  level: WarningLevel;
  headline: string;
  reportDatetime?: string;
};

export type HomeThreePillarsData = {
  fatal: AccidentCase | null;
  lawRevisions: LawRevisionCore[];
  warnings: WarningEntry[];
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

function pickLatestFatalAccident(): AccidentCase | null {
  const today = new Date().toISOString().slice(0, 10);
  const fatal = getAccidentCasesDataset().filter(
    (c) => c.severity === "死亡" && c.occurredOn <= today
  );
  if (fatal.length === 0) return null;
  return [...fatal].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))[0] ?? null;
}

function pickRecentLawRevisions(): LawRevisionCore[] {
  const merged = [...realLawRevisions, ...realLawRevisionsExtra];
  return [...merged]
    .sort((a, b) => {
      const aKey = a.enforcement_date || a.publishedAt;
      const bKey = b.enforcement_date || b.publishedAt;
      return bKey.localeCompare(aKey);
    })
    .slice(0, 3);
}

function pickWarningWeather(): WarningEntry[] {
  type WarningsShape = {
    byIso?: Record<
      string,
      {
        level?: string;
        entries?: { headline?: string; level?: string; reportDatetime?: string }[];
      }
    >;
  };
  const data = warningsData as WarningsShape;
  if (!data.byIso) return [];
  const all: WarningEntry[] = Object.entries(data.byIso).map(([iso, v]) => {
    const headline = v.entries?.[0]?.headline ?? "";
    const reportDatetime = v.entries?.[0]?.reportDatetime;
    const level = (v.level as WarningLevel) ?? "none";
    return {
      iso,
      prefecture: PREFECTURE_LABELS[iso] ?? iso,
      level,
      headline,
      reportDatetime,
    };
  });
  const warnings = all.filter((e) => e.level === "warning");
  if (warnings.length > 0) return warnings.slice(0, 5);
  // 警報がない場合は注意報を最大3件表示（屋外作業の参考として）
  return all.filter((e) => e.level === "advisory" && e.headline).slice(0, 3);
}

export function getHomeThreePillarsData(): HomeThreePillarsData {
  return {
    fatal: pickLatestFatalAccident(),
    lawRevisions: pickRecentLawRevisions(),
    warnings: pickWarningWeather(),
  };
}

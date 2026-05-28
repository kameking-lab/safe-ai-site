/**
 * P1-1: e-Gov 法令API v2 からの法改正「構造データ」自動取込ETL（news-deep-audit 2026-05-28）
 *
 * 取得するのは事実（形式）データのみ:
 *   法令名 / 法令番号 / 改正法令名 / 公布日 / 施行日 / 施行予定日 / 施行状況 / 更新日時 / e-Gov URL
 * 内容の解釈・要約は一切行わない（誤読＝信用毀損の回避。社長確定要件#3）。
 *
 * 設計（月次速報ETLパターン踏襲）:
 * - 形式検証: 法令名＋公布日(YYYY-MM-DD)が取れない法令はスキップし skipped に計上（未確認明記）
 * - 推測値禁止: 欠損は空のまま。日付の創作はしない
 * - diff-only: fetchedAt を除く実データに差分が無ければ書き込まない（ビルドコスト削減）
 * - 出典明示: 政府標準利用規約2.0（商用可・出典明示）。各レコードに e-Gov URL を付与
 * - APIキー不要（新規env追加なし）
 *
 * 実行: npx tsx scripts/etl/egov-revisions-fetch.ts
 * 出力: web/src/data/law-revisions/egov-revisions.json
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const API_BASE = "https://laws.e-gov.go.jp/api/2/laws";
const OUT_PATH = join(process.cwd(), "src/data/law-revisions/egov-revisions.json");

// 労働安全衛生の中核法令（law_id は e-Gov で実在性を確認済）。すべて厚生労働省所管。
const TARGET_LAWS: { lawId: string; lawShort: string }[] = [
  { lawId: "347AC0000000057", lawShort: "安衛法" },
  { lawId: "347CO0000000318", lawShort: "安衛令" },
  { lawId: "347M50002000032", lawShort: "安衛則" },
  { lawId: "322AC0000000049", lawShort: "労基法" },
  { lawId: "322M40000100023", lawShort: "労基則" },
  { lawId: "335AC0000000030", lawShort: "じん肺法" },
  { lawId: "350AC0000000028", lawShort: "作環測法" },
  { lawId: "347M50002000034", lawShort: "クレーン則" },
  { lawId: "347M50002000036", lawShort: "有機則" },
  { lawId: "347M50002000039", lawShort: "特化則" },
  { lawId: "354M50002000018", lawShort: "粉じん則" },
  { lawId: "417M60000100021", lawShort: "石綿則" },
  { lawId: "347M50002000042", lawShort: "酸欠則" },
  { lawId: "347M50002000041", lawShort: "電離則" },
  { lawId: "347M50002000033", lawShort: "ボイラー則" },
  { lawId: "347M50002000037", lawShort: "鉛則" },
  { lawId: "347M50002000040", lawShort: "高圧則" },
  { lawId: "347M50002000035", lawShort: "ゴンドラ則" },
  { lawId: "347M50002000043", lawShort: "事務所則" },
  { lawId: "347M50002000038", lawShort: "四アルキル鉛則" },
];

// P2-1: 法令→影響業種タグ（保守的。一般法令＝全業種のためタグ無し＝UIで「全業種」表示）。
// 業種の関連付けのみで、条文内容の解釈はしない。
const INDUSTRY_TAGS_BY_LAW: Record<string, string[]> = {
  特化則: ["chemical", "manufacturing"],
  有機則: ["chemical", "manufacturing"],
  粉じん則: ["construction", "manufacturing"],
  石綿則: ["construction"],
  鉛則: ["chemical", "manufacturing"],
  四アルキル鉛則: ["chemical"],
  電離則: ["healthcare", "manufacturing"],
  酸欠則: ["construction", "manufacturing"],
  作環測法: ["chemical", "manufacturing"],
  じん肺法: ["construction", "manufacturing"],
  クレーン則: ["construction", "manufacturing"],
  ボイラー則: ["manufacturing"],
  ゴンドラ則: ["construction"],
  高圧則: ["construction"],
  // 安衛法/安衛令/安衛則/労基法/労基則/事務所則 は全業種に関わるためタグ無し（UIで「全業種」）。
};

type LawRevisionRecord = {
  id: string;
  title: string;
  publishedAt: string;
  revisionNumber: string;
  kind: "law" | "ordinance" | "notice" | "guideline" | "other";
  category: string;
  issuer: string;
  summary: string;
  source: { url: string; label: string };
  official_notice_number: string;
  publication_date: string;
  enforcement_date: string;
  enforcement_status?: "enforced" | "upcoming" | "undetermined";
  source_url: string;
  industry_tags?: string[];
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;
function validYmd(s: unknown): s is string {
  return typeof s === "string" && YMD.test(s);
}

function kindFromLawType(lawType: string): LawRevisionRecord["kind"] {
  if (lawType === "Act") return "law";
  if (lawType === "CabinetOrder" || lawType === "MinisterialOrdinance") return "ordinance";
  return "other";
}
function categoryFromLawType(lawType: string): string {
  if (lawType === "Act") return "法律";
  if (lawType === "CabinetOrder") return "政令";
  if (lawType === "MinisterialOrdinance") return "省令";
  return "その他";
}
function normalizeStatus(raw: unknown): LawRevisionRecord["enforcement_status"] | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "currentenforced") return "enforced";
  if (v === "unenforced") return "upcoming";
  return undefined;
}

async function fetchLaw(lawId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${API_BASE}?law_id=${encodeURIComponent(lawId)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { laws?: Array<Record<string, unknown>> };
  return json.laws?.[0] ?? null;
}

function buildRecord(
  lawShort: string,
  law: Record<string, unknown>,
): LawRevisionRecord | null {
  const lawInfo = (law.law_info ?? {}) as Record<string, unknown>;
  const rev = (law.revision_info ?? {}) as Record<string, unknown>;
  const lawId = String(lawInfo.law_id ?? "");
  const lawTitle = typeof rev.law_title === "string" ? rev.law_title : "";
  const lawType = typeof rev.law_type === "string" ? rev.law_type : "";
  const promulgate = rev.amendment_promulgate_date;
  // 形式検証: 法令ID・法令名・改正公布日が揃わなければ採用しない（未確認）
  if (!lawId || !lawTitle || !validYmd(promulgate)) return null;

  const enforcement = validYmd(rev.amendment_enforcement_date)
    ? (rev.amendment_enforcement_date as string)
    : validYmd(rev.amendment_scheduled_enforcement_date)
      ? (rev.amendment_scheduled_enforcement_date as string)
      : "";
  const amendmentTitle = typeof rev.amendment_law_title === "string" ? rev.amendment_law_title : "";
  const amendmentNum = typeof rev.amendment_law_num === "string" ? rev.amendment_law_num : "";
  const enfComment = typeof rev.amendment_enforcement_comment === "string" ? rev.amendment_enforcement_comment : "";
  const status = normalizeStatus(rev.current_revision_status);
  const egovUrl = `https://laws.e-gov.go.jp/law/${lawId}`;

  // 事実のみのサマリ（解釈なし・公式誘導付き）
  const enfText = enforcement
    ? `施行${status === "upcoming" ? "予定" : "日"} ${enforcement}`
    : enfComment
      ? `施行時期: ${enfComment}`
      : "施行日未確認";
  const summary =
    `${lawShort}の最新改正（出典: e-Gov法令検索の構造データ）。` +
    (amendmentTitle ? `改正法令「${amendmentTitle}」。` : "") +
    `公布 ${promulgate as string}、${enfText}。改正内容の詳細はe-Govの原文で必ずご確認ください。`;

  return {
    id: `lr-egov-${lawId}-${(enforcement || (promulgate as string)).replace(/-/g, "")}`,
    title: amendmentTitle ? `${lawTitle}（${amendmentTitle}）` : `${lawTitle}（最新改正）`,
    publishedAt: promulgate as string,
    revisionNumber: amendmentNum,
    kind: kindFromLawType(lawType),
    category: categoryFromLawType(lawType),
    issuer: "厚生労働省",
    summary,
    source: { url: egovUrl, label: `e-Gov ${lawTitle}` },
    official_notice_number: "",
    publication_date: promulgate as string,
    enforcement_date: enforcement,
    ...(status ? { enforcement_status: status } : {}),
    source_url: egovUrl,
    ...(INDUSTRY_TAGS_BY_LAW[lawShort] ? { industry_tags: INDUSTRY_TAGS_BY_LAW[lawShort] } : {}),
  };
}

function stripFetchedAt(json: string): string {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    delete obj.fetchedAt;
    return JSON.stringify(obj);
  } catch {
    return json;
  }
}

async function main() {
  const records: LawRevisionRecord[] = [];
  let skipped = 0;
  const skippedLaws: string[] = [];

  for (const { lawId, lawShort } of TARGET_LAWS) {
    try {
      const law = await fetchLaw(lawId);
      if (!law) {
        skipped += 1;
        skippedLaws.push(lawShort);
        continue;
      }
      const rec = buildRecord(lawShort, law);
      if (rec) records.push(rec);
      else {
        skipped += 1;
        skippedLaws.push(lawShort);
      }
    } catch {
      skipped += 1;
      skippedLaws.push(lawShort);
    }
    // 公的APIへの配慮で軽くウェイト
    await new Promise((r) => setTimeout(r, 200));
  }

  records.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const payload = {
    fetchedAt: new Date().toISOString(),
    source: "e-Gov 法令API v2（政府標準利用規約2.0・出典明示）",
    total: records.length,
    skipped,
    skippedLaws,
    revisions: records,
  };
  const nextJson = JSON.stringify(payload, null, 2);

  if (existsSync(OUT_PATH)) {
    const prev = readFileSync(OUT_PATH, "utf-8");
    if (stripFetchedAt(prev) === stripFetchedAt(nextJson)) {
      console.log(`[egov-revisions] no change (total=${records.length}, skipped=${skipped})`);
      return;
    }
  } else {
    mkdirSync(dirname(OUT_PATH), { recursive: true });
  }

  writeFileSync(OUT_PATH, nextJson + "\n", "utf-8");
  console.log(
    `[egov-revisions] wrote ${records.length} revisions (skipped ${skipped}${skippedLaws.length ? ": " + skippedLaws.join(",") : ""})`,
  );
}

main().catch((e) => {
  console.error("[egov-revisions] fatal:", e);
  process.exit(1);
});

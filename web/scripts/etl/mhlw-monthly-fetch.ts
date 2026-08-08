/**
 * P2-1 厚労省「労働災害発生状況（月次速報）」分析用Excel 定期取込ETL。
 *
 * 出典: 厚生労働省「職場のあんぜんサイト」労働災害発生状況（速報値）
 *       https://anzeninfo.mhlw.go.jp/information/sokuhou.html
 * 政府標準利用規約2.0に基づき出典明示で利用。
 *
 * 【誤読＝創作の防止（必須）】
 *  - 速報ページから最新の「分析用Excel」(r{年}_{月}_{sibou|sisyou}_bunseki.xlsx)を自動特定。
 *  - シート①「業種・局」のヘッダを厳格検証（業種大コード/業種小/計 の位置）。違えば全体スキップ＋ログ。
 *  - 各行のコード(整数)・全国計(非負整数)を検証。違反行はスキップ＋ログ（"未確認"件数として記録）。
 *  - 小計・総数とみられる行（名称に 計/総数/合計 を含む）は集計の二重計上を避けるため leaf から除外。
 *  - 推測値は一切作らない。取得不能・形式不一致なら出力JSONを更新しない（空コミット回避）。
 *
 * 実行: npx tsx web/scripts/etl/mhlw-monthly-fetch.ts
 * 出力: web/src/data/accidents/monthly-sokuhou.json（差分があるときのみ更新）
 */
import readXlsxFile from "read-excel-file/node";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { resolveOfficialMhlwExcelUrl } from "@/lib/etl/official-excel-source";

const SOKUHOU_PAGE = "https://anzeninfo.mhlw.go.jp/information/sokuhou.html";
const OUT_PATH = resolve(process.cwd(), "src/data/accidents/monthly-sokuhou.json");
const MAX_INDEX_BYTES = 2 * 1024 * 1024;
const MAX_XLSX_BYTES = 20 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

interface IndustryRow {
  bigCode: number;
  name: string;
  total: number;
}
interface SokuhouSet {
  period: string;
  sourceUrl: string;
  rows: IndustryRow[];
  skipped: number;
}
interface SokuhouData {
  source: string;
  fetchedAt: string;
  note: string;
  sibou: SokuhouSet | null;
  sisyou: SokuhouSet | null;
}

function log(msg: string) {
  console.log(`[mhlw-etl] ${msg}`);
}

async function fetchWithLimit(url: string, maxBytes: number): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "error" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const declaredSize = Number(res.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
      throw new Error(`response too large (${declaredSize} bytes)`);
    }
    const data = await res.arrayBuffer();
    if (data.byteLength > maxBytes) throw new Error(`response too large (${data.byteLength} bytes)`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** 速報ページから最新の bunseki Excel URL（死亡・死傷）を特定。 */
async function findLatestBunsekiUrls(): Promise<{ sibou?: string; sisyou?: string }> {
  const html = new TextDecoder().decode(await fetchWithLimit(SOKUHOU_PAGE, MAX_INDEX_BYTES));
  const re = /href="([^"]*?r(\d+)_(\d+)_(sibou|sisyou)_bunseki\.xlsx)"/g;
  let m: RegExpExecArray | null;
  const best: Record<string, { url: string; rank: number }> = {};
  while ((m = re.exec(html)) !== null) {
    const [, href, year, month, kind] = m;
    const rank = Number(year) * 100 + Number(month);
    const url = resolveOfficialMhlwExcelUrl(href);
    if (!url) continue;
    if (!best[kind] || rank > best[kind].rank) best[kind] = { url, rank };
  }
  return { sibou: best.sibou?.url, sisyou: best.sisyou?.url };
}

/** Excel(ArrayBuffer)からシート①を厳格検証し、業種小 leaf 行を抽出。 */
async function parseBunseki(buf: ArrayBuffer, sourceUrl: string): Promise<SokuhouSet | null> {
  const sheets = await readXlsxFile(Buffer.from(buf));
  const sheet = sheets.find((candidate) => candidate.sheet.includes("業種") && candidate.sheet.includes("局")) ?? sheets[0];
  if (!sheet) {
    log(`SKIP ${sourceUrl}: sheet① not found`);
    return null;
  }
  const grid = sheet.data;
  // ヘッダは行3（0-indexed 2）想定。タイトル/サブタイトルのズレに備え±2行を探索。
  let headerIdx = -1;
  for (let i = 0; i < Math.min(grid.length, 6); i += 1) {
    const r = grid[i] ?? [];
    if (String(r[0] ?? "").trim() === "業種大コード" && String(r[3] ?? "").trim() === "業種小") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    log(`SKIP ${sourceUrl}: header (業種大コード/業種小) not found`);
    return null;
  }
  const header = grid[headerIdx] as unknown[];
  const totalCol = header.findIndex((h) => {
    const s = String(h ?? "").trim();
    return s === "計" || s === "合計";
  });
  if (totalCol === -1) {
    log(`SKIP ${sourceUrl}: total column (計/合計) not found`);
    return null;
  }

  const period = String((grid[0]?.[0] as string) ?? "") + " / " + String((grid[1]?.[0] as string) ?? "");

  const rows: IndustryRow[] = [];
  let skipped = 0;
  const isInt = (v: unknown) => typeof v === "number" && Number.isInteger(v);
  for (let i = headerIdx + 1; i < grid.length; i += 1) {
    const r = grid[i] ?? [];
    const big = r[0];
    const mid = r[1];
    const small = r[2];
    const name = String(r[3] ?? "").trim();
    const total = r[totalCol];
    if (name === "") continue; // 空行
    // 小計・総数の疑い行は leaf から除外（二重計上回避）。
    if (/計|総数|合計/.test(name)) continue;
    // 厳格検証: コードは整数、全国計は非負整数。
    if (!isInt(big) || !isInt(mid) || !isInt(small) || !isInt(total) || (total as number) < 0) {
      skipped += 1;
      continue;
    }
    rows.push({ bigCode: big as number, name, total: total as number });
  }
  if (rows.length === 0) {
    log(`SKIP ${sourceUrl}: no valid rows`);
    return null;
  }
  log(`OK ${sourceUrl}: ${rows.length} rows, ${skipped} skipped(未確認)`);
  return { period, sourceUrl, rows, skipped };
}

async function fetchAndParse(url: string | undefined): Promise<SokuhouSet | null> {
  if (!url) return null;
  try {
    const buf = await fetchWithLimit(url, MAX_XLSX_BYTES);
    return await parseBunseki(buf, url);
  } catch (e) {
    log(`SKIP ${url}: ${e instanceof Error ? e.message : "error"}`);
    return null;
  }
}

async function main() {
  const urls = await findLatestBunsekiUrls();
  log(`latest bunseki: sibou=${urls.sibou ?? "none"} sisyou=${urls.sisyou ?? "none"}`);
  const sibou = await fetchAndParse(urls.sibou);
  const sisyou = await fetchAndParse(urls.sisyou);

  if (!sibou && !sisyou) {
    log("no data extracted; output not updated (空コミット回避)");
    return;
  }
  const data: SokuhouData = {
    source: "厚生労働省 職場のあんぜんサイト 労働災害発生状況（速報値・分析用Excel）",
    fetchedAt: new Date().toISOString(),
    note: "速報・累計値。業種小分類別の全国計を厚労省Excelからそのまま抽出（編集・加工: 集計列の抽出のみ）。確定値は年次プレス・e-Statを参照。",
    sibou,
    sisyou,
  };

  // 差分があるときのみ書き込み（fetchedAt 以外を比較してビルドコスト削減）。
  const next = JSON.stringify(data, null, 2);
  if (existsSync(OUT_PATH)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_PATH, "utf-8")) as SokuhouData;
      const strip = (d: SokuhouData) => JSON.stringify({ ...d, fetchedAt: "" });
      if (strip(prev) === strip(data)) {
        log("no change (fetchedAt以外); output not updated");
        return;
      }
    } catch {
      /* 破損時は上書き */
    }
  }
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, next + "\n", "utf-8");
  log(`written: ${OUT_PATH}`);
}

void main();

/**
 * 他法令（毒劇法・化管法・化審法・高圧ガス）タグの正本突合監査（O11・F2拡張）
 *
 * substance-legal-audit.ts（安衛法系）と同じ思想:
 * - 索引の自己検査: 参照号が snapshot に実在し nameContains が一致すること
 * - 表示タグ（concentration-limits.json regulationTags）との両方向突合:
 *     偽陽性: 正本から導出できないタグを表示 → 違反
 *     偽陰性: 正本から導出されるタグが表示に無い → 違反
 * - 毒劇法は「designated / 非該当確認済み(dokugekiNone) / 未突合」の3値。
 *   未突合CASの既存タグ（ミラー由来）は違反にしない（UI側で「未確認」を明示する）。
 *
 * other-laws-audit.test.ts がこの監査を CI に常設する。
 */
import { OTHER_LAWS_CAS_INDEX } from "./other-laws-cas-index";
import {
  DOKUGEKI_TABLES,
  dokugekiClassOfEntry,
  deriveKakanho,
  kashinhoEntryOf,
  KOUATSU_GAS_NAMES,
} from "./substance-legal-profile";

export type OtherLawsViolation = {
  kind:
    | "index-stale" // 索引の号参照が snapshot と不一致（改正 or 誤登録）
    | "dokugeki-missing" // 正本該当なのに poison-control タグが無い（偽陰性）
    | "dokugeki-overclaim" // 非該当確認済みなのに poison-control タグがある（偽陽性）
    | "prtr-missing"
    | "prtr-overclaim"
    | "cscl-missing"
    | "cscl-overclaim";
  cas: string;
  message: string;
};

/**
 * 索引の自己検査。
 * - 参照する号が snapshot に実在し、nameContains が号の名称に含まれること
 * - 「Xを含有する製剤」のみの号（原体指定でない）への参照は不可
 * - 高圧ガスの品名は一般則第2条の列挙と完全一致すること
 * - dokugekiNone は毒劇参照と排他で、根拠 notes 必須
 */
export function auditOtherLawsIndexIntegrity(): OtherLawsViolation[] {
  const out: OtherLawsViolation[] = [];
  const push = (cas: string, message: string) =>
    out.push({ kind: "index-stale", cas, message });
  const seen = new Set<string>();
  for (const entry of OTHER_LAWS_CAS_INDEX) {
    if (seen.has(entry.cas)) push(entry.cas, `CASが重複登録: ${entry.cas}`);
    seen.add(entry.cas);
    for (const ref of entry.dokugeki ?? []) {
      const row = DOKUGEKI_TABLES[ref.table].find((e) => e.go === ref.go);
      if (!row) {
        push(entry.cas, `${entry.label}: 毒劇法 ${ref.table} 第${ref.go}号 が存在しない`);
        continue;
      }
      if (!row.name.includes(ref.nameContains)) {
        push(
          entry.cas,
          `${entry.label}: ${ref.table} 第${ref.go}号「${row.name.slice(0, 40)}…」に「${ref.nameContains}」が含まれない（号ずれ/改正の可能性）`,
        );
      }
      // 「Xを含有する製剤」のみ（及びこれ… を伴わない）は原体を指定しない
      if (/を含有する製剤/.test(row.name) && !/及びこれ|並びにこれ/.test(row.name)) {
        push(entry.cas, `${entry.label}: ${ref.table} 第${ref.go}号 は製剤のみの指定行＝原体の根拠にできない`);
      }
    }
    if (entry.dokugekiNone && (entry.dokugeki?.length ?? 0) > 0) {
      push(entry.cas, `${entry.label}: dokugekiNone と毒劇参照が同居している`);
    }
    if (entry.dokugekiNone && !entry.notes) {
      push(entry.cas, `${entry.label}: dokugekiNone には非該当の根拠 notes が必須`);
    }
    for (const ref of entry.kashinho ?? []) {
      const row = kashinhoEntryOf(ref.clazz, ref.go);
      if (!row) {
        push(entry.cas, `${entry.label}: 化審法第${ref.clazz}条第${ref.go}号 が存在しない`);
      } else if (!row.name.includes(ref.nameContains)) {
        push(
          entry.cas,
          `${entry.label}: 化審法第${ref.clazz}条第${ref.go}号 に「${ref.nameContains}」が含まれない`,
        );
      }
    }
    for (const ref of entry.kouatsu ?? []) {
      const list = ref.kind === "toxic" ? KOUATSU_GAS_NAMES.toxic : KOUATSU_GAS_NAMES.flammable;
      if (!list.includes(ref.name)) {
        push(
          entry.cas,
          `${entry.label}: 一般則第2条の${ref.kind === "toxic" ? "毒性" : "可燃性"}ガス品名に「${ref.name}」が無い`,
        );
      }
    }
  }
  return out;
}

/**
 * 表示タグ（regulationTags）と正本導出の全件・両方向突合。
 * tagsByCas は concentration-limits.json の substances → regulationTags を渡す。
 */
export function auditOtherLawsTags(
  tagsByCas: ReadonlyMap<string, readonly string[]>,
): OtherLawsViolation[] {
  const out: OtherLawsViolation[] = [];
  const indexByCas = new Map(OTHER_LAWS_CAS_INDEX.map((e) => [e.cas, e]));

  for (const [cas, tags] of tagsByCas) {
    const tagSet = new Set(tags);
    // ---- 化管法（公式CAS収載リストと完全一致） ----
    const kakanho = deriveKakanho(cas);
    const officialPrtr = new Set(kakanho.map((k) => `prtr${k.clazz}`));
    for (const t of ["prtr1", "prtr2"] as const) {
      if (tagSet.has(t) && !officialPrtr.has(t)) {
        out.push({
          kind: "prtr-overclaim",
          cas,
          message: `${cas}: ${t} タグがあるが公式CAS収載リスト（2021改正政令）から導出されない`,
        });
      }
      if (!tagSet.has(t) && officialPrtr.has(t)) {
        out.push({
          kind: "prtr-missing",
          cas,
          message: `${cas}: 公式リストで${t === "prtr1" ? "第一種" : "第二種"}指定だがタグが無い（取りこぼし）`,
        });
      }
    }
    // ---- 毒劇法（3値） ----
    const idx = indexByCas.get(cas);
    const hasPoison = tagSet.has("poison-control");
    if (idx && (idx.dokugeki?.length ?? 0) > 0 && !hasPoison) {
      out.push({
        kind: "dokugeki-missing",
        cas,
        message: `${idx.label}(${cas}): 毒劇法該当（${dokugekiClassOfEntry(idx)}）だが poison-control タグが無い（取りこぼし）`,
      });
    }
    if (idx?.dokugekiNone && hasPoison) {
      out.push({
        kind: "dokugeki-overclaim",
        cas,
        message: `${idx.label}(${cas}): 毒劇法非該当を確認済みなのに poison-control タグがある（偽陽性）`,
      });
    }
    // ---- 化審法（索引と完全一致） ----
    const officialCscl = new Set((idx?.kashinho ?? []).map((k) => `cscl${k.clazz}`));
    for (const t of ["cscl1", "cscl2"] as const) {
      if (tagSet.has(t) && !officialCscl.has(t)) {
        out.push({
          kind: "cscl-overclaim",
          cas,
          message: `${cas}: ${t} タグがあるが化審法施行令から導出されない`,
        });
      }
      if (!tagSet.has(t) && officialCscl.has(t)) {
        out.push({
          kind: "cscl-missing",
          cas,
          message: `${cas}: 化審法${t === "cscl1" ? "第一種" : "第二種"}特定化学物質だがタグが無い（取りこぼし）`,
        });
      }
    }
  }

  // 索引が毒劇該当とするCASがタグ集合に存在しない場合（DB側に物質が無い場合は対象外）
  return out;
}

/** 未突合（ミラー由来のまま）の poison-control タグ一覧＝今後のレビュー対象 */
export function listUnverifiedPoisonTags(
  tagsByCas: ReadonlyMap<string, readonly string[]>,
): string[] {
  const indexByCas = new Map(OTHER_LAWS_CAS_INDEX.map((e) => [e.cas, e]));
  const out: string[] = [];
  for (const [cas, tags] of tagsByCas) {
    if (!tags.includes("poison-control")) continue;
    const idx = indexByCas.get(cas);
    if (!idx || ((idx.dokugeki?.length ?? 0) === 0 && !idx.dokugekiNone)) out.push(cas);
  }
  return out;
}

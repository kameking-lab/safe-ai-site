/**
 * 特別則タグの正本突合監査（F2 監査パイプライン本体）
 *
 * サイトが表示に使う特別則の主張（regulation-tag-labels の OSHA タグ／mock 50物質の categories）を
 * 「主張(SpecialRuleClaim)」に正規化し、e-Gov 正本スナップショット由来の導出結果と全件突合する。
 * 突合は両方向:
 *   - 偽陽性: 表示している区分が正本から導出できない → 違反
 *   - 偽陰性: 正本から導出される区分がその物質の表示に無い → 違反（取りこぼし）
 * インデックス未登録のCASに特別則タグが付いたら「index-missing」で違反
 * （＝正本と突合しない手書きマッピングは構造的に混入できない）。
 *
 * substance-legal-audit.test.ts がこの監査を CI に常設する。
 */
import {
  BEPPYO3_CLASS1,
  BEPPYO3_CLASS2,
  BEPPYO3_CLASS3,
  BEPPYO6_2,
} from "./anei-beppyo-snapshot";
import { CAS_LAW_INDEX, CAS_LAW_INDEX_BY_CAS } from "./cas-law-index";
import { beppyo3Entry, beppyo62Entry, deriveFromIndexEntry } from "./substance-legal-profile";

/** サイト側の「この物質はこの特別則区分だ」という主張の正規形 */
export type SpecialRuleClaim = {
  /** 主張の出所（違反メッセージ用）。例 "regulation-tag-labels" / "mock-db cs-016" */
  source: string;
  cas: string;
  label: string;
  /** 主張する特化則区分 */
  tokkaKubun: Array<1 | 2 | 3>;
  /** 主張する有機則種別 */
  yukiClass: Array<1 | 2 | 3>;
  /** 主張する特別管理物質該当 */
  specialControl: boolean;
};

export type AuditViolation = {
  kind:
    | "index-missing" // 特別則を主張するCASが照合インデックスに未登録（未突合）
    | "index-stale" // インデックスの号参照がスナップショットと不一致（改正 or 誤登録）
    | "tokka-overclaim" // 正本に無い特化則区分を表示（偽陽性）
    | "tokka-missing" // 正本の特化則区分が表示に無い（偽陰性）
    | "yuki-overclaim"
    | "yuki-missing"
    | "special-overclaim"
    | "special-missing";
  cas: string;
  source: string;
  message: string;
};

const setEq = <T,>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/**
 * インデックス自体の健全性検査:
 * 参照する号がスナップショットに実在し、名前が一致し、製剤・混合物行を指していないこと。
 * 法改正でスナップショットが変わると、影響する号のエントリがここで落ちる。
 */
export function auditIndexIntegrity(): AuditViolation[] {
  const out: AuditViolation[] = [];
  const push = (cas: string, message: string) =>
    out.push({ kind: "index-stale", cas, source: "cas-law-index", message });
  const casSeen = new Set<string>();
  for (const entry of CAS_LAW_INDEX) {
    if (casSeen.has(entry.cas)) push(entry.cas, `CASが重複登録: ${entry.cas}`);
    casSeen.add(entry.cas);
    for (const ref of entry.beppyo3 ?? []) {
      const row = beppyo3Entry(ref.kubun, ref.go);
      if (!row) {
        push(entry.cas, `${entry.label}: 別表第3第${ref.kubun}号${ref.go} が存在しない`);
      } else if (row.isPreparation) {
        push(entry.cas, `${entry.label}: 製剤・混合物行（第${ref.kubun}号${ref.go}）への参照は不可`);
      } else if (!row.name.includes(ref.nameContains)) {
        push(
          entry.cas,
          `${entry.label}: 別表第3第${ref.kubun}号${ref.go}「${row.name}」に「${ref.nameContains}」が含まれない（号ずれ/改正の可能性）`,
        );
      }
    }
    for (const ref of entry.beppyo62 ?? []) {
      const row = beppyo62Entry(ref.go);
      if (!row) {
        push(entry.cas, `${entry.label}: 別表第6の2第${ref.go}号 が存在しない（削除号の可能性）`);
      } else if (row.isMixture) {
        push(entry.cas, `${entry.label}: 混合物行（第${ref.go}号）への参照は不可`);
      } else if (!row.name.includes(ref.nameContains)) {
        push(
          entry.cas,
          `${entry.label}: 別表第6の2第${ref.go}号「${row.name}」に「${ref.nameContains}」が含まれない`,
        );
      }
    }
  }
  return out;
}

/** 主張群を正本導出と全件突合する（純関数。過去データの再監査にも使える） */
export function auditSpecialRuleClaims(claims: readonly SpecialRuleClaim[]): AuditViolation[] {
  const out: AuditViolation[] = [];
  for (const claim of claims) {
    const entry = CAS_LAW_INDEX_BY_CAS.get(claim.cas);
    const claimsAny =
      claim.tokkaKubun.length > 0 || claim.yukiClass.length > 0 || claim.specialControl;
    if (!entry) {
      if (claimsAny) {
        out.push({
          kind: "index-missing",
          cas: claim.cas,
          source: claim.source,
          message: `${claim.label}(${claim.cas}): 特別則を表示しているが cas-law-index に未登録＝正本と未突合。e-Gov現行条文と突合してインデックスに追加すること`,
        });
      }
      continue;
    }
    const derived = deriveFromIndexEntry(entry);
    if (!setEq(claim.tokkaKubun, derived.tokkaKubun)) {
      const over = claim.tokkaKubun.filter((k) => !derived.tokkaKubun.includes(k));
      const missing = derived.tokkaKubun.filter((k) => !claim.tokkaKubun.includes(k));
      for (const k of over) {
        out.push({
          kind: "tokka-overclaim",
          cas: claim.cas,
          source: claim.source,
          message: `${claim.label}(${claim.cas}): 特化則第${k}類を表示しているが令別表第3から導出されない（正: ${fmtKubun(derived.tokkaKubun)}）`,
        });
      }
      for (const k of missing) {
        out.push({
          kind: "tokka-missing",
          cas: claim.cas,
          source: claim.source,
          message: `${claim.label}(${claim.cas}): 令別表第3第${k}号相当（特化則第${k}類）が表示に無い（取りこぼし）`,
        });
      }
    }
    if (!setEq(claim.yukiClass, derived.yukiClass)) {
      const over = claim.yukiClass.filter((k) => !derived.yukiClass.includes(k));
      const missing = derived.yukiClass.filter((k) => !claim.yukiClass.includes(k));
      for (const k of over) {
        out.push({
          kind: "yuki-overclaim",
          cas: claim.cas,
          source: claim.source,
          message: `${claim.label}(${claim.cas}): 有機則第${k}種を表示しているが令別表第6の2・有機則第1条から導出されない（正: ${fmtYuki(derived.yukiClass)}）`,
        });
      }
      for (const k of missing) {
        out.push({
          kind: "yuki-missing",
          cas: claim.cas,
          source: claim.source,
          message: `${claim.label}(${claim.cas}): 有機則第${k}種該当が表示に無い（取りこぼし）`,
        });
      }
    }
    if (claim.specialControl !== derived.specialControl) {
      out.push({
        kind: claim.specialControl ? "special-overclaim" : "special-missing",
        cas: claim.cas,
        source: claim.source,
        message: claim.specialControl
          ? `${claim.label}(${claim.cas}): 特別管理物質を表示しているが特化則38条の4の号に該当しない`
          : `${claim.label}(${claim.cas}): 特化則38条の4該当（特別管理物質）が表示に無い（取りこぼし）`,
      });
    }
  }
  return out;
}

function fmtKubun(kubun: readonly number[]): string {
  return kubun.length === 0 ? "特化則 非該当" : kubun.map((k) => `第${k}類`).join("・");
}
function fmtYuki(cls: readonly number[]): string {
  return cls.length === 0 ? "有機則 非該当" : cls.map((k) => `第${k}種`).join("・");
}

// ---------------------------------------------------------------------------
// 主張ビルダー（表示ソース → SpecialRuleClaim）
// ---------------------------------------------------------------------------

/**
 * regulation-tag-labels の OSHA タグ表（tags）＋特別管理物質セット → 主張群。
 * 引数注入にしているのは、過去の誤データ（PR#578是正前）を同じ監査に通す再発見テストのため。
 */
export function claimsFromOshaTagMap(
  tags: Readonly<Record<string, readonly string[]>>,
  specialControlSet: ReadonlySet<string>,
  source = "regulation-tag-labels",
): SpecialRuleClaim[] {
  const casSet = new Set([...Object.keys(tags), ...specialControlSet]);
  return [...casSet].map((cas) => {
    const t = tags[cas] ?? [];
    const tokka: Array<1 | 2 | 3> = [];
    if (t.includes("tokutei-1")) tokka.push(1);
    if (t.includes("tokutei-2")) tokka.push(2);
    if (t.includes("tokutei-3")) tokka.push(3);
    const yuki: Array<1 | 2 | 3> = [];
    if (t.includes("yuki-1")) yuki.push(1);
    if (t.includes("yuki-2")) yuki.push(2);
    if (t.includes("yuki-3")) yuki.push(3);
    return {
      source,
      cas,
      label: CAS_LAW_INDEX_BY_CAS.get(cas)?.label ?? cas,
      tokkaKubun: tokka,
      yukiClass: yuki,
      specialControl: specialControlSet.has(cas),
    };
  });
}

/** mock 50物質DB の categories → 主張群 */
export function claimsFromMockCategories(
  substances: ReadonlyArray<{ id: string; name: string; cas: string; categories: readonly string[] }>,
  source = "mock-db",
): SpecialRuleClaim[] {
  return substances.map((s) => {
    const tokka: Array<1 | 2 | 3> = [];
    if (s.categories.includes("特化則1類")) tokka.push(1);
    if (s.categories.includes("特化則2類")) tokka.push(2);
    if (s.categories.includes("特化則3類")) tokka.push(3);
    const yuki: Array<1 | 2 | 3> = [];
    if (s.categories.includes("有機溶剤1種")) yuki.push(1);
    if (s.categories.includes("有機溶剤2種")) yuki.push(2);
    if (s.categories.includes("有機溶剤3種")) yuki.push(3);
    return {
      source: `${source} ${s.id}`,
      cas: s.cas,
      label: s.name,
      tokkaKubun: tokka,
      yukiClass: yuki,
      specialControl: s.categories.includes("特別管理物質"),
    };
  });
}

/** スナップショット由来の網羅性メトリクス（レーン展開の進捗計測用。CIゲートではない） */
export function coverageReport(tagCasList: readonly string[]): {
  beppyo3SubstanceRows: number;
  beppyo62SubstanceRows: number;
  indexedCas: number;
  taggedCas: number;
} {
  return {
    beppyo3SubstanceRows:
      BEPPYO3_CLASS1.filter((e) => !e.isPreparation).length +
      BEPPYO3_CLASS2.filter((e) => !e.isPreparation).length +
      BEPPYO3_CLASS3.filter((e) => !e.isPreparation).length,
    beppyo62SubstanceRows: BEPPYO6_2.filter((e) => !e.isMixture).length,
    indexedCas: CAS_LAW_INDEX.length,
    taggedCas: tagCasList.length,
  };
}

/**
 * SubstanceLegalProfile: 物質×法令区分の横断プロファイル（F2 設計実証）
 *
 * 診断 docs/fable-diagnosis-2026-07-02/03 の 4-1 スキーマの実装。
 * 安衛法系（特化則・有機則・特別管理物質・特化則健診）は
 * anei-beppyo-snapshot.ts（e-Gov生成物）× cas-law-index.ts（名前解決）から**導出**する。
 * 手書きの区分は存在しない＝正本が変われば導出も変わる。
 *
 * 他法令ドメイン（毒劇法・化管法・化審法・消防法・高圧ガス等）は型のみ先行定義し、
 * status="unverified" を明示できるようにする（「タグなし＝未調査」と「非該当を確認済み」の
 * 区別が偽陰性対策の本体）。データ源の選定は docs/legal-mapping-pipeline-2026-07-03.md 参照。
 * 全物質への展開・毒劇法再構築は dataレーン（O11）へ。
 */
import {
  BEPPYO3_CLASS1,
  BEPPYO3_CLASS2,
  BEPPYO3_CLASS3,
  BEPPYO6_2,
  YUKI1_GO,
  YUKI2_GO,
  SPECIAL_CONTROL_GO2,
  ARTICLE22_ITEM3_TEXT,
  ANEI_BEPPYO_SNAPSHOT_META,
  type Beppyo3Entry,
} from "./anei-beppyo-snapshot";
import { CAS_LAW_INDEX_BY_CAS, type CasLawIndexEntry } from "./cas-law-index";

/** 法令ドメイン（診断03 4-1。安衛法系は snapshot 突合済み、他は型のみ先行） */
export type LegalDomain =
  | "anei-tokka" // 特化則（令別表第3）
  | "anei-yuki" // 有機則（令別表第6の2）
  | "anei-namari" // 鉛則（令別表第4=業務列挙・機械突合対象外）
  | "anei-4alkyl" // 四アルキル鉛則（令別表第5=業務列挙）
  | "anei-funjin" // 粉じん則（作業列挙）
  | "anei-sekimen" // 石綿則
  | "dokugeki" // 毒物及び劇物取締法
  | "kakanho-prtr" // 化管法
  | "kashinho" // 化審法
  | "shobo" // 消防法（別表第一）
  | "kouatsu-gas" // 高圧ガス保安法（一般則第2条の毒性/可燃性ガス品名）
  | "taiki" // 大気汚染防止法
  | "suishitsu" // 水質汚濁防止法
  | "dojo" // 土壌汚染対策法
  | "cwc" // 化学兵器禁止法
  | "haiki"; // 廃棄物処理法

/**
 * designated: 該当（classification・basis 必須）
 * not-designated: 非該当を正本と突合して確認済み
 * unverified: 未突合（現状の concentration-limits regulationTags 等ミラー由来はここ）
 */
export type DesignationStatus = "designated" | "not-designated" | "unverified";

export type LegalDesignation = {
  domain: LegalDomain;
  status: DesignationStatus;
  /** 例: "第二類物質（特別有機溶剤）" "第一種有機溶剤" */
  classification?: string;
  /** 例: { lawId: "347CO0000000318", provision: "別表第3第2号11の2" } */
  basis?: { lawId: string; provision: string };
  /** 群指定の適用範囲（「粉状の化合物に限る」等） */
  scopeNote?: string;
  /** 正本スナップショットの識別（revisionId / sha256） */
  source?: { revisionId: string; sha256: string };
  /** 突合日（snapshot 取得日） */
  verifiedAt?: string;
};

export type SubstanceLegalProfile = {
  cas: string;
  label: string;
  designations: LegalDesignation[];
};

const SEIREI_LAW_ID = "347CO0000000318";

/** 特化則38条の4「塩素化ビフェニル等を除く」＝第一類のうちPCB（第1号3）は特別管理物質でない */
export const SPECIAL_CONTROL_EXCLUDED_CLASS1_GO: readonly string[] = ["3"];

/**
 * 令22条1項3号の括弧書きで特化則健診の対象から明示除外される第2号の号番号
 * （5=エチレンオキシド、31の2=ホルムアルデヒド）。
 * 原文ガード: substance-legal-audit.test.ts が ARTICLE22_ITEM3_TEXT との文言一致を検証し、
 * 改正で文言が変わればテストが落ちて人手レビューを強制する。
 */
export const TOKKA_KENSHIN_EXCLUDED_GO2: readonly string[] = ["5", "31の2"];

const BEPPYO3_BY_KUBUN: Record<1 | 2 | 3, readonly Beppyo3Entry[]> = {
  1: BEPPYO3_CLASS1,
  2: BEPPYO3_CLASS2,
  3: BEPPYO3_CLASS3,
};

export function beppyo3Entry(kubun: 1 | 2 | 3, go: string): Beppyo3Entry | undefined {
  return BEPPYO3_BY_KUBUN[kubun].find((e) => e.go === go);
}

export function beppyo62Entry(go: number) {
  return BEPPYO6_2.find((e) => e.go === go);
}

const KUBUN_LABEL: Record<1 | 2 | 3, string> = {
  1: "第一類物質",
  2: "第二類物質",
  3: "第三類物質",
};

/** 有機則の種別（1/2/3種）を令別表第6の2の号番号から導出 */
export function yukiClassOfGo(go: number): 1 | 2 | 3 | undefined {
  const entry = beppyo62Entry(go);
  if (!entry || entry.isMixture) return undefined;
  if (YUKI1_GO.includes(go)) return 1;
  if (YUKI2_GO.includes(go)) return 2;
  return 3;
}

/** 導出結果（監査・UI 双方が使う正規形） */
export type DerivedAneiDesignations = {
  /** 特化則区分（複数号に該当しても区分の集合。通常は1要素） */
  tokkaKubun: Array<1 | 2 | 3>;
  /** 有機則種別 */
  yukiClass: Array<1 | 2 | 3>;
  /** 特別管理物質（特化則38条の4） */
  specialControl: boolean;
  /** 特化則健診（特化則39条・令22条1項3号）の対象か */
  tokkaKenshinTarget: boolean;
};

/**
 * インデックス登録済みCASの安衛法系区分を正本スナップショットから導出する。
 * インデックス未登録（＝未突合）の場合は undefined を返す。
 */
export function deriveAneiDesignations(cas: string): DerivedAneiDesignations | undefined {
  const entry = CAS_LAW_INDEX_BY_CAS.get(cas);
  if (!entry) return undefined;
  return deriveFromIndexEntry(entry);
}

export function deriveFromIndexEntry(entry: CasLawIndexEntry): DerivedAneiDesignations {
  const tokkaKubun = new Set<1 | 2 | 3>();
  let specialControl = false;
  let tokkaKenshinTarget = false;
  for (const ref of entry.beppyo3 ?? []) {
    tokkaKubun.add(ref.kubun);
    if (ref.kubun === 1 && !SPECIAL_CONTROL_EXCLUDED_CLASS1_GO.includes(ref.go)) {
      specialControl = true;
    }
    if (ref.kubun === 2 && SPECIAL_CONTROL_GO2.includes(ref.go)) {
      specialControl = true;
    }
    // 健診対象は「別表第三第一号若しくは第二号」のみ（第三類は対象外）。
    // 第2号のうち 5・31の2 は括弧書きで明示除外（令22条1項3号）。
    if (
      (ref.kubun === 1 || ref.kubun === 2) &&
      !(ref.kubun === 2 && TOKKA_KENSHIN_EXCLUDED_GO2.includes(ref.go))
    ) {
      tokkaKenshinTarget = true;
    }
  }
  const yukiClass = new Set<1 | 2 | 3>();
  for (const ref of entry.beppyo62 ?? []) {
    const k = yukiClassOfGo(ref.go);
    if (k) yukiClass.add(k);
  }
  return {
    tokkaKubun: [...tokkaKubun].sort(),
    yukiClass: [...yukiClass].sort(),
    specialControl,
    tokkaKenshinTarget,
  };
}

/**
 * 特化則健診（特化則39条）の対象外CASか（tokutei-2 タグを持つが令22条で除外される物質）。
 * health-checkup-from-tags.ts が健診導出の抑制に使用する。
 */
export function isTokkaKenshinExcluded(cas: string | null | undefined): boolean {
  if (!cas) return false;
  const derived = deriveAneiDesignations(cas);
  if (!derived) return false;
  return derived.tokkaKubun.length > 0 && !derived.tokkaKenshinTarget;
}

/** SubstanceLegalProfile を生成（安衛法系=突合済み、他ドメイン=unverified を明示） */
export function buildSubstanceLegalProfile(cas: string): SubstanceLegalProfile | undefined {
  const entry = CAS_LAW_INDEX_BY_CAS.get(cas);
  if (!entry) return undefined;
  const src = {
    revisionId: ANEI_BEPPYO_SNAPSHOT_META.seirei.revisionId,
    sha256: ANEI_BEPPYO_SNAPSHOT_META.seirei.sha256,
  };
  const verifiedAt = ANEI_BEPPYO_SNAPSHOT_META.retrievedAt;
  const designations: LegalDesignation[] = [];

  if (entry.beppyo3 && entry.beppyo3.length > 0) {
    for (const ref of entry.beppyo3) {
      designations.push({
        domain: "anei-tokka",
        status: "designated",
        classification: KUBUN_LABEL[ref.kubun],
        basis: { lawId: SEIREI_LAW_ID, provision: `別表第3第${ref.kubun}号${ref.go}` },
        scopeNote: entry.scopeNote,
        source: src,
        verifiedAt,
      });
    }
  } else {
    designations.push({ domain: "anei-tokka", status: "not-designated", source: src, verifiedAt });
  }

  if (entry.beppyo62 && entry.beppyo62.length > 0) {
    for (const ref of entry.beppyo62) {
      const k = yukiClassOfGo(ref.go);
      designations.push({
        domain: "anei-yuki",
        status: "designated",
        classification: k ? `第${["一", "二", "三"][k - 1]}種有機溶剤` : undefined,
        basis: { lawId: SEIREI_LAW_ID, provision: `別表第6の2第${ref.go}号` },
        scopeNote: entry.scopeNote,
        source: src,
        verifiedAt,
      });
    }
  } else {
    designations.push({ domain: "anei-yuki", status: "not-designated", source: src, verifiedAt });
  }

  // 他法令ドメインは未突合であることを明示（正本ETLは dataレーン O11 で展開）
  for (const domain of ["dokugeki", "kakanho-prtr", "kashinho", "shobo", "kouatsu-gas"] as const) {
    designations.push({ domain, status: "unverified" });
  }

  return { cas: entry.cas, label: entry.label, designations };
}

export { ARTICLE22_ITEM3_TEXT };

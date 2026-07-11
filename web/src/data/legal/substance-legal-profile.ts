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
import {
  DOKUGEKI_HYO1,
  DOKUGEKI_HYO2,
  DOKUGEKI_HYO3,
  DOKUGEKI_REI1,
  DOKUGEKI_REI2,
  DOKUGEKI_REI3,
  KASHINHO_CLASS1,
  KASHINHO_CLASS2,
  KOUATSU_TOXIC_GAS,
  KOUATSU_FLAMMABLE_GAS,
  OTHER_LAWS_SNAPSHOT_META,
  type LawItemEntry,
} from "./other-laws-snapshot";
import {
  OTHER_LAWS_CAS_INDEX_BY_CAS,
  type DokugekiTable,
  type OtherLawsIndexEntry,
} from "./other-laws-cas-index";
import kakanhoSnapshot from "./kakanho-prtr-snapshot.json";
import kashinhoYusenSnapshot from "./kashinho-yusen-snapshot.json";

/** 法令ドメイン（診断03 4-1。安衛法系は snapshot 突合済み、他は型のみ先行） */
export type LegalDomain =
  | "anei-ra" // RA対象物＝表示・通知対象物（令別表第9＋安衛則別表第2の名称突合）
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

// ---------------------------------------------------------------------------
// 他法令ドメイン（毒劇法・化管法・化審法・高圧ガス）の導出（O11・2026-07-11）
// ---------------------------------------------------------------------------

export const DOKUGEKI_TABLES: Readonly<Record<DokugekiTable, readonly LawItemEntry[]>> = {
  hyo1: DOKUGEKI_HYO1,
  hyo2: DOKUGEKI_HYO2,
  hyo3: DOKUGEKI_HYO3,
  rei1: DOKUGEKI_REI1,
  rei2: DOKUGEKI_REI2,
  rei3: DOKUGEKI_REI3,
};

const DOKUGEKI_LAW_ID = "325AC0000000303";
const DOKUGEKI_REI_LAW_ID = "340CO0000000002";
const KASHINHO_REI_LAW_ID = "349CO0000000202";
const KASHINHO_LAW_ID = "348AC0000000117";
const KOUATSU_IPPAN_LAW_ID = "341M50000400053";
const KAKANHO_REI_NOTE = "化管法施行令（2021(R3)改正）";

export const DOKUGEKI_TABLE_LABEL: Readonly<Record<DokugekiTable, string>> = {
  hyo1: "毒物及び劇物取締法 別表第一",
  hyo2: "毒物及び劇物取締法 別表第二",
  hyo3: "毒物及び劇物取締法 別表第三",
  rei1: "毒物及び劇物指定令 第1条",
  rei2: "毒物及び劇物指定令 第2条",
  rei3: "毒物及び劇物指定令 第3条",
};

export function dokugekiEntryOf(table: DokugekiTable, go: string): LawItemEntry | undefined {
  return DOKUGEKI_TABLES[table].find((e) => e.go === go);
}

export function kashinhoEntryOf(clazz: 1 | 2, go: string): LawItemEntry | undefined {
  return (clazz === 1 ? KASHINHO_CLASS1 : KASHINHO_CLASS2).find((e) => e.go === go);
}

export type DokugekiClassification = "特定毒物" | "毒物" | "劇物";

/** 毒劇法の区分を索引エントリの参照テーブルから導出（特定毒物＞毒物＞劇物） */
export function dokugekiClassOfEntry(entry: OtherLawsIndexEntry): DokugekiClassification | undefined {
  const tables = new Set((entry.dokugeki ?? []).map((r) => r.table));
  if (tables.has("hyo3") || tables.has("rei3")) return "特定毒物";
  if (tables.has("hyo1") || tables.has("rei1")) return "毒物";
  if (tables.has("hyo2") || tables.has("rei2")) return "劇物";
  return undefined;
}

// 化管法 正本スナップショット（NITE公式・CAS付き）→ CAS索引
type KakanhoEntry = { seireiNo: string; clazz: number; name: string; alias?: string; cas: string[] };
const KAKANHO_ENTRIES = (kakanhoSnapshot as { entries: KakanhoEntry[] }).entries;
export const KAKANHO_META = (kakanhoSnapshot as {
  meta: {
    retrievedAt: string;
    sourceSha256: string;
    class1Count: number;
    class2Count: number;
    casMappedCount: number;
  };
}).meta;

let _kakanhoByCas: Map<string, KakanhoEntry[]> | null = null;
function kakanhoByCas(): Map<string, KakanhoEntry[]> {
  if (_kakanhoByCas) return _kakanhoByCas;
  const m = new Map<string, KakanhoEntry[]>();
  for (const e of KAKANHO_ENTRIES) {
    for (const cas of e.cas) {
      const list = m.get(cas);
      if (list) list.push(e);
      else m.set(cas, [e]);
    }
  }
  _kakanhoByCas = m;
  return m;
}

/** 化管法（PRTR）指定を公式CAS収載リストから導出 */
export function deriveKakanho(cas: string): KakanhoEntry[] {
  return kakanhoByCas().get(cas) ?? [];
}

// 化審法 優先評価化学物質 正本スナップショット（J-CHECK・CAS付き）→ CAS索引（P1-8）
type KashinhoYusenEntry = {
  no: number;
  name: string;
  gazetteIds: string[];
  designatedOn: string;
  cas: string[];
};
const KASHINHO_YUSEN_ENTRIES = (kashinhoYusenSnapshot as { entries: KashinhoYusenEntry[] }).entries;
export const KASHINHO_YUSEN_META = (kashinhoYusenSnapshot as {
  meta: {
    retrievedAt: string;
    sourceSha256: string;
    substanceCount: number;
    casMappedCount: number;
  };
}).meta;

let _yusenByCas: Map<string, KashinhoYusenEntry> | null = null;
function yusenByCas(): Map<string, KashinhoYusenEntry> {
  if (_yusenByCas) return _yusenByCas;
  const m = new Map<string, KashinhoYusenEntry>();
  for (const e of KASHINHO_YUSEN_ENTRIES) {
    for (const cas of e.cas) {
      if (!m.has(cas)) m.set(cas, e);
    }
  }
  _yusenByCas = m;
  return m;
}

/** 化審法 優先評価化学物質の該当を J-CHECK 公式CAS収載から導出 */
export function deriveKashinhoYusen(cas: string): KashinhoYusenEntry | undefined {
  return yusenByCas().get(cas);
}

/**
 * SubstanceLegalProfile を生成。
 * - 安衛法系: cas-law-index × anei-beppyo-snapshot から導出
 * - 毒劇法・化審法・高圧ガス: other-laws-cas-index × other-laws-snapshot から導出
 * - 化管法: kakanho-prtr-snapshot（NITE公式CAS収載）から導出
 * - 未突合ドメインは status="unverified" を明示（空白で欺かない）
 */
export function buildSubstanceLegalProfile(cas: string): SubstanceLegalProfile | undefined {
  const entry = CAS_LAW_INDEX_BY_CAS.get(cas);
  const other = OTHER_LAWS_CAS_INDEX_BY_CAS.get(cas);
  const kakanho = deriveKakanho(cas);
  if (!entry && !other && kakanho.length === 0) return undefined;

  const src = {
    revisionId: ANEI_BEPPYO_SNAPSHOT_META.seirei.revisionId,
    sha256: ANEI_BEPPYO_SNAPSHOT_META.seirei.sha256,
  };
  const verifiedAt = ANEI_BEPPYO_SNAPSHOT_META.retrievedAt;
  const otherVerifiedAt = OTHER_LAWS_SNAPSHOT_META.retrievedAt;
  const designations: LegalDesignation[] = [];

  // ---- 安衛法系（特化則・有機則） ----
  if (entry) {
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
  } else {
    designations.push({ domain: "anei-tokka", status: "unverified" });
    designations.push({ domain: "anei-yuki", status: "unverified" });
  }

  // ---- 毒劇法 ----
  if (other) {
    const cls = dokugekiClassOfEntry(other);
    if (cls && other.dokugeki) {
      for (const ref of other.dokugeki) {
        const isRei = ref.table.startsWith("rei");
        designations.push({
          domain: "dokugeki",
          status: "designated",
          classification: cls,
          basis: {
            lawId: isRei ? DOKUGEKI_REI_LAW_ID : DOKUGEKI_LAW_ID,
            provision: `${DOKUGEKI_TABLE_LABEL[ref.table]}第${ref.go}号`,
          },
          scopeNote: other.notes,
          source: {
            revisionId: isRei
              ? OTHER_LAWS_SNAPSHOT_META.dokugekiRei.revisionId
              : OTHER_LAWS_SNAPSHOT_META.dokugekiLaw.revisionId,
            sha256: isRei
              ? OTHER_LAWS_SNAPSHOT_META.dokugekiRei.sha256
              : OTHER_LAWS_SNAPSHOT_META.dokugekiLaw.sha256,
          },
          verifiedAt: otherVerifiedAt,
        });
      }
    } else if (other.dokugekiNone) {
      designations.push({
        domain: "dokugeki",
        status: "not-designated",
        scopeNote: other.notes,
        verifiedAt: otherVerifiedAt,
      });
    } else {
      // 索引エントリはあるが毒劇法は未突合（化審法・高圧ガスのみのレビュー）
      designations.push({ domain: "dokugeki", status: "unverified" });
    }
  } else {
    designations.push({ domain: "dokugeki", status: "unverified" });
  }

  // ---- 化審法（第一種/第二種特定化学物質） ----
  if (other?.kashinho && other.kashinho.length > 0) {
    for (const ref of other.kashinho) {
      designations.push({
        domain: "kashinho",
        status: "designated",
        classification: ref.clazz === 1 ? "第一種特定化学物質" : "第二種特定化学物質",
        basis: {
          lawId: KASHINHO_REI_LAW_ID,
          provision: `化審法施行令第${ref.clazz}条第${ref.go}号`,
        },
        source: {
          revisionId: OTHER_LAWS_SNAPSHOT_META.kashinhoRei.revisionId,
          sha256: OTHER_LAWS_SNAPSHOT_META.kashinhoRei.sha256,
        },
        verifiedAt: otherVerifiedAt,
      });
    }
  } else {
    // 優先評価化学物質（J-CHECK公式リスト221物質・CAS収載1,580件）から導出（P1-8）
    const yusen = deriveKashinhoYusen(cas);
    if (yusen) {
      designations.push({
        domain: "kashinho",
        status: "designated",
        classification: "優先評価化学物質",
        basis: {
          lawId: KASHINHO_LAW_ID,
          provision: `化審法第2条第5項・優先評価化学物質 通し番号${yusen.no}（官報公示整理番号 ${yusen.gazetteIds.join("・") || "—"}）`,
        },
        scopeNote:
          "J-CHECK（厚労省・経産省・環境省・NITE）のCAS収載による突合。官報公示整理番号とCAS RNの関連は最終確認されたものではない（J-CHECK免責）",
        source: {
          revisionId: `J-CHECK優先評価化学物質リスト ${KASHINHO_YUSEN_META.retrievedAt}`,
          sha256: KASHINHO_YUSEN_META.sourceSha256,
        },
        verifiedAt: KASHINHO_YUSEN_META.retrievedAt,
      });
    } else {
      // 監視化学物質(36)は未取込＝特定・優先評価に非収載でも「未確認」を維持（空白で欺かない）
      designations.push({ domain: "kashinho", status: "unverified" });
    }
  }

  // ---- 化管法（PRTR第一種/第二種） ----
  if (kakanho.length > 0) {
    for (const ke of kakanho) {
      designations.push({
        domain: "kakanho-prtr",
        status: "designated",
        classification: ke.clazz === 1 ? "第一種指定化学物質" : "第二種指定化学物質",
        basis: {
          lawId: KAKANHO_REI_NOTE,
          provision: `別表第${ke.clazz === 1 ? "一" : "二"} 政令番号${ke.seireiNo.slice(2).replace(/^0+/, "")}（${ke.name}）`,
        },
        source: { revisionId: `NITE公式CAS収載リスト ${KAKANHO_META.retrievedAt}`, sha256: KAKANHO_META.sourceSha256 },
        verifiedAt: KAKANHO_META.retrievedAt,
      });
    }
  } else {
    // 公式CAS収載リスト非収載。群指定の名称該当の可能性は残る（メタ注記どおり）
    designations.push({ domain: "kakanho-prtr", status: "unverified" });
  }

  // ---- 高圧ガス保安法（一般則2条の品名列挙） ----
  if (other?.kouatsu && other.kouatsu.length > 0) {
    for (const ref of other.kouatsu) {
      designations.push({
        domain: "kouatsu-gas",
        status: "designated",
        classification: ref.kind === "toxic" ? "毒性ガス" : "可燃性ガス",
        basis: {
          lawId: KOUATSU_IPPAN_LAW_ID,
          provision: `一般高圧ガス保安規則第2条（${ref.kind === "toxic" ? "毒性ガス" : "可燃性ガス"}品名列挙）`,
        },
        scopeNote: "高圧ガス（常用温度で1MPa以上等）として貯蔵・消費する場合に適用",
        source: {
          revisionId: OTHER_LAWS_SNAPSHOT_META.kouatsuIppan.revisionId,
          sha256: OTHER_LAWS_SNAPSHOT_META.kouatsuIppan.sha256,
        },
        verifiedAt: otherVerifiedAt,
      });
    }
  } else {
    designations.push({ domain: "kouatsu-gas", status: "unverified" });
  }

  // ---- 消防法（別表第一は品名・性状分類のため物質単位の断定はしない） ----
  designations.push({ domain: "shobo", status: "unverified" });

  return {
    cas,
    label: entry?.label ?? other?.label ?? kakanho[0]?.name ?? cas,
    designations,
  };
}

/** 高圧ガス品名リスト（監査用の再輸出） */
export const KOUATSU_GAS_NAMES = {
  toxic: KOUATSU_TOXIC_GAS,
  flammable: KOUATSU_FLAMMABLE_GAS,
} as const;

export { ARTICLE22_ITEM3_TEXT };

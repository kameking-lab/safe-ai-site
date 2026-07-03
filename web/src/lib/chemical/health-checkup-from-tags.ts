/**
 * 特殊健康診断 対象判定（Phase B P1-2・純粋関数）。
 *
 * 物質に付与済みの労働安全衛生 特別則タグ（特化則/有機則/粉じん則/石綿則）から、
 * 事業者に課される特殊健康診断の種類を導出する。健診結果の記録は本Phase対象外（判定のみ）。
 *
 * 【正確性】条文・健診名は確立された法定事項のみを収録。該当の最終判断は事業者が法令で確認すること
 * （本判定は付与済みタグに基づく「該当の可能性」の提示）。
 *
 * F2 (2026-07-03) 令22条1項3号（e-Gov正本）との突合で是正:
 *   - 特化則健診（39条）の対象は令別表第3の第一類・第二類のみ。第三類（tokutei-3:
 *     アンモニア・硫酸・塩化水素・硝酸等）は対象外のため tokutei-3 からは健診を導出しない。
 *   - 第二類でもエチレンオキシド(5)・ホルムアルデヒド(31の2)は括弧書きで明示除外
 *     → cas 指定時は isTokkaKenshinExcluded で抑制する。
 *   - 有機則第三種（yuki-3）の健診はタンク等の内部業務に限る（有機則29条）ため、
 *     物質単位の無条件導出はしない（条件付き該当のためv1では非表示）。
 */
import { isTokkaKenshinExcluded } from "@/data/legal/substance-legal-profile";

export interface HealthCheckupRequirement {
  /** 安定ID（テスト・描画用） */
  key: string;
  /** 特殊健診の名称 */
  name: string;
  /** 根拠規則・条文 */
  basis: string;
  /** 実施頻度（確立された頻度のみ） */
  frequency: string;
  /** 法令本文（e-Gov）URL */
  officialUrl: string;
}

/** タグ → 特殊健診要件（確立された法定事項）。 */
const TAG_TO_CHECKUP: Record<string, HealthCheckupRequirement> = {
  // 特化則（特定化学物質）→ 特定化学物質健康診断（特化則第39条）
  "tokutei-1": {
    key: "tokutei-kenshin",
    name: "特定化学物質健康診断",
    basis: "特定化学物質障害予防規則 第39条",
    frequency: "雇入れ時・配置替え時、その後6か月以内ごとに1回（特別管理物質は記録30年保存）",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000039/",
  },
  "tokutei-2": {
    key: "tokutei-kenshin",
    name: "特定化学物質健康診断",
    basis: "特定化学物質障害予防規則 第39条",
    frequency: "雇入れ時・配置替え時、その後6か月以内ごとに1回（特別管理物質は記録30年保存）",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000039/",
  },
  // tokutei-3（第三類物質）は特化則健診の対象外（令22条1項3号は別表第3第1号・第2号のみを列挙）
  // 有機則 → 有機溶剤等健康診断（有機則第29条）。yuki-3（第三種）はタンク等内部業務に限るため導出しない
  "yuki-1": {
    key: "yuki-kenshin",
    name: "有機溶剤等健康診断",
    basis: "有機溶剤中毒予防規則 第29条",
    frequency: "雇入れ時・配置替え時、その後6か月以内ごとに1回",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000036/",
  },
  "yuki-2": {
    key: "yuki-kenshin",
    name: "有機溶剤等健康診断",
    basis: "有機溶剤中毒予防規則 第29条",
    frequency: "雇入れ時・配置替え時、その後6か月以内ごとに1回",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000036/",
  },
  // 粉じん則／じん肺法 → じん肺健康診断
  funjin: {
    key: "funjin-kenshin",
    name: "じん肺健康診断",
    basis: "じん肺法（粉じん作業従事者）／粉じん障害防止規則",
    frequency: "じん肺管理区分に応じ1〜3年以内ごと等（就業時・定期）",
    officialUrl: "https://laws.e-gov.go.jp/law/335AC0000000030/",
  },
  // 石綿則 → 石綿健康診断（石綿則第40条）
  sekimen: {
    key: "sekimen-kenshin",
    name: "石綿健康診断",
    basis: "石綿障害予防規則 第40条",
    frequency: "雇入れ時・配置替え時、その後6か月以内ごとに1回（記録40年保存）",
    officialUrl: "https://laws.e-gov.go.jp/law/417M60000100021/",
  },
};

/**
 * 規制タグ配列から必要な特殊健診を導出（重複排除）。
 * @param tags ConcentrationLimitEntry.regulationTags 等のタグ配列。
 * @param cas CAS番号（指定時、令22条1項3号で健診対象から明示除外される物質
 *            =エチレンオキシド・ホルムアルデヒドの特化則健診を抑制する）。
 */
export function healthCheckupsFromTags(
  tags: readonly string[] | undefined,
  cas?: string | null
): HealthCheckupRequirement[] {
  if (!tags || tags.length === 0) return [];
  const suppressTokka = isTokkaKenshinExcluded(cas);
  const seen = new Set<string>();
  const out: HealthCheckupRequirement[] = [];
  for (const t of tags) {
    const req = TAG_TO_CHECKUP[t];
    if (!req || seen.has(req.key)) continue;
    if (req.key === "tokutei-kenshin" && suppressTokka) continue;
    seen.add(req.key);
    out.push(req);
  }
  return out;
}

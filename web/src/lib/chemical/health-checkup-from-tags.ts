/**
 * 特殊健康診断 対象判定（Phase B P1-2・純粋関数）。
 *
 * 物質に付与済みの労働安全衛生 特別則タグ（特化則/有機則/粉じん則/石綿則）から、
 * 事業者に課される特殊健康診断の種類を導出する。健診結果の記録は本Phase対象外（判定のみ）。
 *
 * 【正確性】条文・健診名は確立された法定事項のみを収録。該当の最終判断は事業者が法令で確認すること
 * （本判定は付与済みタグに基づく「該当の可能性」の提示）。
 */

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
  "tokutei-3": {
    key: "tokutei-kenshin",
    name: "特定化学物質健康診断",
    basis: "特定化学物質障害予防規則 第39条",
    frequency: "雇入れ時・配置替え時、その後6か月以内ごとに1回",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000039/",
  },
  // 有機則 → 有機溶剤等健康診断（有機則第29条）
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
 */
export function healthCheckupsFromTags(
  tags: readonly string[] | undefined
): HealthCheckupRequirement[] {
  if (!tags || tags.length === 0) return [];
  const seen = new Set<string>();
  const out: HealthCheckupRequirement[] = [];
  for (const t of tags) {
    const req = TAG_TO_CHECKUP[t];
    if (req && !seen.has(req.key)) {
      seen.add(req.key);
      out.push(req);
    }
  }
  return out;
}

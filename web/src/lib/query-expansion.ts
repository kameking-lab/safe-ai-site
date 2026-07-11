/**
 * 労働安全衛生分野の用語ゆれ・口語表現を正式名称に展開する。
 * RAG 検索の前処理として使い、現場の口語と法令上の正式名のギャップを埋める。
 */

type ExpansionRule = {
  /** 入力に含まれていれば展開対象 */
  pattern: RegExp;
  /** 元クエリに追加するキーワード（複数可） */
  expansions: string[];
};

const EXPANSION_RULES: ExpansionRule[] = [
  // 保護具の口語 → 法令上の正式名
  { pattern: /ヘルメット|安全帽/, expansions: ["保護帽", "墜落時保護用", "飛来落下物用"] },
  { pattern: /マスク/, expansions: ["呼吸用保護具", "防じんマスク", "防毒マスク"] },
  { pattern: /手袋/, expansions: ["保護手袋"] },
  { pattern: /メガネ|ゴーグル/, expansions: ["保護メガネ", "保護眼鏡"] },
  { pattern: /長靴|安全靴/, expansions: ["保護靴"] },
  { pattern: /命綱|安全帯/, expansions: ["墜落制止用器具", "フルハーネス", "ランヤード"] },

  // 作業・教育系
  { pattern: /特別教育/, expansions: ["安衛則第36条", "特別の教育"] },
  { pattern: /足場/, expansions: ["特別教育", "技能講習", "作業主任者"] },
  { pattern: /高所/, expansions: ["墜落制止用器具", "墜落防止"] },
  { pattern: /玉掛け/, expansions: ["技能講習", "特別教育"] },
  { pattern: /フォークリフト/, expansions: ["技能講習", "特別教育", "就業制限"] },
  { pattern: /クレーン/, expansions: ["クレーン等安全規則", "技能講習", "特別教育"] },

  // 荷役運搬機械の現場俗称（法令ナビ 2026-07-11 診断: 「爪のやつ」全滅の解消）。
  // 固定フレーズ（「爪のやつ」そのもの）は登録しない＝正規表現の語中一致で
  // 「爪のやつ」「ツメの機械」「フォークの部分」いずれの言い回しでも発火させる。
  { pattern: /爪|ツメ/, expansions: ["フォークリフト", "フォーク", "車両系荷役運搬機械"] },
  { pattern: /フォーク(?!リフト)/, expansions: ["フォークリフト", "車両系荷役運搬機械"] },
  { pattern: /パレット/, expansions: ["フォークリフト", "車両系荷役運搬機械", "荷役"] },
  { pattern: /リフト/, expansions: ["フォークリフト", "テールゲートリフター", "昇降"] },

  // 元請け・下請け関係
  { pattern: /元請[けげ]?/, expansions: ["元方事業者", "特定元方事業者"] },
  { pattern: /下請[けげ]?/, expansions: ["関係請負人"] },
  { pattern: /現場代理人|職長/, expansions: ["職長教育", "安全衛生責任者"] },

  // 有害物・化学物質
  { pattern: /シンナー|ベンゼン|トルエン/, expansions: ["有機溶剤", "有機則"] },
  { pattern: /アスベスト/, expansions: ["石綿", "石綿則"] },
  { pattern: /酸欠|酸素不足/, expansions: ["酸素欠乏", "酸欠則"] },

  // 健康管理
  { pattern: /熱中症/, expansions: ["暑熱", "高温多湿作業場所"] },
  { pattern: /ストレスチェック/, expansions: ["心理的な負担の程度を把握するための検査"] },

  // ── 現場口語プロジェクト（2026-07-11・E1/E2/LN-S1） ──────────────────
  // O5型の固定フレーズは登録しない＝語幹の正規表現一致のみ。質問の言い回し全体
  // （「クビにするなら何日前」等）ではなく、口語の**単語**を正式語へ正規化する。

  // 解雇の口語（E1/GQ48: クビ→解雇予告＝労基法第20条）
  { pattern: /クビ|首にする|首を切|首切り|辞めさせ|やめさせ/, expansions: ["解雇", "解雇予告"] },

  // 酸欠危険場所の現場語（E2/GQ49: 安衛令別表第6の場所語彙→酸素欠乏）
  // 「タンク」「槽」単体は化学設備等と多義のため「内部」を伴う形に限定する。
  {
    pattern: /マンホール|下水|汚水|し尿|暗きよ|暗きょ|暗渠|ピット|井戸|井筒|サイロ|(タンク|槽|船倉)の?内/,
    expansions: ["酸素欠乏", "酸欠", "酸素欠乏危険場所"],
  },

  // 重量物の口語（何キロまで持たせていい？→重量物＝女性則第3条・年少者則第7条）
  { pattern: /重い(荷物|物|もの)|何キロまで/, expansions: ["重量物"] },

  // 足場解体の口語（バラシ→解体＝安衛則第565条）
  { pattern: /バラシ|ばらし|ばらす/, expansions: ["解体", "足場の組立て"] },

  // 騒音の口語（うるさい現場・耳栓→騒音作業＝安衛則第588条）
  { pattern: /うるさ|耳栓/, expansions: ["騒音作業", "等価騒音"] },

  // 塗装（有機溶剤業務の現場語）
  { pattern: /塗装|ペンキ/, expansions: ["有機溶剤", "有機則"] },

  // ほこり（粉じんの現場語）
  { pattern: /ほこり|ホコリ|埃/, expansions: ["粉じん"] },

  // 労災の口語（〜したら労災になる？→業務災害＝労災保険法第7条）
  { pattern: /労災/, expansions: ["業務災害", "労働災害"] },
  { pattern: /通勤/, expansions: ["通勤災害"] },
];

/**
 * クエリに同義語・関連語を追加して返す。
 * 元のクエリを保持し、ヒットしたルールの語を末尾にスペース区切りで追加する。
 */
export function expandQuery(query: string): string {
  const additions: string[] = [];
  for (const rule of EXPANSION_RULES) {
    if (rule.pattern.test(query)) {
      additions.push(...rule.expansions);
    }
  }
  if (additions.length === 0) return query;
  const unique = Array.from(new Set(additions));
  return `${query} ${unique.join(" ")}`;
}

/**
 * 展開ルールの一覧を公開（テスト・ドキュメント用）。
 */
export function getExpansionRulesForTesting(): ReadonlyArray<{ pattern: RegExp; expansions: readonly string[] }> {
  return EXPANSION_RULES;
}

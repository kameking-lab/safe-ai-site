/**
 * 現場口語ベンチ（2026-07-11・BACKLOG-seo LN-S1 / BACKLOG-ux-tools E1-E3 吸収）。
 *
 * 現場の人が実際に使う言い回し50語級を、
 *  (a) チャットボットRAG（searchRelevantArticlesWithScore）と
 *  (b) 横断検索（buildSearchIndex + searchItems）
 * の両方で「着地」できるかを実測するための正本fixture。
 *
 * 設計方針:
 * - chatQuery は自然文（チャットボットに実際に入る形）、searchQuery は検索窓に
 *   打たれる短い語（/search・⌘K の実利用形態）。両面を同一ケースで対にする。
 * - goldCitations はコーパス実在の条文のみ（field-vernacular-bench.test.ts が
 *   実在をアサートし、条文が corpus から消えたらベンチごと赤くなる）。
 * - **O5型の固定フレーズ登録の検出**: 言い回しは意図的に複数ケースでゆらしてある
 *   （クビ×3・酸欠場所語×5 等）。「ベンチの文言そのもの」を synonyms に足す
 *   過学習では姉妹ケースが落ちる。
 * - outOfScope ケースは「score < 0.5 で no-hit 経路に落ちる」ことが正
 *   （GQ51型の範囲内リークの検出網）。
 *
 * 実行: npm run bench:field-terms（レポート: web/.bench/field-vernacular-latest.json）
 * 一次記録: docs/field-vernacular-bench-2026-07-11.md
 */

export type FieldVernacularCase = {
  /** FV01〜FV55 */
  id: string;
  /** 何の言い回しか（レポート用の短い説明） */
  label: string;
  /** チャットボットRAGへ入れる自然文 */
  chatQuery: string;
  /** 横断検索（/search・⌘K）へ入れる短い語 */
  searchQuery: string;
  /**
   * RAG着地判定: いずれか1つが top10 ホワイトリストに入り、かつ
   * normalizedScore >= 0.5 なら着地。空配列は RAG 判定対象外（検索専用ケース）。
   */
  goldCitations: { lawShort: string; articleNum: string }[];
  /**
   * 横断検索着地判定: top10 の title または url にいずれか1つが含まれれば着地。
   */
  searchExpect: string[];
  /** true = 範囲外質問。RAG は score < 0.5（no-hit）が正。横断検索は判定対象外。 */
  outOfScope?: boolean;
};

export const FIELD_VERNACULAR_CASES: FieldVernacularCase[] = [
  // ── 労基系の口語（解雇・残業・有給・休憩） ──────────────────────
  {
    id: "FV01",
    label: "クビ→解雇予告（GQ48と同型）",
    chatQuery: "従業員をクビにするときは何日前までに伝えないといけませんか？",
    searchQuery: "クビ 何日前",
    goldCitations: [{ lawShort: "労基法", articleNum: "第20条" }],
    searchExpect: ["労基法 第20条"],
  },
  {
    id: "FV02",
    label: "クビ→解雇予告手当（ゆらぎペア）",
    chatQuery: "急にクビだと言われたら手当はもらえますか？",
    searchQuery: "クビ 手当",
    goldCitations: [{ lawShort: "労基法", articleNum: "第20条" }],
    searchExpect: ["労基法 第20条"],
  },
  {
    id: "FV03",
    label: "辞めさせる→解雇（ゆらぎペア）",
    chatQuery: "問題を起こした社員を辞めさせるときのルールはありますか？",
    searchQuery: "辞めさせる ルール",
    goldCitations: [{ lawShort: "労基法", articleNum: "第20条" }],
    searchExpect: ["労基法 第20条"],
  },
  {
    id: "FV04",
    label: "残業→時間外労働の上限",
    chatQuery: "残業は月何時間までOKですか？",
    searchQuery: "残業 上限",
    goldCitations: [{ lawShort: "労基法", articleNum: "第36条" }],
    // 36協定・時間外労働上限規制の通達/法改正レコードも正当な着地先
    searchExpect: ["労基法 第36条", "36協定", "時間外労働"],
  },
  {
    id: "FV05",
    label: "有給→年次有給休暇",
    chatQuery: "有給は何日もらえますか？",
    searchQuery: "有給 日数",
    goldCitations: [{ lawShort: "労基法", articleNum: "第39条" }],
    searchExpect: ["労基法 第39条"],
  },
  {
    id: "FV06",
    label: "昼休み→休憩時間",
    chatQuery: "お昼の休憩は何分取らせないといけませんか？",
    searchQuery: "休憩 何分",
    goldCitations: [{ lawShort: "労基法", articleNum: "第34条" }],
    searchExpect: ["労基法 第34条"],
  },

  // ── 酸欠危険場所の現場語（GQ49と同型・安衛令別表第6の語彙） ────────
  {
    id: "FV07",
    label: "マンホール→酸欠資格（GQ49と同型）",
    chatQuery: "マンホールの中で作業させるとき、資格を持った人を置く必要はありますか？",
    searchQuery: "マンホール 資格",
    goldCitations: [
      { lawShort: "酸欠則", articleNum: "第11条" },
      { lawShort: "酸欠則", articleNum: "第12条" },
    ],
    searchExpect: ["酸欠則", "酸素欠乏"],
  },
  {
    id: "FV08",
    label: "タンク内部→酸欠（ゆらぎペア）",
    chatQuery: "タンクの内部で作業するときは何に気をつければいいですか？",
    searchQuery: "タンク内部 作業",
    goldCitations: [
      { lawShort: "酸欠則", articleNum: "第2条" },
      { lawShort: "酸欠則", articleNum: "第5条" },
      { lawShort: "酸欠則", articleNum: "第11条" },
    ],
    searchExpect: ["酸欠則", "酸素欠乏"],
  },
  {
    id: "FV09",
    label: "下水管→酸素濃度測定（ゆらぎペア）",
    chatQuery: "下水管の中に入る前に何を測ればいいですか？",
    searchQuery: "下水管 測定",
    goldCitations: [
      { lawShort: "酸欠則", articleNum: "第3条" },
      { lawShort: "酸欠則", articleNum: "第2条" },
    ],
    searchExpect: ["酸欠則", "酸素欠乏"],
  },
  {
    id: "FV10",
    label: "ピット→酸欠危険場所（ゆらぎペア）",
    chatQuery: "ピットの中の点検作業で必要な措置はありますか？",
    searchQuery: "ピット 作業",
    goldCitations: [
      { lawShort: "酸欠則", articleNum: "第2条" },
      { lawShort: "酸欠則", articleNum: "第5条" },
      { lawShort: "酸欠則", articleNum: "第7条" },
    ],
    searchExpect: ["酸欠則", "酸素欠乏"],
  },
  {
    id: "FV11",
    label: "井戸→酸欠危険場所（ゆらぎペア）",
    chatQuery: "井戸の中に入る作業は危ないですか？",
    searchQuery: "井戸 作業",
    goldCitations: [
      { lawShort: "酸欠則", articleNum: "第2条" },
      { lawShort: "酸欠則", articleNum: "第3条" },
      { lawShort: "酸欠則", articleNum: "第5条" },
    ],
    searchExpect: ["酸欠則", "酸素欠乏"],
  },

  // ── 墜落・保護具の現場語 ─────────────────────────────────────
  {
    id: "FV12",
    label: "命綱→墜落制止用器具",
    chatQuery: "命綱はどんなときに必要ですか？",
    searchQuery: "命綱 義務",
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第518条" },
      { lawShort: "安衛則", articleNum: "第519条" },
      { lawShort: "安衛則", articleNum: "第521条" },
    ],
    searchExpect: ["墜落制止", "フルハーネス", "安衛則 第518条"],
  },
  {
    id: "FV13",
    label: "胴ベルト→フルハーネス移行",
    chatQuery: "胴ベルトの安全帯はもう使えないんですか？",
    searchQuery: "胴ベルト 安全帯",
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第518条" },
      { lawShort: "安衛則", articleNum: "第519条" },
      { lawShort: "安衛則", articleNum: "第521条" },
    ],
    searchExpect: ["フルハーネス", "墜落制止"],
  },
  {
    id: "FV14",
    label: "親綱→安全帯取付設備",
    chatQuery: "親綱はどこに張ればいいですか？",
    searchQuery: "親綱",
    goldCitations: [{ lawShort: "建災防規程", articleNum: "第11条" }],
    searchExpect: ["建災防規程 第11条", "親綱"],
  },
  {
    id: "FV15",
    label: "ヘルメット→保護帽",
    chatQuery: "ヘルメットはどんな作業でかぶらないとダメですか？",
    searchQuery: "ヘルメット 義務",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第539条" }],
    searchExpect: ["保護帽", "ヘルメット"],
  },
  {
    id: "FV16",
    label: "脚立→昇降設備・高所",
    chatQuery: "脚立やはしごで作業するときの決まりはありますか？",
    searchQuery: "脚立 作業",
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第526条" },
      { lawShort: "安衛則", articleNum: "第518条" },
    ],
    // 高所作業（用語集・教育コース）への着地も正当（脚立単独の条文は未収録）
    searchExpect: ["安衛則 第526条", "はしご", "足場", "高所作業"],
  },
  {
    id: "FV17",
    label: "高さ2メートル→高所作業",
    chatQuery: "高さ2メートルの場所の作業で柵は必要ですか？",
    searchQuery: "2メートル 作業床",
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第518条" },
      { lawShort: "安衛則", articleNum: "第519条" },
    ],
    searchExpect: ["安衛則 第518条", "安衛則 第519条", "墜落"],
  },

  // ── 重機・荷役の現場俗称 ─────────────────────────────────────
  {
    id: "FV18",
    label: "ユンボ→車両系建設機械の資格",
    chatQuery: "ユンボを運転するのに資格はいりますか？",
    searchQuery: "ユンボ 資格",
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第61条" },
      { lawShort: "安衛令", articleNum: "第20条" },
    ],
    searchExpect: ["安衛法 第61条", "安衛令 第20条", "建設機械"],
  },
  {
    id: "FV19",
    label: "バックホーで吊り→用途外使用",
    chatQuery: "バックホーで荷を吊ってもいいですか？",
    searchQuery: "バックホー 吊り",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第164条" }],
    searchExpect: ["安衛則 第164条", "用途", "建設機械"],
  },
  {
    id: "FV20",
    label: "ユニック→移動式クレーン",
    chatQuery: "ユニック車で荷を吊るのに資格はいりますか？",
    searchQuery: "ユニック 資格",
    goldCitations: [
      { lawShort: "クレーン則", articleNum: "第68条" },
      { lawShort: "安衛法", articleNum: "第61条" },
    ],
    searchExpect: ["クレーン", "安衛法 第61条"],
  },
  {
    id: "FV21",
    label: "リーチリフト→フォークリフト",
    chatQuery: "リーチリフトの運転に資格はいりますか？",
    searchQuery: "リーチリフト 資格",
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第61条" },
      { lawShort: "安衛令", articleNum: "第20条" },
    ],
    searchExpect: ["フォークリフト", "安衛法 第61条"],
  },
  {
    id: "FV22",
    label: "玉掛けのワイヤー→玉掛用具・ワイヤロープ",
    chatQuery: "玉掛けのワイヤーの点検はいつやればいいですか？",
    searchQuery: "玉掛け ワイヤー",
    goldCitations: [
      { lawShort: "クレーン則", articleNum: "第213条" },
      { lawShort: "クレーン則", articleNum: "第214条" },
      { lawShort: "クレーン則", articleNum: "第215条" },
    ],
    searchExpect: ["クレーン則", "玉掛"],
  },
  {
    id: "FV23",
    label: "パレットに人→用途外使用",
    chatQuery: "フォークリフトのパレットに人を乗せて上げてもいいですか？",
    searchQuery: "パレット 人",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第151条の14" }],
    searchExpect: ["第151条の14", "フォークリフト"],
  },
  {
    id: "FV24",
    label: "高所作業車の資格",
    chatQuery: "高所作業車で作業するのに資格はいりますか？",
    searchQuery: "高所作業車 資格",
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第61条" },
      { lawShort: "安衛令", articleNum: "第20条" },
    ],
    searchExpect: ["高所作業車", "安衛法 第61条"],
  },

  // ── 化学・有機溶剤の現場語 ───────────────────────────────────
  {
    id: "FV25",
    label: "シンナー作業の換気（換気PIN誤発火の是正確認）",
    chatQuery: "シンナー作業で換気は必要ですか？",
    searchQuery: "シンナー 換気",
    goldCitations: [
      { lawShort: "有機則", articleNum: "第5条" },
      { lawShort: "有機則", articleNum: "第6条" },
    ],
    searchExpect: ["有機則"],
  },
  {
    id: "FV26",
    label: "シンナー→有機溶剤健診",
    chatQuery: "シンナーを使う人の健康診断は普通のと違いますか？",
    searchQuery: "シンナー 健康診断",
    goldCitations: [
      { lawShort: "有機則", articleNum: "第29条" },
      { lawShort: "有機則", articleNum: "第30条" },
    ],
    searchExpect: ["有機則"],
  },
  {
    id: "FV27",
    label: "塗装のマスク→呼吸用保護具",
    chatQuery: "塗装作業ではどんなマスクを着ければいいですか？",
    searchQuery: "塗装 マスク",
    goldCitations: [{ lawShort: "有機則", articleNum: "第33条" }],
    searchExpect: ["有機則", "呼吸用保護具", "防毒マスク"],
  },
  {
    id: "FV28",
    label: "アスベスト→石綿事前調査",
    chatQuery: "古い建物を壊すときアスベストの調査は義務ですか？",
    searchQuery: "アスベスト 事前調査",
    goldCitations: [{ lawShort: "石綿則", articleNum: "第3条" }],
    searchExpect: ["石綿"],
  },
  {
    id: "FV29",
    label: "ほこり→粉じんのマスク",
    chatQuery: "ほこりっぽい現場ではマスクが要りますか？",
    searchQuery: "粉じん マスク",
    goldCitations: [{ lawShort: "粉じん則", articleNum: "第27条" }],
    searchExpect: ["粉じん"],
  },

  // ── 健診・健康の現場語 ───────────────────────────────────────
  {
    id: "FV30",
    label: "一人親方の健診",
    chatQuery: "一人親方でも健康診断は受けないとダメですか？",
    searchQuery: "一人親方 健康診断",
    goldCitations: [{ lawShort: "安衛法", articleNum: "第66条" }],
    // 個人事業者への安全衛生規制適用（法改正レコード）は一人親方質問の最適着地
    searchExpect: ["安衛法 第66条", "健康診断", "個人事業者", "フリーランス"],
  },
  {
    id: "FV31",
    label: "夜勤→深夜業の健診年2回",
    chatQuery: "夜勤ばかりの人の健康診断は年2回って本当ですか？",
    searchQuery: "夜勤 健康診断",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第45条" }],
    searchExpect: ["安衛則 第45条", "健康診断"],
  },
  {
    id: "FV32",
    label: "ストレスチェックの人数要件",
    chatQuery: "ストレスチェックは何人の会社からやらないとダメですか？",
    searchQuery: "ストレスチェック 何人",
    goldCitations: [{ lawShort: "安衛法", articleNum: "第66条の10" }],
    searchExpect: ["ストレスチェック", "第66条の10"],
  },
  {
    id: "FV33",
    label: "重い荷物→重量物の制限",
    chatQuery: "腰を痛めそうな重い荷物は何キロまで持たせていいですか？",
    searchQuery: "重い荷物 何キロ",
    goldCitations: [
      { lawShort: "女性則", articleNum: "第3条" },
      { lawShort: "年少者則", articleNum: "第7条" },
    ],
    searchExpect: ["重量物", "女性則", "腰痛"],
  },

  // ── 熱中症・作業環境の現場語 ─────────────────────────────────
  {
    id: "FV34",
    label: "熱中症でぶっ倒れた→労災・対策義務",
    chatQuery: "熱中症でぶっ倒れたら労災になりますか？",
    searchQuery: "熱中症 義務",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第612条の2" }],
    searchExpect: ["熱中症", "第612条の2"],
  },
  {
    id: "FV35",
    label: "うるさい現場→騒音・耳栓",
    chatQuery: "うるさい現場では耳栓が要りますか？",
    searchQuery: "騒音 耳栓",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第588条" }],
    searchExpect: ["騒音", "安衛則 第588条"],
  },
  {
    id: "FV36",
    label: "暑さ指数WBGT",
    chatQuery: "現場の暑さ指数って測らないとダメですか？",
    searchQuery: "暑さ指数 義務",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第612条の2" }],
    searchExpect: ["熱中症", "WBGT", "第612条の2"],
  },

  // ── 労災の現場語 ─────────────────────────────────────────────
  {
    id: "FV37",
    label: "蜂に刺された→業務災害",
    chatQuery: "作業中に蜂に刺されたら労災になりますか？",
    // 横断検索は「蜂」を含む収載コンテンツ自体が無く語彙の問題ではないため対象外
    // （チャットボットRAG＝労災保険法第7条への到達のみ判定）
    searchQuery: "",
    goldCitations: [
      { lawShort: "労災保険法", articleNum: "第7条" },
      { lawShort: "労災保険法", articleNum: "第14条" },
    ],
    searchExpect: [],
  },
  {
    id: "FV38",
    label: "通勤中の事故→通勤災害",
    chatQuery: "通勤の帰り道でケガをしたら労災になりますか？",
    searchQuery: "通勤 労災",
    goldCitations: [{ lawShort: "労災保険法", articleNum: "第7条" }],
    searchExpect: ["労災", "通勤"],
  },
  {
    id: "FV39",
    label: "ケガ人が出たら報告→死傷病報告",
    chatQuery: "作業中にケガ人が出たら労基署への報告は必要ですか？",
    searchQuery: "ケガ 報告",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第97条" }],
    searchExpect: ["安衛則 第97条", "死傷病報告"],
  },

  // ── 教育・資格の現場語 ───────────────────────────────────────
  {
    id: "FV40",
    label: "グラインダー→研削といし",
    chatQuery: "グラインダーの砥石の交換は資格がいりますか？",
    searchQuery: "グラインダー 交換",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第117条" }],
    searchExpect: ["研削といし", "安衛則 第117条"],
  },
  {
    id: "FV41",
    label: "新人をいきなり現場に→雇入れ時教育",
    chatQuery: "新人をいきなり現場に出してもいいですか？",
    searchQuery: "新人 教育",
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第59条" },
      { lawShort: "安衛則", articleNum: "第35条" },
    ],
    searchExpect: ["雇入れ", "安衛法 第59条"],
  },
  {
    id: "FV42",
    label: "職長になるには→職長教育",
    chatQuery: "職長になるには何か講習を受ける必要がありますか？",
    searchQuery: "職長 講習",
    goldCitations: [{ lawShort: "安衛法", articleNum: "第60条" }],
    searchExpect: ["職長", "安衛法 第60条"],
  },
  {
    id: "FV43",
    label: "溶接の資格",
    chatQuery: "溶接の仕事は資格がないとできませんか？",
    searchQuery: "溶接 資格",
    goldCitations: [
      { lawShort: "安衛法", articleNum: "第61条" },
      { lawShort: "安衛令", articleNum: "第20条" },
    ],
    searchExpect: ["溶接", "安衛法 第61条"],
  },
  {
    id: "FV44",
    label: "フルハーネスの講習→特別教育",
    chatQuery: "フルハーネスは講習を受けないと使えませんか？",
    searchQuery: "フルハーネス 講習",
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第36条" },
      { lawShort: "安衛則", articleNum: "第518条" },
    ],
    searchExpect: ["フルハーネス", "特別教育"],
  },

  // ── 足場の現場語 ─────────────────────────────────────────────
  {
    id: "FV45",
    label: "足場のバラシ→解体",
    chatQuery: "足場のバラシで気をつけることはありますか？",
    searchQuery: "足場 バラシ",
    goldCitations: [
      { lawShort: "安衛則", articleNum: "第565条" },
      { lawShort: "安衛則", articleNum: "第566条" },
    ],
    searchExpect: ["足場", "安衛則 第565条"],
  },
  {
    id: "FV46",
    label: "足場の手すりの高さ",
    chatQuery: "足場の手すりの高さは何センチ必要ですか？",
    searchQuery: "足場 手すり 高さ",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第563条" }],
    searchExpect: ["足場", "第563条"],
  },

  // ── クレーンの現場語 ─────────────────────────────────────────
  {
    id: "FV47",
    label: "クレーンの合図",
    chatQuery: "クレーンの合図は誰が決めるんですか？",
    searchQuery: "クレーン 合図",
    goldCitations: [{ lawShort: "クレーン則", articleNum: "第25条" }],
    searchExpect: ["クレーン則 第25条", "合図"],
  },
  {
    id: "FV48",
    label: "クレーンの年次点検",
    chatQuery: "クレーンの点検は年に1回で足りますか？",
    searchQuery: "クレーン 点検 1年",
    goldCitations: [
      { lawShort: "クレーン則", articleNum: "第34条" },
      { lawShort: "クレーン則", articleNum: "第35条" },
    ],
    searchExpect: ["クレーン則 第34条", "定期自主検査"],
  },

  // ── 電気・その他の現場語 ─────────────────────────────────────
  {
    id: "FV49",
    label: "感電しないために→漏電遮断装置",
    chatQuery: "漏電で感電しないためには何が要りますか？",
    searchQuery: "感電 対策",
    goldCitations: [{ lawShort: "安衛則", articleNum: "第333条" }],
    searchExpect: ["感電", "漏電", "安衛則 第333条"],
  },
  {
    id: "FV50",
    label: "KY用紙（検索専用・機能着地）",
    chatQuery: "",
    searchQuery: "KY 用紙",
    goldCitations: [],
    searchExpect: ["KY", "危険予知"],
  },

  // ── 範囲外（GQ51型リークの検出網。score < 0.5 が正） ──────────────
  {
    id: "FV51",
    label: "車検（範囲外・GQ51と同型）",
    chatQuery: "自動車の車検は何年ごとに受ける必要がありますか？",
    searchQuery: "",
    goldCitations: [],
    searchExpect: [],
    outOfScope: true,
  },
  {
    id: "FV52",
    label: "インボイス（範囲外・税務）",
    chatQuery: "インボイスの登録は必要ですか？",
    searchQuery: "",
    goldCitations: [],
    searchExpect: [],
    outOfScope: true,
  },
  {
    id: "FV53",
    label: "社用車のオイル交換（範囲外・車両整備）",
    chatQuery: "社用車のオイル交換はいつやるべきですか？",
    searchQuery: "",
    goldCitations: [],
    searchExpect: [],
    outOfScope: true,
  },
  {
    id: "FV54",
    label: "確定申告（範囲外・税務）",
    chatQuery: "確定申告はいつまでに済ませる必要がありますか？",
    searchQuery: "",
    goldCitations: [],
    searchExpect: [],
    outOfScope: true,
  },
  {
    id: "FV55",
    label: "年末調整（範囲外・税務）",
    chatQuery: "年末調整のやり方を教えてください。",
    searchQuery: "",
    goldCitations: [],
    searchExpect: [],
    outOfScope: true,
  },
];

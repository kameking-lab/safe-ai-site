/**
 * RAG 検索精度ベンチマーク用の 100 問テストセット。
 *
 * 各問は {question, gold[]} の組で構成され、gold は (lawShort, articleNum) の許容セット。
 * RAG 検索 top-5 に gold のいずれか 1 件でも含まれれば「正答」とみなす。
 *
 * トピックは労働安全衛生関連の主要 33 法令から横断的に選定。
 */
export type RagGold = { lawShort: string; articleNum: string };
export type RagTestCase = {
  id: number;
  topic: string;
  question: string;
  gold: RagGold[];
};

export const RAG_100_QUESTIONS: RagTestCase[] = [
  // A. 総則・組織体制 (1-10)
  { id: 1, topic: "総則", question: "労働安全衛生法の目的は何ですか？", gold: [{ lawShort: "安衛法", articleNum: "第1条" }] },
  { id: 2, topic: "総則", question: "労働災害の定義を教えてください。", gold: [{ lawShort: "安衛法", articleNum: "第2条" }] },
  { id: 3, topic: "総則", question: "事業者の責務は何ですか？", gold: [{ lawShort: "安衛法", articleNum: "第3条" }] },
  { id: 4, topic: "総則", question: "労働者の責務は何条に規定されていますか？", gold: [{ lawShort: "安衛法", articleNum: "第4条" }] },
  { id: 5, topic: "組織", question: "総括安全衛生管理者の選任要件を教えてください。", gold: [{ lawShort: "安衛法", articleNum: "第10条" }, { lawShort: "安衛則", articleNum: "第2条" }] },
  { id: 6, topic: "組織", question: "安全管理者は何人以上の事業場で選任が必要ですか？", gold: [{ lawShort: "安衛法", articleNum: "第11条" }, { lawShort: "安衛則", articleNum: "第7条" }] },
  { id: 7, topic: "組織", question: "衛生管理者の選任義務は？", gold: [{ lawShort: "安衛法", articleNum: "第12条" }] },
  { id: 8, topic: "組織", question: "産業医の選任は何条で定められていますか？", gold: [{ lawShort: "安衛法", articleNum: "第13条" }] },
  { id: 9, topic: "組織", question: "作業主任者の選任根拠は？", gold: [{ lawShort: "安衛法", articleNum: "第14条" }] },
  { id: 10, topic: "組織", question: "安全衛生委員会の設置義務は？", gold: [{ lawShort: "安衛法", articleNum: "第17条" }, { lawShort: "安衛法", articleNum: "第18条" }, { lawShort: "安衛法", articleNum: "第19条" }] },

  // B. 教育 (11-20)
  { id: 11, topic: "教育", question: "雇入れ時の安全衛生教育は何条に基づきますか？", gold: [{ lawShort: "安衛法", articleNum: "第59条" }, { lawShort: "安衛則", articleNum: "第35条" }] },
  { id: 12, topic: "教育", question: "職長教育は何条で誰が対象ですか？", gold: [{ lawShort: "安衛法", articleNum: "第60条" }, { lawShort: "労働安全衛生法施行令", articleNum: "第19条" }] },
  { id: 13, topic: "教育", question: "フルハーネス特別教育の根拠条文は？", gold: [{ lawShort: "安衛則", articleNum: "第36条" }] },
  { id: 14, topic: "教育", question: "特別教育を要する業務は何条に列挙されていますか？", gold: [{ lawShort: "安衛則", articleNum: "第36条" }, { lawShort: "安衛法", articleNum: "第59条" }] },
  { id: 15, topic: "教育", question: "安全衛生教育の記録保存はどの規則ですか？", gold: [{ lawShort: "安衛則", articleNum: "第38条" }, { lawShort: "安衛法", articleNum: "第59条" }] },
  { id: 16, topic: "教育", question: "危険有害業務に従事する労働者への教育義務は？", gold: [{ lawShort: "安衛法", articleNum: "第59条" }] },
  { id: 17, topic: "教育", question: "化学物質管理者の選任根拠を教えて。", gold: [{ lawShort: "安衛則", articleNum: "第12条" }, { lawShort: "安衛法", articleNum: "第57条の3" }] },
  { id: 18, topic: "教育", question: "玉掛け技能講習の根拠条文は？", gold: [{ lawShort: "クレーン則", articleNum: "第221条" }] },
  { id: 19, topic: "教育", question: "ボイラー取扱作業主任者の資格要件は？", gold: [{ lawShort: "ボイラー則", articleNum: "第25条" }] },
  { id: 20, topic: "教育", question: "ゴンドラ操作の特別教育は何則のどこに？", gold: [{ lawShort: "ゴンドラ則", articleNum: "第12条" }] },

  // C. 健康診断・健康管理 (21-30)
  { id: 21, topic: "健診", question: "雇入れ時の健康診断は何条ですか？", gold: [{ lawShort: "安衛法", articleNum: "第66条" }] },
  { id: 22, topic: "健診", question: "定期健康診断の頻度は？", gold: [{ lawShort: "安衛法", articleNum: "第66条" }] },
  { id: 23, topic: "健診", question: "ストレスチェック制度の根拠条文は？", gold: [{ lawShort: "安衛法", articleNum: "第66条の10" }] },
  { id: 24, topic: "健診", question: "長時間労働者の医師による面接指導は？", gold: [{ lawShort: "安衛法", articleNum: "第66条の8" }] },
  { id: 25, topic: "健診", question: "じん肺健康診断の対象は？", gold: [{ lawShort: "じん肺法", articleNum: "第7条" }, { lawShort: "じん肺法", articleNum: "第8条" }, { lawShort: "じん肺法", articleNum: "第3条" }] },
  { id: 26, topic: "健診", question: "電離放射線業務の特殊健診は？", gold: [{ lawShort: "電離則", articleNum: "第56条" }] },
  { id: 27, topic: "健診", question: "有機溶剤健康診断はどの則の何条？", gold: [{ lawShort: "有機則", articleNum: "第29条" }, { lawShort: "有機則", articleNum: "第29条の2" }] },
  { id: 28, topic: "健診", question: "特定化学物質健康診断の根拠は？", gold: [{ lawShort: "特化則", articleNum: "第39条" }, { lawShort: "特化則", articleNum: "第40条" }] },
  { id: 29, topic: "健診", question: "石綿健康診断は何条で？", gold: [{ lawShort: "石綿則", articleNum: "第40条" }, { lawShort: "石綿則", articleNum: "第36条" }] },
  { id: 30, topic: "健診", question: "メンタルヘルスケアの基本方針は？", gold: [{ lawShort: "メンタル指針", articleNum: "第1" }, { lawShort: "メンタル指針", articleNum: "第2" }, { lawShort: "メンタル指針", articleNum: "第3" }, { lawShort: "メンタル指針", articleNum: "第5" }] },

  // D. 墜落・高所作業 (31-40)
  { id: 31, topic: "墜落", question: "墜落制止用器具の使用義務は何条ですか？", gold: [{ lawShort: "安衛則", articleNum: "第518条" }, { lawShort: "安衛則", articleNum: "第520条" }, { lawShort: "安衛則", articleNum: "第521条" }] },
  { id: 32, topic: "墜落", question: "高さ何メートル以上で墜落防止が必要ですか？", gold: [{ lawShort: "安衛則", articleNum: "第518条" }, { lawShort: "安衛則", articleNum: "第519条" }] },
  { id: 33, topic: "墜落", question: "ロープ高所作業のライフラインは何条？", gold: [{ lawShort: "安衛則", articleNum: "第539条の2" }, { lawShort: "安衛則", articleNum: "第539条の3" }, { lawShort: "安衛則", articleNum: "第539条の4" }, { lawShort: "安衛則", articleNum: "第539条の5" }, { lawShort: "安衛則", articleNum: "第539条の7" }] },
  { id: 34, topic: "墜落", question: "開口部の囲いや手すりの設置は？", gold: [{ lawShort: "安衛則", articleNum: "第519条" }] },
  { id: 35, topic: "墜落", question: "安全帯（要求性能墜落制止用器具）の点検は何条？", gold: [{ lawShort: "安衛則", articleNum: "第521条" }] },
  { id: 36, topic: "足場", question: "足場の作業床の幅は何条？", gold: [{ lawShort: "安衛則", articleNum: "第563条" }, { lawShort: "安衛則", articleNum: "第564条" }, { lawShort: "安衛則", articleNum: "第565条" }, { lawShort: "安衛則", articleNum: "第566条" }] },
  { id: 37, topic: "足場", question: "足場の点検義務は何条？", gold: [{ lawShort: "安衛則", articleNum: "第567条" }, { lawShort: "安衛則", articleNum: "第566条" }, { lawShort: "安衛則", articleNum: "第564条" }, { lawShort: "安衛則", articleNum: "第563条" }] },
  { id: 38, topic: "足場", question: "つり足場の構造基準は？", gold: [{ lawShort: "安衛則", articleNum: "第563条" }, { lawShort: "安衛則", articleNum: "第564条" }, { lawShort: "安衛則", articleNum: "第574条" }, { lawShort: "安衛則", articleNum: "第552条" }] },
  { id: 39, topic: "足場", question: "足場組立て等作業主任者の選任は？", gold: [{ lawShort: "安衛則", articleNum: "第565条" }, { lawShort: "安衛法", articleNum: "第14条" }] },
  { id: 40, topic: "墜落", question: "投下設備や監視人配置の規定は？", gold: [{ lawShort: "安衛則", articleNum: "第536条" }, { lawShort: "安衛則", articleNum: "第519条" }] },

  // E. クレーン・揚重機 (41-48)
  { id: 41, topic: "クレーン", question: "クレーン定期自主検査の頻度は？", gold: [{ lawShort: "クレーン則", articleNum: "第34条" }, { lawShort: "クレーン則", articleNum: "第35条" }, { lawShort: "クレーン則", articleNum: "第36条" }] },
  { id: 42, topic: "クレーン", question: "クレーン運転の資格は？", gold: [{ lawShort: "クレーン則", articleNum: "第22条" }, { lawShort: "クレーン則", articleNum: "第73条" }, { lawShort: "クレーン則", articleNum: "第74条" }, { lawShort: "クレーン則", articleNum: "第75条" }] },
  { id: 43, topic: "クレーン", question: "玉掛け作業の特別教育・技能講習は？", gold: [{ lawShort: "クレーン則", articleNum: "第221条" }, { lawShort: "クレーン則", articleNum: "第222条" }] },
  { id: 44, topic: "クレーン", question: "移動式クレーンの定格荷重を超える使用禁止は？", gold: [{ lawShort: "クレーン則", articleNum: "第69条" }, { lawShort: "クレーン則", articleNum: "第23条" }] },
  { id: 45, topic: "クレーン", question: "クレーンの安全装置の機能保持は？", gold: [{ lawShort: "クレーン則", articleNum: "第32条" }, { lawShort: "クレーン則", articleNum: "第34条" }, { lawShort: "クレーン則", articleNum: "第35条" }] },
  { id: 46, topic: "クレーン", question: "デリックの設置届は？", gold: [{ lawShort: "クレーン則", articleNum: "第96条" }, { lawShort: "クレーン則", articleNum: "第111条" }, { lawShort: "クレーン則", articleNum: "第103条" }] },
  { id: 47, topic: "クレーン", question: "つり上げ荷重1トン以上の玉掛けに必要な資格は？", gold: [{ lawShort: "クレーン則", articleNum: "第221条" }] },
  { id: 48, topic: "クレーン", question: "クレーンの検査証の有効期間は？", gold: [{ lawShort: "クレーン則", articleNum: "第10条" }, { lawShort: "クレーン則", articleNum: "第40条" }, { lawShort: "クレーン則", articleNum: "第34条" }] },

  // F. 化学物質・有害業務 (49-63)
  { id: 49, topic: "有機溶剤", question: "有機溶剤作業主任者の職務は？", gold: [{ lawShort: "有機則", articleNum: "第19条" }, { lawShort: "有機則", articleNum: "第19条の2" }] },
  { id: 50, topic: "有機溶剤", question: "有機溶剤の区分（第1種・第2種・第3種）は？", gold: [{ lawShort: "有機則", articleNum: "第1条" }] },
  { id: 51, topic: "局排", question: "局所排気装置の性能要件は？", gold: [{ lawShort: "有機則", articleNum: "第16条" }, { lawShort: "特化則", articleNum: "第7条" }, { lawShort: "有機則", articleNum: "第28条" }] },
  { id: 52, topic: "局排", question: "プッシュプル型換気装置は？", gold: [{ lawShort: "有機則", articleNum: "第16条の2" }, { lawShort: "特化則", articleNum: "第7条の2" }, { lawShort: "有機則", articleNum: "第28条" }] },
  { id: 53, topic: "特化物", question: "特定化学物質第1類・第2類・第3類の区分は？", gold: [{ lawShort: "特化則", articleNum: "第2条" }] },
  { id: 54, topic: "石綿", question: "石綿作業の事前調査義務は？", gold: [{ lawShort: "石綿則", articleNum: "第3条" }] },
  { id: 55, topic: "石綿", question: "石綿則の作業計画作成義務は？", gold: [{ lawShort: "石綿則", articleNum: "第6条" }, { lawShort: "石綿則", articleNum: "第3条" }] },
  { id: 56, topic: "粉じん", question: "粉じん作業の特定粉じん発生源対策は？", gold: [{ lawShort: "粉じん則", articleNum: "第4条" }, { lawShort: "粉じん則", articleNum: "第22条" }, { lawShort: "粉じん則", articleNum: "第27条" }] },
  { id: 57, topic: "酸欠", question: "酸素欠乏の定義（酸素濃度）は？", gold: [{ lawShort: "酸欠則", articleNum: "第2条" }] },
  { id: 58, topic: "酸欠", question: "酸素欠乏危険作業主任者の選任は？", gold: [{ lawShort: "酸欠則", articleNum: "第11条" }] },
  { id: 59, topic: "酸欠", question: "第1種酸素欠乏危険作業と第2種の違いは？", gold: [{ lawShort: "酸欠則", articleNum: "第2条" }, { lawShort: "酸欠則", articleNum: "第11条" }] },
  { id: 60, topic: "酸欠", question: "酸欠作業前の換気義務は？", gold: [{ lawShort: "酸欠則", articleNum: "第5条" }, { lawShort: "酸欠則", articleNum: "第5条の2" }] },
  { id: 61, topic: "化学物質", question: "SDS（安全データシート）の交付義務は？", gold: [{ lawShort: "安衛法", articleNum: "第57条の2" }] },
  { id: 62, topic: "化学物質", question: "化学物質のリスクアセスメントの義務は？", gold: [{ lawShort: "安衛法", articleNum: "第57条の3" }] },
  { id: 63, topic: "化学物質", question: "ラベル表示の義務は？", gold: [{ lawShort: "安衛法", articleNum: "第57条" }, { lawShort: "安衛法", articleNum: "第57条の2" }] },

  // G. 物理因子・特殊業務 (64-72)
  { id: 64, topic: "電離", question: "電離放射線の管理区域とは？", gold: [{ lawShort: "電離則", articleNum: "第3条" }] },
  { id: 65, topic: "電離", question: "電離放射線の被ばく線量限度は？", gold: [{ lawShort: "電離則", articleNum: "第8条" }, { lawShort: "電離則", articleNum: "第3条" }, { lawShort: "電離則", articleNum: "第2条の2" }] },
  { id: 66, topic: "熱中症", question: "熱中症のWBGT測定義務は何条？", gold: [{ lawShort: "安衛則", articleNum: "第612条の2" }] },
  { id: 67, topic: "熱中症", question: "暑熱環境における労働者の健康障害防止は？", gold: [{ lawShort: "安衛則", articleNum: "第612条の2" }] },
  { id: 68, topic: "騒音", question: "気積・採光・換気・温度の規定は？", gold: [{ lawShort: "安衛則", articleNum: "第600条" }, { lawShort: "安衛則", articleNum: "第604条" }, { lawShort: "安衛則", articleNum: "第607条" }, { lawShort: "安衛則", articleNum: "第627条" }] },
  { id: 69, topic: "ボイラー", question: "圧力容器の定期検査は？", gold: [{ lawShort: "ボイラー則", articleNum: "第32条" }, { lawShort: "ボイラー則", articleNum: "第64条" }] },
  { id: 70, topic: "VDT", question: "情報機器作業（VDT作業）の指針は？", gold: [{ lawShort: "VDTガイドライン", articleNum: "第1" }, { lawShort: "VDTガイドライン", articleNum: "第2" }, { lawShort: "VDTガイドライン", articleNum: "第3" }, { lawShort: "VDTガイドライン", articleNum: "第4" }] },
  { id: 71, topic: "重量物", question: "重量物取扱いの腰痛予防は？", gold: [{ lawShort: "安衛則", articleNum: "第558条" }, { lawShort: "安衛則", articleNum: "第151条の67" }, { lawShort: "安衛則", articleNum: "第165条" }] },
  { id: 72, topic: "高圧", question: "高気圧作業の作業主任者は？", gold: [{ lawShort: "高圧則", articleNum: "第11条" }, { lawShort: "高圧則", articleNum: "第1条" }] },

  // H. 作業環境測定・SDS (73-78)
  { id: 73, topic: "測定", question: "作業環境測定の義務は何条？", gold: [{ lawShort: "安衛法", articleNum: "第65条" }, { lawShort: "作業環境測定法", articleNum: "第3条" }] },
  { id: 74, topic: "測定", question: "作業環境測定の管理区分は？", gold: [{ lawShort: "作業環境測定法", articleNum: "第2条" }, { lawShort: "作業環境測定法", articleNum: "第3条" }, { lawShort: "安衛法", articleNum: "第65条" }] },
  { id: 75, topic: "測定", question: "作業環境測定士の登録は？", gold: [{ lawShort: "作業環境測定法", articleNum: "第33条" }, { lawShort: "作業環境測定法", articleNum: "第36条" }, { lawShort: "作業環境測定法", articleNum: "第41条" }] },
  { id: 76, topic: "測定", question: "粉じん作業場の作業環境測定の頻度は？", gold: [{ lawShort: "粉じん則", articleNum: "第26条" }, { lawShort: "粉じん則", articleNum: "第27条" }, { lawShort: "粉じん則", articleNum: "第22条" }] },
  { id: 77, topic: "測定", question: "有機溶剤の作業環境測定は何条？", gold: [{ lawShort: "有機則", articleNum: "第28条" }] },
  { id: 78, topic: "測定", question: "特定化学物質の作業環境測定は？", gold: [{ lawShort: "特化則", articleNum: "第36条" }, { lawShort: "特化則", articleNum: "第36条の2" }] },

  // I. 災害報告・救護・記録 (79-83)
  { id: 79, topic: "報告", question: "労働者死傷病報告の提出は？", gold: [{ lawShort: "安衛則", articleNum: "第97条" }] },
  { id: 80, topic: "報告", question: "重大災害発生時の報告先は？", gold: [{ lawShort: "安衛法", articleNum: "第100条" }, { lawShort: "安衛則", articleNum: "第97条" }] },
  { id: 81, topic: "報告", question: "計画届の対象工事は？", gold: [{ lawShort: "安衛法", articleNum: "第88条" }] },
  { id: 82, topic: "報告", question: "工事計画届の事前審査は何条？", gold: [{ lawShort: "安衛法", articleNum: "第88条" }] },
  { id: 83, topic: "罰則", question: "労働安全衛生法違反の罰則は？", gold: [{ lawShort: "安衛法", articleNum: "第120条" }] },

  // J. 労基法・労働関係 (84-93)
  { id: 84, topic: "労基", question: "法定労働時間（1日・1週）は？", gold: [{ lawShort: "労基法", articleNum: "第32条" }] },
  { id: 85, topic: "労基", question: "休憩時間の付与は？", gold: [{ lawShort: "労基法", articleNum: "第34条" }] },
  { id: 86, topic: "労基", question: "法定休日は週何日？", gold: [{ lawShort: "労基法", articleNum: "第35条" }] },
  { id: 87, topic: "労基", question: "36協定の根拠条文は？", gold: [{ lawShort: "労基法", articleNum: "第36条" }] },
  { id: 88, topic: "労基", question: "時間外労働の割増賃金は？", gold: [{ lawShort: "労基法", articleNum: "第37条" }] },
  { id: 89, topic: "労基", question: "年少者の深夜業の制限は？", gold: [{ lawShort: "労基法", articleNum: "第61条" }, { lawShort: "年少者労働基準規則", articleNum: "第3条" }] },
  { id: 90, topic: "労基", question: "業務上負傷の療養補償は？", gold: [{ lawShort: "労基法", articleNum: "第75条" }] },
  { id: 91, topic: "育介", question: "育児休業の取得要件は？", gold: [{ lawShort: "育介法", articleNum: "第5条" }, { lawShort: "育介法", articleNum: "第2条" }] },
  { id: 92, topic: "育介", question: "介護休業は何日まで？", gold: [{ lawShort: "育介法", articleNum: "第11条" }] },
  { id: 93, topic: "賃金", question: "最低賃金の決定方式は？", gold: [{ lawShort: "最賃法", articleNum: "第9条" }, { lawShort: "最賃法", articleNum: "第4条" }] },

  // K. 労災・契約・派遣等 (94-100)
  { id: 94, topic: "労災", question: "労災保険の業務災害給付は？", gold: [{ lawShort: "労災保険法", articleNum: "第7条" }, { lawShort: "労災保険法", articleNum: "第12条の8" }] },
  { id: 95, topic: "労災", question: "通勤災害の認定は？", gold: [{ lawShort: "労災保険法", articleNum: "第7条" }, { lawShort: "労災保険法", articleNum: "第7条第3項" }] },
  { id: 96, topic: "契約", question: "労働契約成立の原則は？", gold: [{ lawShort: "労契法", articleNum: "第1条" }, { lawShort: "労契法", articleNum: "第5条" }] },
  { id: 97, topic: "契約", question: "解雇権濫用法理は？", gold: [{ lawShort: "労契法", articleNum: "第16条" }] },
  { id: 98, topic: "契約", question: "有期労働契約の無期転換は？", gold: [{ lawShort: "労契法", articleNum: "第18条" }] },
  { id: 99, topic: "ハラスメント", question: "セクシュアルハラスメント防止義務は？", gold: [{ lawShort: "均等法", articleNum: "第11条" }] },
  { id: 100, topic: "ハラスメント", question: "妊娠・出産等を理由とする不利益取扱いの禁止は？", gold: [{ lawShort: "均等法", articleNum: "第11条の3" }, { lawShort: "均等法", articleNum: "第12条" }] },

  // L. 足場手すり補強問題 (101-104) – 安衛則563条特化
  { id: 101, topic: "足場", question: "足場の作業床に設けなければならない手すりの高さは何cm以上ですか？", gold: [{ lawShort: "安衛則", articleNum: "第563条" }] },
  { id: 102, topic: "足場", question: "足場の手すりに加えて設置が必要な中さん等の高さ基準は？", gold: [{ lawShort: "安衛則", articleNum: "第563条" }] },
  { id: 103, topic: "足場", question: "足場に手すり等を設けることが困難な場合の代替措置は何条に定められていますか？", gold: [{ lawShort: "安衛則", articleNum: "第563条" }, { lawShort: "安衛則", articleNum: "第518条" }] },
  { id: 104, topic: "足場", question: "足場の手すりの設置義務（安衛則563条）の2015年改正で追加された中さん等の規定内容は？", gold: [{ lawShort: "安衛則", articleNum: "第563条" }] },

  // M. フォークリフト就業制限・使用基準 (105-108) – 安衛令20条11号
  { id: 105, topic: "フォークリフト", question: "フォークリフトの運転に就業制限が設けられる最大荷重は何トン以上ですか？", gold: [{ lawShort: "安衛令", articleNum: "第20条" }] },
  { id: 106, topic: "フォークリフト", question: "フォークリフト運転業務の就業制限の根拠条文（政令）は？", gold: [{ lawShort: "安衛令", articleNum: "第20条" }, { lawShort: "安衛法", articleNum: "第61条" }] },
  { id: 107, topic: "フォークリフト", question: "フォークリフトの制限速度の設定義務は何条ですか？", gold: [{ lawShort: "安衛則", articleNum: "第151条の73" }] },
  { id: 108, topic: "フォークリフト", question: "フォークリフトを主たる用途以外（人の運搬等）に使用することを禁止している条文は？", gold: [{ lawShort: "安衛則", articleNum: "第151条の74" }] },
];

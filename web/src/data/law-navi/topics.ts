/**
 * 法令ナビ 分野インデックス（分野・機械・作業 → 法/令/則/通達の条文群マッピング）。
 *
 * 二層生成（docs/horei-navi-foundation-2026-07-11/01-diagnosis-and-design.md §2-2）:
 * - 候補列挙は `web/scripts/law-navi-topic-scan.mjs`（コーパス keywords/本文・synonyms・
 *   通達タイトルの機械走査）。本ファイルはその候補を人手レビューして採録した正本层。
 *   各トピックの `reviewNote` に走査根拠と採用判断を残す。
 * - 参照整合は topics-integrity.test.ts で機械固定:
 *   articles は curated コーパスに、circularIds は mhlwNotices に実在しなければ CI が落ちる
 *   （幽霊参照 0＝正本突合の思想。O18 リンカ・article-registry と同型）。
 *
 * aliases の方針（俗称ゆらぎ解決・O5型の固定フレーズ過学習は禁止）:
 * - 「爪のやつ」のような言い回しそのものは辞書に入れない。名詞の語幹（爪・ツメ・フォーク…）
 *   だけを持ち、横断検索エンジンの部分一致（variant.includes(k)）と query-expansion の
 *   正規表現ルールが言い回し差を吸収する。
 */

export type TopicArticleRef = {
  /** LawArticle.lawShort（例: 安衛則） */
  readonly lawShort: string;
  /** LawArticle.articleNum（例: 第151条の2） */
  readonly articleNum: string;
  /** 現場向けの役割ラベル（例: 定義・資格・点検） */
  readonly role: string;
};

export type LawNaviTopic = {
  /** URL用ID（/law-navi/topics/[id]） */
  readonly id: string;
  /** 表示名（現場の呼び名の代表形） */
  readonly name: string;
  /** 分野グループ（安衛則の節に相当する現場区分） */
  readonly fieldGroup: string;
  /** 1〜2文の説明（何がここにまとまっているか） */
  readonly description: string;
  /** 現場語・俗称・別名（横断検索 keywords と query-expansion に供給） */
  readonly aliases: readonly string[];
  /** 法→令→則の体系順の条文参照 */
  readonly articles: readonly TopicArticleRef[];
  /** 関連通達・告示・指針（mhlwNotices の id） */
  readonly circularIds: readonly string[];
  /** 関連する別表（beppyo.ts の id） */
  readonly beppyoIds: readonly string[];
  /** 二層生成の人手レビュー記録（機械走査の根拠と採用判断） */
  readonly reviewNote: string;
};

export const LAW_NAVI_TOPICS: readonly LawNaviTopic[] = [
  {
    id: "forklift",
    name: "フォークリフト",
    fieldGroup: "荷役運搬機械等",
    description:
      "フォークリフト（車両系荷役運搬機械等）の資格・作業ルール・機械の要件・点検を、法律→政令→省令→通達の体系順でまとめた分野ページ。",
    aliases: [
      "フォークリフト",
      "フォーク",
      "爪",
      "ツメ",
      "リフト",
      "パレット",
      "荷役",
      "荷役運搬",
      "車両系荷役運搬機械",
      "リーチリフト",
      "カウンターリフト",
      "構内運搬車",
    ],
    articles: [
      // ── 法律（労働安全衛生法）
      { lawShort: "安衛法", articleNum: "第59条", role: "安全衛生教育（特別教育の根拠）" },
      { lawShort: "安衛法", articleNum: "第61条", role: "就業制限（技能講習の根拠）" },
      { lawShort: "安衛法", articleNum: "第45条", role: "定期自主検査の根拠" },
      { lawShort: "安衛法", articleNum: "第35条", role: "重量表示（1トン以上の貨物）" },
      // ── 政令（労働安全衛生法施行令）
      { lawShort: "安衛令", articleNum: "第20条", role: "技能講習が必要な業務（第11号: 最大荷重1トン以上）" },
      // ── 省令（労働安全衛生規則 第2編第1章の2 車両系荷役運搬機械等）
      { lawShort: "安衛則", articleNum: "第36条", role: "特別教育が必要な業務（第5号: 最大荷重1トン未満）" },
      { lawShort: "安衛則", articleNum: "第151条の2", role: "車両系荷役運搬機械等の定義" },
      { lawShort: "安衛則", articleNum: "第151条の3", role: "作業計画" },
      { lawShort: "安衛則", articleNum: "第151条の4", role: "作業指揮者" },
      { lawShort: "安衛則", articleNum: "第151条の5", role: "制限速度" },
      { lawShort: "安衛則", articleNum: "第151条の6", role: "転落等の防止" },
      { lawShort: "安衛則", articleNum: "第151条の7", role: "接触の防止（立入禁止・誘導者）" },
      { lawShort: "安衛則", articleNum: "第151条の11", role: "運転位置から離れる場合の措置" },
      { lawShort: "安衛則", articleNum: "第151条の14", role: "主たる用途以外の使用の制限（爪に人を乗せる昇降の禁止）" },
      { lawShort: "安衛則", articleNum: "第151条の15", role: "修理・アタッチメント交換" },
      { lawShort: "安衛則", articleNum: "第151条の16", role: "前照灯・後照灯" },
      { lawShort: "安衛則", articleNum: "第151条の20", role: "使用の制限（最大荷重超え禁止）" },
      { lawShort: "安衛則", articleNum: "第151条の21", role: "定期自主検査（1年以内ごと）" },
    ],
    circularIds: [
      "mhlw-notice-0734", // フォークリフト構造規格（告示）
      "mhlw-notice-0757", // フォークリフト特定自主検査基準（告示）
      "mhlw-notice-0837", // フオークリフト運転技能講習規程（告示）
      "mhlw-notice-0273", // 技能講習規程等の一部改正（通達）
      "mhlw-notice-0488", // 1トン以上の運転業務に就くことができる者（通達）
      "mhlw-notice-0768", // 定期自主検査指針（則151条の21関係）
      "mhlw-notice-0984", // 安全管理の徹底（転倒・人身事故防止）（通達）
      "mhlw-notice-0985", // 荷役作業における安全管理の徹底（通達）
    ],
    beppyoIds: [],
    reviewNote:
      "2026-07-11 topic-scan: コーパス keywords『フォークリフト』『車両系荷役運搬機械』一致18条・通達タイトル一致10件から、貨物自動車固有条（151条の67・151条の74）と廃止済み指針（mhlw-notice-0778）・旧指針（0769）を人手で除外し採録。",
  },
  {
    id: "crane",
    name: "クレーン",
    fieldGroup: "クレーン等",
    description:
      "クレーン・移動式クレーンの資格（免許・特別教育）・設置手続き・作業ルール（合図・立入禁止・強風時中止）・点検検査を、法律→政令→省令の体系順でまとめた分野ページ。",
    aliases: [
      "クレーン",
      "移動式クレーン",
      "天井クレーン",
      "タワークレーン",
      "ラフター",
      "ユニック",
      "デリック",
      "ホイスト",
      "つり上げ",
      "吊り上げ",
      "巻上げ",
      "アウトリガー",
      "定格荷重",
    ],
    articles: [
      // ── 法律（労働安全衛生法）
      { lawShort: "安衛法", articleNum: "第37条", role: "特定機械等の製造許可" },
      { lawShort: "安衛法", articleNum: "第38条", role: "製造時等検査" },
      { lawShort: "安衛法", articleNum: "第45条", role: "定期自主検査の根拠" },
      { lawShort: "安衛法", articleNum: "第61条", role: "就業制限（免許・技能講習の根拠）" },
      // ── 政令（労働安全衛生法施行令）
      { lawShort: "安衛令", articleNum: "第20条", role: "就業制限業務（第6号: 5トン以上クレーン・第7号: 1トン以上移動式クレーン）" },
      // ── 省令（労働安全衛生規則）
      { lawShort: "安衛則", articleNum: "第86条", role: "機械等の設置等の届出" },
      { lawShort: "安衛則", articleNum: "第96条", role: "事故報告（倒壊・ワイヤロープ切断等）" },
      // ── 省令（クレーン等安全規則: クレーン）
      { lawShort: "クレーン則", articleNum: "第1条", role: "定義" },
      { lawShort: "クレーン則", articleNum: "第5条", role: "設置届" },
      { lawShort: "クレーン則", articleNum: "第9条", role: "クレーン検査証" },
      { lawShort: "クレーン則", articleNum: "第18条", role: "巻過ぎの防止" },
      { lawShort: "クレーン則", articleNum: "第21条", role: "特別の教育（5トン未満クレーン運転）" },
      { lawShort: "クレーン則", articleNum: "第22条", role: "就業制限（5トン以上はクレーン・デリック運転士免許）" },
      { lawShort: "クレーン則", articleNum: "第23条", role: "過負荷の制限" },
      { lawShort: "クレーン則", articleNum: "第24条の2", role: "定格荷重の表示等" },
      { lawShort: "クレーン則", articleNum: "第25条", role: "運転の合図" },
      { lawShort: "クレーン則", articleNum: "第26条", role: "搭乗の制限" },
      { lawShort: "クレーン則", articleNum: "第29条", role: "立入禁止" },
      { lawShort: "クレーン則", articleNum: "第31条", role: "暴風時における逸走の防止" },
      { lawShort: "クレーン則", articleNum: "第31条の2", role: "強風時の作業中止" },
      { lawShort: "クレーン則", articleNum: "第32条", role: "運転位置からの離脱の禁止" },
      { lawShort: "クレーン則", articleNum: "第33条", role: "組立て・解体の作業" },
      { lawShort: "クレーン則", articleNum: "第34条", role: "定期自主検査（年次）" },
      { lawShort: "クレーン則", articleNum: "第35条", role: "定期自主検査（月次）" },
      { lawShort: "クレーン則", articleNum: "第36条", role: "作業開始前の点検" },
      { lawShort: "クレーン則", articleNum: "第37条", role: "暴風後等の点検" },
      { lawShort: "クレーン則", articleNum: "第38条", role: "自主検査等の記録（3年保存）" },
      { lawShort: "クレーン則", articleNum: "第40条", role: "性能検査" },
      // ── 省令（クレーン等安全規則: 移動式クレーン）
      { lawShort: "クレーン則", articleNum: "第61条", role: "設置報告書（3トン未満の移動式クレーン）" },
      { lawShort: "クレーン則", articleNum: "第63条", role: "検査証の備付け（移動式クレーン）" },
      { lawShort: "クレーン則", articleNum: "第68条", role: "就業制限（移動式クレーン運転士免許）" },
      { lawShort: "クレーン則", articleNum: "第70条の2", role: "定格荷重の表示等（移動式クレーン）" },
      { lawShort: "クレーン則", articleNum: "第70条の5", role: "アウトリガー等の張り出し" },
      { lawShort: "クレーン則", articleNum: "第73条", role: "搭乗の制限（移動式クレーン）" },
      { lawShort: "クレーン則", articleNum: "第74条", role: "立入禁止（上部旋回体との接触防止）" },
      { lawShort: "クレーン則", articleNum: "第74条の3", role: "強風時の作業中止（移動式クレーン）" },
      { lawShort: "クレーン則", articleNum: "第76条", role: "定期自主検査（年次・移動式クレーン）" },
      { lawShort: "クレーン則", articleNum: "第77条", role: "定期自主検査（月次・移動式クレーン）" },
      { lawShort: "クレーン則", articleNum: "第78条", role: "作業開始前の点検（移動式クレーン）" },
    ],
    circularIds: [
      "mhlw-notice-0713", // クレーン構造規格（告示）
      "mhlw-notice-0714", // 移動式クレーン構造規格（告示）
      "mhlw-notice-0724", // 過負荷防止装置構造規格（告示）
      "mhlw-notice-0708", // クレーン等製造許可基準（告示）
      "mhlw-notice-0792", // クレーン取扱い業務等特別教育規程（告示）
      "mhlw-notice-0822", // 運転士免許試験規程（告示）
      "mhlw-notice-0852", // クレーン等運転関係技能講習規程（告示）
      "mhlw-notice-0760", // 移動式クレーンの定期自主検査指針
      "mhlw-notice-0762", // 天井クレーンの定期自主検査指針
      "mhlw-notice-0226", // クレーン則一部改正省令の施行（通達）
      "mhlw-notice-0983", // 点検強化の一部改正（通達・R6）
      "mhlw-notice-0876", // 移動式クレーン等技術指針の適用（通達）
      "mhlw-notice-0985", // 荷役作業の安全管理徹底（通達）
    ],
    beppyoIds: [],
    reviewNote:
      "2026-07-11 topic-scan『クレーン』『移動式クレーン』: 条文候補55・通達候補22から採録。玉掛け系条文（クレーン則213〜222条）は玉掛け分野へ分離、女性則2条・年少者則8条（就業制限の別軸）・建災防規程13条（e-Gov法令番号無し=条文ページ対象外）・廃止済み再発防止講習規程（mhlw-notice-0861）・個別改正告示（0300/0954/0958）・限定免許系告示通達（0469/0489/0566）・構造規格57条適用除外（0411）を人手で除外。",
  },
  {
    id: "tamagake",
    name: "玉掛け",
    fieldGroup: "クレーン等",
    description:
      "玉掛け作業の資格（1トン以上は技能講習・1トン未満は特別教育）・合図・ワイヤロープ等つり具の安全基準を、法律→政令→省令の体系順でまとめた分野ページ。",
    aliases: [
      "玉掛け",
      "玉掛",
      "玉かけ",
      "スリング",
      "ワイヤ",
      "ワイヤロープ",
      "シャックル",
      "フック",
      "つり具",
      "吊り具",
      "つり荷",
      "吊り荷",
      "安全係数",
    ],
    articles: [
      { lawShort: "安衛法", articleNum: "第59条", role: "安全衛生教育（特別教育の根拠）" },
      { lawShort: "安衛法", articleNum: "第61条", role: "就業制限（技能講習の根拠）" },
      { lawShort: "安衛令", articleNum: "第20条", role: "技能講習が必要な業務（第16号: つり上げ荷重1トン以上）" },
      { lawShort: "クレーン則", articleNum: "第25条", role: "運転の合図" },
      { lawShort: "クレーン則", articleNum: "第213条", role: "玉掛け用ワイヤロープの安全係数（6以上）" },
      { lawShort: "クレーン則", articleNum: "第214条", role: "玉掛け用フック・シャックルの安全係数（5以上）" },
      { lawShort: "クレーン則", articleNum: "第215条", role: "不適格なワイヤロープの使用禁止" },
      { lawShort: "クレーン則", articleNum: "第221条", role: "就業制限（1トン以上は玉掛け技能講習）" },
      { lawShort: "クレーン則", articleNum: "第222条", role: "特別の教育（1トン未満）" },
    ],
    circularIds: [
      "mhlw-notice-0840", // 玉掛け技能講習規程（告示）
      "mhlw-notice-0985", // 荷役作業の安全管理徹底（通達）
    ],
    beppyoIds: [],
    reviewNote:
      "2026-07-11 topic-scan『玉掛け』『玉掛』: 条文候補11・通達候補3から採録。クレーン本体条（29条・24条の2・70条の2）はクレーン分野へ、女性則2条（就業制限の別軸）と廃止済み再発防止講習規程（mhlw-notice-0863＝平成21年廃止）を人手で除外。",
  },
  {
    id: "ashiba",
    name: "足場",
    fieldGroup: "墜落・飛来崩壊防止",
    description:
      "足場の組立て等の資格（作業主任者・特別教育）・作業床と手すりの基準・最大積載荷重・点検を、法律→政令→省令の体系順でまとめた分野ページ。",
    aliases: [
      "足場",
      "枠組足場",
      "わく組足場",
      "単管",
      "単管足場",
      "くさび",
      "くさび緊結式",
      "ビケ足場",
      "つり足場",
      "移動式足場",
      "ローリングタワー",
      "手すり",
      "中さん",
      "幅木",
      "架設通路",
      "組立て",
      "解体",
    ],
    articles: [
      { lawShort: "安衛法", articleNum: "第59条", role: "安全衛生教育（特別教育の根拠）" },
      { lawShort: "安衛令", articleNum: "第6条", role: "作業主任者を選任すべき作業（第15号: つり足場・張出し足場・5m以上の足場）" },
      { lawShort: "安衛則", articleNum: "第36条", role: "特別教育が必要な業務（第39号: 足場の組立て等）" },
      { lawShort: "安衛則", articleNum: "第518条", role: "作業床の設置等（2m以上の高所作業）" },
      { lawShort: "安衛則", articleNum: "第552条", role: "架設通路" },
      { lawShort: "安衛則", articleNum: "第559条", role: "足場の材料等" },
      { lawShort: "安衛則", articleNum: "第562条", role: "最大積載荷重" },
      { lawShort: "安衛則", articleNum: "第563条", role: "足場における作業床（幅40cm・手すり・中さん）" },
      { lawShort: "安衛則", articleNum: "第564条", role: "足場の組立て等の作業" },
      { lawShort: "安衛則", articleNum: "第565条", role: "足場の組立て等作業主任者の選任" },
      { lawShort: "安衛則", articleNum: "第566条", role: "足場の組立て等作業主任者の職務" },
      { lawShort: "安衛則", articleNum: "第567条", role: "点検（作業開始前・悪天候後等）" },
      { lawShort: "安衛則", articleNum: "第574条", role: "つり足場の構造" },
    ],
    circularIds: [
      "mhlw-notice-0082", // 足場からの墜落・転落災害防止の充実に係る則改正の施行（通達）
      "mhlw-notice-0081", // 総合対策推進要綱の改正（通達・2023）
      "mhlw-notice-0972", // 組立て等作業の措置強化（通達・R6）
      "mhlw-notice-0875", // 組立て等作業における安全対策の一層の推進（通達）
      "mhlw-notice-0906", // 足場・開口部等からの墜落・転落災害防止の徹底（通達）
      "mhlw-notice-0835", // 足場の組立て等作業主任者技能講習規程（告示）
      "mhlw-notice-0737", // 鋼管足場用の部材及び附属金具の規格（告示）
      "mhlw-notice-0738", // つり足場用のつりチエーン及びつりわくの規格（告示）
      "mhlw-notice-0739", // 合板足場板の規格（告示）
      "mhlw-notice-0674", // 移動式足場の安全基準に関する技術上の指針
    ],
    beppyoIds: ["anei-rei-beppyo-8"],
    reviewNote:
      "2026-07-11 topic-scan『足場』: 条文候補13・通達候補11から採録。ゴンドラ則1条（別機械）・女性則2条（就業制限の別軸）・建災防規程11条（e-Gov法令番号無し）と旧版の総合対策推進要綱改正（mhlw-notice-0501＝2015年版。2023年版0081を採用）を人手で除外。開口部の囲い（安衛則519条）は墜落制止用器具分野に採録。",
  },
  {
    id: "fall-arrest",
    name: "フルハーネス",
    fieldGroup: "墜落・飛来崩壊防止",
    description:
      "フルハーネス型墜落制止用器具の使用義務・特別教育・取付設備（親綱・ライフライン）と高所作業の墜落防止措置を、法律→省令の体系順でまとめた分野ページ。旧称「安全帯」は2019年に墜落制止用器具へ改称。",
    aliases: [
      "フルハーネス",
      "ハーネス",
      "安全帯",
      "墜落制止用器具",
      "胴ベルト",
      "ランヤード",
      "ライフライン",
      "親綱",
      "高所作業",
      "墜落",
      "開口部",
      "ロープ高所作業",
    ],
    articles: [
      { lawShort: "安衛法", articleNum: "第59条", role: "安全衛生教育（特別教育の根拠）" },
      { lawShort: "安衛則", articleNum: "第36条", role: "特別教育が必要な業務（第41号: フルハーネス型を用いる作業）" },
      { lawShort: "安衛則", articleNum: "第518条", role: "作業床の設置等（2m以上・設置困難なら墜落制止用器具）" },
      { lawShort: "安衛則", articleNum: "第519条", role: "開口部等の囲い等" },
      { lawShort: "安衛則", articleNum: "第520条", role: "労働者の墜落制止用器具等の使用義務" },
      { lawShort: "安衛則", articleNum: "第521条", role: "要求性能墜落制止用器具等の取付設備等" },
      { lawShort: "安衛則", articleNum: "第539条の2", role: "ライフラインの設置（ロープ高所作業）" },
      { lawShort: "安衛則", articleNum: "第539条の7", role: "要求性能墜落制止用器具の使用（ロープ高所作業）" },
      { lawShort: "安衛則", articleNum: "第539条の9", role: "作業開始前点検（ロープ高所作業）" },
    ],
    circularIds: [
      "mhlw-notice-0742", // 墜落制止用器具の規格（告示）
      "mhlw-notice-0952", // 規格の一部改正・国際規格整合（告示）
      "mhlw-notice-0951", // 安全帯規格改正・フルハーネス型（告示）
      "mhlw-notice-0257", // 安全帯の規格の全部改正告示の施行（通達・2019改称）
      "mhlw-notice-0277", // 墜落制止用器具の安全な使用ガイドライン（通達）
      "mhlw-notice-1013", // フルハーネス型使用の技術上の指針（改訂）
      "mhlw-notice-0044", // 質疑応答集の改訂（通達・2023）
      "mhlw-notice-0970", // フルハーネス特別教育の実施と規格改正（通達）
      "mhlw-notice-0998", // 安全帯等の使用徹底・建設業集中対策（通達）
      "mhlw-notice-1036", // 特別教育の実施機関登録制度（通達）
    ],
    beppyoIds: [],
    reviewNote:
      "2026-07-11 topic-scan『墜落制止用器具』『安全帯』『フルハーネス』: 条文候補20・通達候補11から採録。足場固有条（564・563・566条）は足場分野へ、酸欠則6・7条は酸素欠乏分野へ、クレーン則33条はクレーン分野へ分離。ゴンドラ則17条・船員安衛則（別法域）・建災防規程11条（e-Gov法令番号無し）と旧版質疑応答集（mhlw-notice-0228＝2019年版。2023年版0044を採用）を人手で除外。",
  },
  {
    id: "sanketsu",
    name: "酸欠",
    fieldGroup: "有害環境",
    description:
      "マンホール・タンク・ピット等の酸素欠乏危険場所での測定・換気・作業主任者・特別教育・退避を、法律→政令→省令の体系順でまとめた分野ページ。酸素濃度18%未満が酸素欠乏。",
    aliases: [
      "酸欠",
      "酸素欠乏",
      "硫化水素",
      "マンホール",
      "ピット",
      "タンク",
      "槽",
      "井戸",
      "下水道",
      "換気",
      "酸素濃度",
      "濃度測定",
      "送気マスク",
      "空気呼吸器",
    ],
    articles: [
      { lawShort: "安衛法", articleNum: "第22条", role: "事業者の講ずべき措置（健康障害防止の根拠）" },
      { lawShort: "安衛令", articleNum: "第6条", role: "作業主任者を選任すべき作業（第21号: 酸素欠乏危険場所）" },
      { lawShort: "酸欠則", articleNum: "第2条", role: "定義（酸素欠乏＝18%未満・硫化水素10ppm超）" },
      { lawShort: "酸欠則", articleNum: "第3条", role: "作業環境測定（その日の作業開始前）" },
      { lawShort: "酸欠則", articleNum: "第5条", role: "換気（酸素濃度18%以上に保持）" },
      { lawShort: "酸欠則", articleNum: "第5条の2", role: "保護具の使用等（換気できないとき）" },
      { lawShort: "酸欠則", articleNum: "第6条", role: "要求性能墜落制止用器具等" },
      { lawShort: "酸欠則", articleNum: "第7条", role: "保護具等の点検" },
      { lawShort: "酸欠則", articleNum: "第8条", role: "人員の点検（入場時・退場時）" },
      { lawShort: "酸欠則", articleNum: "第9条", role: "立入禁止" },
      { lawShort: "酸欠則", articleNum: "第10条", role: "連絡（近接作業場との連絡）" },
      { lawShort: "酸欠則", articleNum: "第11条", role: "作業主任者（技能講習修了者から選任）" },
      { lawShort: "酸欠則", articleNum: "第12条", role: "特別の教育" },
      { lawShort: "酸欠則", articleNum: "第13条", role: "監視人等" },
      { lawShort: "酸欠則", articleNum: "第14条", role: "退避" },
      { lawShort: "酸欠則", articleNum: "第15条", role: "避難用具等" },
      { lawShort: "酸欠則", articleNum: "第17条", role: "診察及び処置" },
      { lawShort: "酸欠則", articleNum: "第29条", role: "事故等の報告" },
    ],
    circularIds: [
      "mhlw-notice-0796", // 酸素欠乏危険作業特別教育規程（告示）
      "mhlw-notice-0842", // 酸素欠乏・硫化水素危険作業主任者技能講習規程（告示）
      "mhlw-notice-1004", // 酸素欠乏・硫化水素中毒防止対策の強化（通達・下水道/マンホール/タンク）
    ],
    beppyoIds: ["anei-rei-beppyo-6"],
    reviewNote:
      "2026-07-11 topic-scan『酸素欠乏』『酸欠』: 条文候補20・通達候補4から採録。船員安衛則44・50条（別法域＝船内作業）と単年度の災害発生状況報告（mhlw-notice-0496＝平成26年統計・恒常的規範でない）を人手で除外。",
  },
  {
    id: "yuki-solvent",
    name: "有機溶剤",
    fieldGroup: "化学物質・有害業務",
    description:
      "塗装・洗浄・印刷等で使う有機溶剤（トルエン・キシレン等）の設備・作業主任者・作業環境測定・健康診断・保護具を、政令→省令の体系順でまとめた分野ページ。区分は安衛令別表第6の2＋有機則第1条。",
    aliases: [
      "有機溶剤",
      "シンナー",
      "トルエン",
      "キシレン",
      "アセトン",
      "塗装",
      "洗浄",
      "印刷",
      "有機則",
      "第二種有機溶剤",
      "局所排気",
      "防毒マスク",
      "有機ガス",
    ],
    articles: [
      { lawShort: "安衛令", articleNum: "第6条", role: "作業主任者を選任すべき作業（第22号: 屋内作業場等の有機溶剤業務）" },
      { lawShort: "有機則", articleNum: "第1条", role: "定義（第1種〜第3種の区分）" },
      { lawShort: "有機則", articleNum: "第2条", role: "適用の除外（許容消費量）" },
      { lawShort: "有機則", articleNum: "第5条", role: "第1種・第2種有機溶剤等の設備（密閉・局所排気）" },
      { lawShort: "有機則", articleNum: "第6条", role: "第3種有機溶剤等の設備（タンク等の内部）" },
      { lawShort: "有機則", articleNum: "第19条", role: "有機溶剤作業主任者の選任（技能講習修了者）" },
      { lawShort: "有機則", articleNum: "第19条の2", role: "有機溶剤作業主任者の職務" },
      { lawShort: "有機則", articleNum: "第20条", role: "局所排気装置の定期自主検査（1年以内ごと）" },
      { lawShort: "有機則", articleNum: "第24条", role: "掲示（人体への影響・取扱注意事項）" },
      { lawShort: "有機則", articleNum: "第25条", role: "有機溶剤等の区分の表示（色分け: 第1種=赤・第2種=黄・第3種=青）" },
      { lawShort: "有機則", articleNum: "第26条", role: "タンク内作業" },
      { lawShort: "有機則", articleNum: "第28条", role: "作業環境測定（6月以内ごと）" },
      { lawShort: "有機則", articleNum: "第28条の2", role: "測定結果の評価（管理区分）" },
      { lawShort: "有機則", articleNum: "第28条の3", role: "評価の結果に基づく措置（第3管理区分）" },
      { lawShort: "有機則", articleNum: "第29条", role: "健康診断（雇入れ時・6月以内ごと）" },
      { lawShort: "有機則", articleNum: "第30条", role: "健康診断の結果（個人票5年保存）" },
      { lawShort: "有機則", articleNum: "第30条の2", role: "健康診断の結果についての医師からの意見聴取" },
      { lawShort: "有機則", articleNum: "第30条の3", role: "健康診断結果報告" },
      { lawShort: "有機則", articleNum: "第33条", role: "呼吸用保護具（送気マスク・防毒マスク）" },
      { lawShort: "有機則", articleNum: "第35条", role: "有機溶剤等の貯蔵" },
      { lawShort: "有機則", articleNum: "第36条", role: "空容器の処理" },
    ],
    circularIds: [
      "mhlw-notice-0033", // 有機則等一部改正省令の施行（通達・R6）
      "mhlw-notice-0348", // 有機則第1条等の適用（通達）
      "mhlw-notice-0089", // 適用除外の認定制度の運用（通達）
      "mhlw-notice-0567", // 有機溶剤等の量に乗ずべき数値（告示）
      "mhlw-notice-0568", // 第15条の2ただし書の厚生労働大臣が定める濃度（告示）
      "mhlw-notice-0569", // 第16条の2の構造及び性能（告示）
      "mhlw-notice-0570", // 第18条第3項の要件（告示）
      "mhlw-notice-0572", // 第三管理区分の濃度測定方法等（告示）
      "mhlw-notice-1024", // 特殊健康診断の実施確保（通達・R6）
    ],
    beppyoIds: ["anei-rei-beppyo-6-2"],
    reviewNote:
      "2026-07-11 topic-scan『有機溶剤』: 条文候補28・通達候補14から採録。特化則2・25・27・28・42条（特定化学物質分野へ）・女性則2条（就業制限の別軸）と廃止済み掲示事項告示（mhlw-notice-0571＝令和5年告示113号により廃止）を人手で除外。健康診断の結果の通知（30条の2の2）は収録済みだが個別周知の実務条のため主要導線から割愛。",
  },
  {
    id: "tokka",
    name: "特定化学物質",
    fieldGroup: "化学物質・有害業務",
    description:
      "がん等の重度の健康障害を生ずるおそれのある特定化学物質（第1類〜第3類）の設備・作業主任者・測定・健康診断・保護具を、政令→省令の体系順でまとめた分野ページ。対象物質は安衛令別表第3。",
    aliases: [
      "特化物",
      "特定化学物質",
      "特化則",
      "溶接ヒューム",
      "クロム",
      "カドミウム",
      "ベンゼン",
      "塩化ビニル",
      "第一類物質",
      "第二類物質",
      "第三類物質",
      "特別管理物質",
      "発がん",
      "特化物質",
    ],
    articles: [
      { lawShort: "安衛令", articleNum: "第6条", role: "作業主任者を選任すべき作業（第18号: 特定化学物質の製造・取扱い）" },
      { lawShort: "特化則", articleNum: "第2条", role: "定義（第1類〜第3類の区分）" },
      { lawShort: "特化則", articleNum: "第3条", role: "第1類物質の取扱いに係る設備" },
      { lawShort: "特化則", articleNum: "第7条", role: "局所排気装置等の要件" },
      { lawShort: "特化則", articleNum: "第10条", role: "排ガス処理" },
      { lawShort: "特化則", articleNum: "第22条", role: "設備の改造等の作業" },
      { lawShort: "特化則", articleNum: "第25条", role: "容器等" },
      { lawShort: "特化則", articleNum: "第27条", role: "特定化学物質作業主任者の選任（技能講習修了者）" },
      { lawShort: "特化則", articleNum: "第28条", role: "特定化学物質作業主任者の職務" },
      { lawShort: "特化則", articleNum: "第36条", role: "測定及びその記録（6月以内ごと・3年保存）" },
      { lawShort: "特化則", articleNum: "第36条の2", role: "測定結果の評価（管理区分）" },
      { lawShort: "特化則", articleNum: "第38条の3", role: "掲示（特別管理物質）" },
      { lawShort: "特化則", articleNum: "第39条", role: "健康診断の実施（雇入れ時・6月以内ごと）" },
      { lawShort: "特化則", articleNum: "第40条", role: "健康診断の結果の記録（特別管理物質は30年保存）" },
      { lawShort: "特化則", articleNum: "第41条", role: "健康診断結果報告" },
      { lawShort: "特化則", articleNum: "第42条", role: "緊急診断" },
      { lawShort: "特化則", articleNum: "第43条", role: "呼吸用保護具" },
      { lawShort: "特化則", articleNum: "第44条", role: "保護衣等" },
      { lawShort: "特化則", articleNum: "第48条", role: "製造の許可（第1類物質）" },
    ],
    circularIds: [
      "mhlw-notice-0159", // 第2類物質「溶接ヒューム」の解釈等（通達）
      "mhlw-notice-0356", // 特化則一部改正省令の施行（通達）
      "mhlw-notice-0337", // 安衛令改正政令・特化則等改正省令の施行（通達）
      "mhlw-notice-0579", // 特化則の規定に基づく厚生労働大臣が定める性能（告示）
      "mhlw-notice-0909", // 特定化学物質等の適正管理・RA実施徹底（通達）
      "mhlw-notice-1024", // 特殊健康診断の実施確保（通達・R6）
    ],
    beppyoIds: ["anei-rei-beppyo-3"],
    reviewNote:
      "2026-07-11 topic-scan『特定化学物質』: 条文候補28・通達候補19から採録。化審法条文（工業化学品の上市規制＝作業環境法域と別）・四アルキル鉛則14条（別分野）を除外し、個別の性能告示改正適用通達（mhlw-notice-0335/0336/0376/0377/0378/0467＝増分改正の適用連絡）と旧称時代の個別要件告示（0577/0578）は代表の性能告示0579に集約して人手で除外。",
  },
  {
    id: "funjin",
    name: "粉じん",
    fieldGroup: "化学物質・有害業務",
    description:
      "粉じん作業の発生源対策・換気・呼吸用保護具・作業環境測定（粉じん則）と、じん肺健康診断・管理区分（じん肺法）を、法律→省令の体系順でまとめた分野ページ。",
    aliases: [
      "粉じん",
      "粉塵",
      "じん肺",
      "ずい道",
      "トンネル",
      "研磨",
      "グラインダー",
      "はつり",
      "防じんマスク",
      "特定粉じん",
      "除じん",
      "湿潤化",
    ],
    articles: [
      { lawShort: "安衛法", articleNum: "第22条", role: "事業者の講ずべき措置（健康障害防止の根拠）" },
      { lawShort: "じん肺法", articleNum: "第2条", role: "定義（じん肺・粉じん作業）" },
      { lawShort: "じん肺法", articleNum: "第3条", role: "じん肺健康診断" },
      { lawShort: "じん肺法", articleNum: "第7条", role: "就業時健康診断" },
      { lawShort: "じん肺法", articleNum: "第8条", role: "定期健康診断（管理区分に応じ1〜3年ごと）" },
      { lawShort: "じん肺法", articleNum: "第21条", role: "作業の転換" },
      { lawShort: "じん肺法", articleNum: "第23条", role: "管理4と決定された者の取扱い（療養）" },
      { lawShort: "じん肺則", articleNum: "第2条", role: "粉じん作業の範囲（別表）" },
      { lawShort: "じん肺則", articleNum: "第26条", role: "作業転換の勧奨" },
      { lawShort: "粉じん則", articleNum: "第1条", role: "事業者の責務" },
      { lawShort: "粉じん則", articleNum: "第2条", role: "定義（粉じん作業・特定粉じん作業）" },
      { lawShort: "粉じん則", articleNum: "第4条", role: "特定粉じん発生源に係る措置" },
      { lawShort: "粉じん則", articleNum: "第5条", role: "換気の実施等" },
      { lawShort: "粉じん則", articleNum: "第10条", role: "除じん装置の設置" },
      { lawShort: "粉じん則", articleNum: "第11条", role: "局所排気装置等の要件" },
      { lawShort: "粉じん則", articleNum: "第12条", role: "局所排気装置等の稼働" },
      { lawShort: "粉じん則", articleNum: "第16条", role: "湿潤な状態に保つための設備" },
      { lawShort: "粉じん則", articleNum: "第17条", role: "局所排気装置等の定期自主検査（1年以内ごと）" },
      { lawShort: "粉じん則", articleNum: "第18条", role: "定期自主検査の記録（3年保存）" },
      { lawShort: "粉じん則", articleNum: "第22条", role: "特別の教育" },
      { lawShort: "粉じん則", articleNum: "第23条", role: "休憩設備" },
      { lawShort: "粉じん則", articleNum: "第23条の2", role: "掲示" },
      { lawShort: "粉じん則", articleNum: "第24条", role: "清掃の実施（毎日1回以上）" },
      { lawShort: "粉じん則", articleNum: "第25条", role: "作業環境測定を行うべき屋内作業場" },
      { lawShort: "粉じん則", articleNum: "第26条", role: "粉じん濃度の測定等（6月以内ごと）" },
      { lawShort: "粉じん則", articleNum: "第26条の2", role: "測定結果の評価（管理区分）" },
      { lawShort: "粉じん則", articleNum: "第26条の3", role: "評価の結果に基づく措置" },
      { lawShort: "粉じん則", articleNum: "第27条", role: "呼吸用保護具の使用" },
    ],
    circularIds: [
      "mhlw-notice-0077", // 第10次粉じん障害防止総合対策の推進（通達）
      "mhlw-notice-0801", // 粉じん作業特別教育規程（告示）
      "mhlw-notice-0592", // 坑内作業場の粉じん濃度測定・評価方法（告示）
      "mhlw-notice-0185", // 粉じん則・安衛則一部改正省令等の施行（通達）
      "mhlw-notice-1005", // 総合対策の推進と呼吸用保護具選択（通達）
      "mhlw-notice-1006", // 坑内作業の粉じん対策強化（通達）
      "mhlw-notice-1007", // ずい道等建設工事の粉じん対策強化（通達・R6）
    ],
    beppyoIds: [],
    reviewNote:
      "2026-07-11 topic-scan『粉じん』: 条文候補55・通達候補23から採録。石綿則条文は石綿分野へ、特化則・鉛則・事務所則条文（別分野・別環境基準）・派遣法46条（適用特例の行政条）を分離。発破後の判断基準（mhlw-notice-0151）・ずい道ガイドライン解釈（0152/0182/0330）・有機粉じん個別通達（0242/0339）・同旨の改正施行通達（0342/0484）・資格者告示（0587〜0591）は代表通達に集約して人手で除外。粉じん則19条（点検）・21条（補修等）は運用細目のため主要導線から割愛。",
  },
  {
    id: "asbestos",
    name: "石綿",
    fieldGroup: "化学物質・有害業務",
    description:
      "建築物等の解体・改修時の石綿事前調査（義務・報告）・作業計画・届出・除去作業の措置・特別教育・健康診断を、政令→省令の体系順でまとめた分野ページ。",
    aliases: [
      "石綿",
      "アスベスト",
      "事前調査",
      "解体",
      "改修",
      "吹き付け",
      "スレート",
      "保温材",
      "含有建材",
      "レベル3",
      "除去",
      "中皮腫",
    ],
    articles: [
      { lawShort: "安衛令", articleNum: "第6条", role: "作業主任者を選任すべき作業（第23号: 石綿等の取扱い）" },
      { lawShort: "石綿則", articleNum: "第1条", role: "事業者の責務" },
      { lawShort: "石綿則", articleNum: "第2条", role: "定義" },
      { lawShort: "石綿則", articleNum: "第3条", role: "事前調査及び分析調査（解体・改修前の義務）" },
      { lawShort: "石綿則", articleNum: "第4条", role: "作業計画" },
      { lawShort: "石綿則", articleNum: "第5条", role: "作業の届出" },
      { lawShort: "石綿則", articleNum: "第6条", role: "吹き付けられた石綿等の除去等に係る措置" },
      { lawShort: "石綿則", articleNum: "第12条", role: "作業に係る設備等" },
      { lawShort: "石綿則", articleNum: "第13条", role: "石綿等の切断等の作業等に係る措置（湿潤化）" },
      { lawShort: "石綿則", articleNum: "第15条", role: "立入禁止措置" },
      { lawShort: "石綿則", articleNum: "第19条", role: "石綿作業主任者の選任（技能講習修了者）" },
      { lawShort: "石綿則", articleNum: "第20条", role: "石綿作業主任者の職務" },
      { lawShort: "石綿則", articleNum: "第27条", role: "特別の教育（解体等業務）" },
      { lawShort: "石綿則", articleNum: "第35条", role: "作業の記録（40年保存）" },
      { lawShort: "石綿則", articleNum: "第36条", role: "測定及びその記録" },
      { lawShort: "石綿則", articleNum: "第40条", role: "健康診断の実施（6月以内ごと）" },
      { lawShort: "石綿則", articleNum: "第41条", role: "健康診断の結果の記録（40年保存）" },
      { lawShort: "石綿則", articleNum: "第44条", role: "呼吸用保護具" },
    ],
    circularIds: [
      "mhlw-notice-0168", // 石綿障害予防規則の解説（通達）
      "mhlw-notice-0176", // 石綿則等一部改正省令等の施行（通達・2020）
      "mhlw-notice-0177", // 石綿則等一部改正省令等の施行（通達・2020）
      "mhlw-notice-0283", // 事前調査における主な留意点（通達）
      "mhlw-notice-0999", // 事前調査結果報告制度の運用・電子届出（通達）
      "mhlw-notice-1000", // 石綿則一部改正・含有石綿分析（通達・R5）
      "mhlw-notice-1001", // 石綿則一部改正・レベル分類変更等（通達・R6）
      "mhlw-notice-0907", // 解体・改修工事のばく露防止徹底（通達）
      "mhlw-notice-0802", // 石綿使用建築物等解体等業務特別教育規程（告示）
      "mhlw-notice-0857", // 石綿作業主任者技能講習規程（告示）
      "mhlw-notice-0858", // 建築物石綿含有建材調査者講習等登録規程（告示）
      "mhlw-notice-1005", // 石綿関連疾患防止の呼吸用保護具選択（通達）
    ],
    beppyoIds: [],
    reviewNote:
      "2026-07-11 topic-scan『石綿』: 条文候補21・通達候補43から採録。特化則36・39条（石綿は石綿則へ移管済＝旧参照）・建災防規程15条（e-Gov法令番号無し）を除外。廃止済み仕上塗材通達（mhlw-notice-0307＝令和2年基発1028第1号により廃止）・個別事案/実態調査系（0083/0311/0316/0359/0375）・労災認定基準系（0085/0886＝補償の別軸）・個別要件告示（0593〜0600）は人手で除外。",
  },
  {
    id: "heatstroke",
    name: "熱中症",
    fieldGroup: "温熱環境",
    description:
      "職場の熱中症予防（WBGT値の把握・休憩設備・水分塩分補給）と2025年6月施行の熱中症措置義務化（安衛則612条の2）をまとめた分野ページ。",
    aliases: [
      "熱中症",
      "WBGT",
      "暑さ指数",
      "暑熱",
      "猛暑",
      "夏場",
      "水分",
      "塩分",
      "休憩",
      "クールワーク",
      "熱射病",
      "スポットクーラー",
    ],
    articles: [
      { lawShort: "安衛則", articleNum: "第612条の2", role: "熱中症を生ずるおそれのある作業場所における措置等（R7.6義務化）" },
      { lawShort: "安衛則", articleNum: "第606条", role: "温湿度調節" },
      { lawShort: "安衛則", articleNum: "第613条", role: "休憩設備" },
      { lawShort: "安衛則", articleNum: "第614条", role: "有害作業場の休憩設備（暑熱作業場は作業場外に）" },
      { lawShort: "安衛則", articleNum: "第585条", role: "立入禁止等（多量の高熱物体を取り扱う場所等）" },
      { lawShort: "安衛則", articleNum: "第45条", role: "特定業務従事者の健康診断（暑熱業務）" },
    ],
    circularIds: [
      "mhlw-notice-0919", // 職場における熱中症予防基本方針・R7改訂版（通達）
      "mhlw-notice-0001", // 熱中症防止対策ガイドラインの策定（通達・2026）
      "mhlw-notice-0136", // 熱中症予防基本対策要綱の策定（通達）
      "mhlw-notice-0130", // 基本対策要綱の一部改正（通達）
      "mhlw-notice-0926", // 令和8年度の熱中症対策の推進（通達）
      "mhlw-notice-0352", // STOP!熱中症クールワークキャンペーン（通達）
    ],
    beppyoIds: [],
    reviewNote:
      "2026-07-11 topic-scan『熱中症』『暑熱』『WBGT』: 条文候補10・通達候補18から採録。熱中症対策通達コーパス（lawShort=熱中症通達）は e-Gov 法令番号を持たず条文ページ対象外のため articles から除外（通達側の導線で担保）。単年度の注意喚起・キャンペーン実施通達（mhlw-notice-0101/0281/0323/0434/0490/0504/0872/0894/0900/0914＝年度もの）は最新の年度推進通達0926に集約して人手で除外。安衛則593条は呼吸用保護具の条（暑熱は文中言及のみ）のため不採録。",
  },
  {
    id: "denki",
    name: "感電",
    fieldGroup: "電気",
    description:
      "感電防止（漏電遮断装置・絶縁用保護具・使用前点検）と低圧電気取扱・アーク溶接の特別教育を、法律→省令の体系順でまとめた分野ページ。",
    aliases: [
      "感電",
      "電気",
      "漏電",
      "電撃",
      "アーク溶接",
      "低圧",
      "高圧",
      "活線",
      "停電",
      "検電",
      "絶縁",
      "ブレーカー",
      "漏電遮断器",
    ],
    articles: [
      { lawShort: "安衛法", articleNum: "第59条", role: "安全衛生教育（特別教育の根拠）" },
      { lawShort: "安衛則", articleNum: "第36条", role: "特別教育が必要な業務（第3号: アーク溶接・第4号: 低圧電気等）" },
      { lawShort: "安衛則", articleNum: "第332条", role: "交流アーク溶接機用自動電撃防止装置" },
      { lawShort: "安衛則", articleNum: "第333条", role: "漏電による感電防止（漏電遮断装置）" },
      { lawShort: "安衛則", articleNum: "第352条", role: "電気機械器具等の使用前点検等" },
    ],
    circularIds: [
      "mhlw-notice-0677", // 感電防止用漏電しゃ断装置の接続・使用の技術上の指針
      "mhlw-notice-0732", // 絶縁用保護具等の規格（告示）
      "mhlw-notice-0733", // 絶縁用防護具の規格（告示）
      "mhlw-notice-0982", // 電気工事における感電災害防止対策の徹底（通達）
      "mhlw-notice-1036", // 特別教育の実施機関登録制度・交流アーク溶接機等（通達）
    ],
    beppyoIds: [],
    reviewNote:
      "2026-07-11 topic-scan『感電』『絶縁』『電気機械器具』『停電』: 条文候補4・通達候補10から採録。ボイラー則34条（別分野＝ボイラー内部作業の一項目）と防爆構造規格系（mhlw-notice-0723/0129/0208/0289/0363/0480＝爆発防止の別分野）を人手で除外。",
  },
  {
    id: "kensetsu-kikai",
    name: "車両系建設機械",
    fieldGroup: "建設機械等",
    description:
      "ユンボ（バックホウ・油圧ショベル）・ブルドーザー等の車両系建設機械の資格・作業計画・接触防止・用途外使用の禁止・点検を、法律→政令→省令の体系順でまとめた分野ページ。",
    aliases: [
      "ユンボ",
      "バックホウ",
      "バックホー",
      "ショベル",
      "パワーショベル",
      "油圧ショベル",
      "ドラグショベル",
      "ブルドーザー",
      "建機",
      "重機",
      "掘削",
      "整地",
      "解体用機械",
      "ローラー",
      "締固め",
    ],
    articles: [
      { lawShort: "安衛法", articleNum: "第45条", role: "定期自主検査の根拠（特定自主検査）" },
      { lawShort: "安衛法", articleNum: "第61条", role: "就業制限（技能講習の根拠）" },
      { lawShort: "安衛令", articleNum: "第20条", role: "技能講習が必要な業務（第12号: 機体重量3トン以上）" },
      { lawShort: "安衛則", articleNum: "第36条", role: "特別教育が必要な業務（第9号: 機体重量3トン未満）" },
      { lawShort: "安衛則", articleNum: "第153条", role: "ヘッドガード" },
      { lawShort: "安衛則", articleNum: "第155条", role: "作業計画" },
      { lawShort: "安衛則", articleNum: "第156条", role: "制限速度" },
      { lawShort: "安衛則", articleNum: "第157条", role: "転落等の防止（路肩・傾斜地の誘導者）" },
      { lawShort: "安衛則", articleNum: "第158条", role: "接触の防止（立入禁止・誘導者）" },
      { lawShort: "安衛則", articleNum: "第159条", role: "合図" },
      { lawShort: "安衛則", articleNum: "第164条", role: "主たる用途以外の使用の制限（バケットでの人の昇降禁止）" },
      { lawShort: "安衛則", articleNum: "第165条", role: "修理等（作業指揮者）" },
    ],
    circularIds: [
      "mhlw-notice-0735", // 車両系建設機械構造規格（告示）
      "mhlw-notice-0758", // 車両系建設機械特定自主検査基準（告示）
      "mhlw-notice-0767", // 定期自主検査指針（現行・自主検査指針公示第24号）
      "mhlw-notice-0838", // 運転技能講習規程・整地運搬積込み掘削（告示）
      "mhlw-notice-0845", // 運転技能講習規程・基礎工事用（告示）
      "mhlw-notice-0851", // 運転技能講習規程・解体用（告示）
      "mhlw-notice-0953", // 安全装置等の規格の一部改正（告示）
    ],
    beppyoIds: ["anei-rei-beppyo-7"],
    reviewNote:
      "2026-07-11 topic-scan『車両系建設機械』: 条文候補11・通達候補12から採録。建災防規程13条（e-Gov法令番号無し）・廃止/旧版の定期自主検査指針（mhlw-notice-0776/0777/0781）・廃止済み再発防止講習規程（0862＝平成21年廃止）・旧公表通達（0460＝現行指針0767と重複）を人手で除外。",
  },
  {
    id: "kosho-sagyosha",
    name: "高所作業車",
    fieldGroup: "建設機械等",
    description:
      "高所作業車（作業床10m以上は技能講習・10m未満は特別教育）の資格・墜落制止用器具の使用・点検検査を、法律→政令→省令の体系順でまとめた分野ページ。",
    aliases: [
      "高所作業車",
      "バケット車",
      "ブーム式",
      "垂直昇降式",
      "作業床",
      "リフト車",
      "橋梁点検車",
    ],
    articles: [
      { lawShort: "安衛法", articleNum: "第45条", role: "定期自主検査の根拠（特定自主検査）" },
      { lawShort: "安衛法", articleNum: "第61条", role: "就業制限（技能講習の根拠）" },
      { lawShort: "安衛令", articleNum: "第20条", role: "技能講習が必要な業務（第15号: 作業床の高さ10m以上）" },
      { lawShort: "安衛則", articleNum: "第36条", role: "特別教育が必要な業務（第10号の5: 作業床の高さ10m未満）" },
      { lawShort: "安衛則", articleNum: "第194条の22", role: "要求性能墜落制止用器具等の使用" },
    ],
    circularIds: [
      "mhlw-notice-0746", // 高所作業車構造規格（告示）
      "mhlw-notice-0759", // 高所作業車特定自主検査基準（告示）
      "mhlw-notice-0766", // 定期自主検査指針（現行・自主検査指針公示第25号）
      "mhlw-notice-0854", // 高所作業車運転技能講習規程（告示）
      "mhlw-notice-0004", // 特定自主検査基準等の制定等（通達）
      "mhlw-notice-0956", // 構造規格の一部改正（告示・R6）
      "mhlw-notice-0959", // 特定自主検査の対象機械規格の一部改正（告示）
      "mhlw-notice-0960", // 構造規格の一部改正（告示・R8）
    ],
    beppyoIds: [],
    reviewNote:
      "2026-07-11 topic-scan『高所作業車』: 条文候補3・通達候補9から採録。廃止済み定期自主検査指針（mhlw-notice-0782＝令和5年公示25号により廃止。現行0766を採用）を人手で除外。安衛則36条（第10号の5）・安衛法61条を体系根拠として追加採録（scan は keywords 未付与で拾えないが e-Gov 現行の号定めと一致）。",
  },
];

/** id → トピック。 */
export function findLawNaviTopic(id: string): LawNaviTopic | undefined {
  return LAW_NAVI_TOPICS.find((t) => t.id === id);
}

/** 指定条文（lawShort+articleNum）を含むトピック一覧（条文ページの「この条文が属する分野」用）。 */
export function topicsForArticle(lawShort: string, articleNum: string): LawNaviTopic[] {
  return LAW_NAVI_TOPICS.filter((t) =>
    t.articles.some((a) => a.lawShort === lawShort && a.articleNum === articleNum)
  );
}

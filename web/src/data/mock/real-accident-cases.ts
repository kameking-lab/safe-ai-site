/**
 * 厚生労働省「職場のあんぜんサイト」労働災害事例に基づく実データ
 *
 * 出典: https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_FND.aspx
 * 各事例のURLは source フィールドに記載。
 * モックではなく、公開情報に基づく実データです。
 */
import type { AccidentCase } from "@/lib/types/domain";

export const realAccidentCases: AccidentCase[] = [
  {
    id: "mhlw-100003",
    title: "ビル建設の高所作業中に約2.3m下のコンクリート上に転落",
    occurredOn: "2007-03-15",
    type: "墜落",
    workCategory: "建設",
    severity: "重傷",
    summary:
      "ビル建設現場で屋根コンクリート工事中、高さ約3.7〜5.0mの屋根上で鉄筋配置作業をしていた作業者が、高さ約8mの仮設足場から約2.3m下のコンクリート上に転落。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100003",
    mainCauses: [
      "2.3mの高さでの墜落防止措置が不十分",
      "ヘルメットが適切に着用されていなかった",
      "安全ネットの設置が不完全",
    ],
    preventionPoints: [
      "5m以上の高所作業時には墜落防止システムを設置する",
      "安全装備の適切な使用と確認手順を確立する",
      "屋根作業中の包括的な安全プロトコルと監督体制を構築する",
    ],
  },
  {
    id: "mhlw-100005",
    title: "鉄塔メンテナンス中に高さ25mで高電圧感電",
    occurredOn: "2007-04-20",
    type: "感電",
    workCategory: "電気",
    severity: "重傷",
    summary:
      "鉄塔メンテナンス中、高さ25mでキックロックロープを使って鋼製部材を固定しようとした際に電流に打たれた。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100005",
    mainCauses: [
      "不適切な固定技術の使用",
      "保護装備の設置不足",
      "この作業に対する適切な手順が確立されていなかった",
    ],
    preventionPoints: [
      "墜落制止用器具と感電防護を併用する",
      "安全基準に沿った装備配置を確保する",
      "書面による作業手順を策定し、全員に周知する",
    ],
  },
  {
    id: "mhlw-100010",
    title: "鉛二次電池製造で鉛粉暴露による鉛中毒",
    occurredOn: "2007-05-10",
    type: "中毒",
    workCategory: "製造",
    severity: "中等傷",
    summary:
      "鉛バインダー鋳造や鉛の板打ち作業で複数の労働者が鉛粉への暴露を受けた。設備からの鉛粉飛散が原因。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100010",
    mainCauses: [
      "設備からの鉛粉の飛散",
      "不十分な危険予知訓練(KYT)の実施",
      "適切な保護具の使用欠如",
    ],
    preventionPoints: [
      "作業計画・管理の改善と局所排気装置の設置",
      "JIS認定の適切な防護具の使用",
      "定期的な安全点検と作業環境測定の実施",
    ],
  },
  {
    id: "mhlw-100015",
    title: "鉄骨鉄筋コンクリート造新築工事で高さ9.1mから墜落死亡",
    occurredOn: "2007-06-15",
    type: "墜落",
    workCategory: "建設",
    severity: "死亡",
    summary:
      "複数の労働者が高さ9.1m以上の場所で作業中、安全帯が未装着の状態で墜落死亡事故が発生。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100015",
    mainCauses: [
      "安全帯装備の設置がなかった",
      "足場間の連結作業が不十分",
      "適切な個人保護具が配置されていなかった",
    ],
    preventionPoints: [
      "高所作業時には必ず安全帯（フルハーネス）を装着する",
      "安全柵・手すりを設置する",
      "作業員間の連携体制を確立し安全確認手順を周知する",
    ],
  },
  {
    id: "mhlw-100020",
    title: "2階の鋼製階段の溶接作業中に墜落し重傷",
    occurredOn: "2007-07-10",
    type: "墜落",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "2階の鋼製階段の溶接作業中に労働者が墜落。安全帯が設置されていない状況で、新規採用者に対する指導も不十分だった。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100020",
    mainCauses: [
      "安全帯が設置されていない状況",
      "落下防止措置が未実施",
      "新規採用者に対する安全教育が不十分",
    ],
    preventionPoints: [
      "2m以上の高所作業時には安全帯の使用を義務付ける",
      "足場の確保と墜落防止措置の徹底",
      "新規入場者教育の実施を徹底する",
    ],
  },
  {
    id: "mhlw-100025",
    title: "屋根工事中にネットと足場材が約6m落下し被災",
    occurredOn: "2007-08-05",
    type: "飛来落下",
    workCategory: "建設",
    severity: "重傷",
    summary:
      "屋根工事中にグリーンネットを設置していた作業者が、ネットと約6mの足場材が落下しアスファルト舗装上に着地した際に被災。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100025",
    mainCauses: [
      "テント構造の健全性確認が不十分",
      "監督者が組立状態の適切な確認を怠った",
      "作業中の安全対策が不十分",
    ],
    preventionPoints: [
      "作業開始前に安全装備の設置と動作状態を必ず確認する",
      "監督者主導の安全指示手順を実施する",
      "落下物防止ネットの適切な設置を確保する",
    ],
  },
  {
    id: "mhlw-100030",
    title: "食品製造ローラーコンベアで右手指を挟まれ粉砕",
    occurredOn: "2007-09-12",
    type: "挟まれ",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "食品加工作業中に右手がローラーコンベアの機械に巻き込まれた。機械の停止手段の位置が不適切で、緊急停止装置も未設置だった。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100030",
    mainCauses: [
      "機械の停止手段の位置が不適切",
      "作業者への操作指示不足",
      "緊急停止装置の未設置",
    ],
    preventionPoints: [
      "非常停止装置を容易に操作できる位置に設置する",
      "作業手順の遵守を徹底する",
      "挟まれ・巻き込まれ防止のカバー・ガードを設置する",
    ],
  },
  {
    id: "mhlw-100035",
    title: "食品倉庫で25トン移動式保管ユニット倒壊により被災",
    occurredOn: "2007-10-08",
    type: "崩壊",
    workCategory: "倉庫",
    severity: "重傷",
    summary:
      "食品倉庫で25トンの移動式保管ユニットを搬送中、ベルト3箇所の張力が不均等だったためユニットが傾いて作業者が被災。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100035",
    mainCauses: [
      "アウトリガー設置手順の管理が不十分",
      "支持構造全体の重量配分が不均等",
      "転倒防止装置の検証・保守の欠如",
    ],
    preventionPoints: [
      "重量制限を超えない荷の積み方を確保する",
      "作業前にリスクアセスメントを実施する",
      "監督者の安全訓練を徹底する",
    ],
  },
  {
    id: "mhlw-100040",
    title: "ドラグショベルの吊荷がトラックに転落し作業者が下敷き死亡",
    occurredOn: "2007-11-15",
    type: "墜落",
    workCategory: "重機",
    severity: "死亡",
    summary:
      "ドラグショベル作業中に吊荷がトラックに転落し、そばにいた労働者がベルトスリングの絡み込みにより下敷きになり死亡。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100040",
    mainCauses: [
      "ドラグショベルを用途外使用して吊荷作業を実施",
      "適切な装置・指導の欠如",
      "作業員が危険区域に立ち入っていた",
    ],
    preventionPoints: [
      "用途外使用の禁止（クレーン機能付き機体を使用する）",
      "吊荷作業時に立入禁止区域を設定する",
      "玉掛け作業は有資格者が行う",
    ],
  },
  {
    id: "mhlw-100050",
    title: "屋根作業中に安全帯未設置で8m下に墜落死亡",
    occurredOn: "2008-01-20",
    type: "墜落",
    workCategory: "建設",
    severity: "死亡",
    summary:
      "屋根からの作業中に安全帯を正しく設置せず、落下防止措置が不十分な状態で8m下に墜落し死亡。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100050",
    mainCauses: [
      "落下防止の確実な設備がなかった",
      "現場管理者の指示監督が不適切",
      "適切な作業計画が策定されていなかった",
    ],
    preventionPoints: [
      "落下危険箇所には必ず墜落防止措置を設置する",
      "保護具の装着について明確な指示を全員に出す",
      "作業内容に応じた作業計画を作成し現場で厳守する",
    ],
  },
  {
    id: "mhlw-100055",
    title: "鋼管製足場が倒壊し作業者が転落して約2時間後に死亡",
    occurredOn: "2008-02-18",
    type: "墜落",
    workCategory: "足場",
    severity: "死亡",
    summary:
      "幅約1.6m長さ24.5mの木製プラットフォーム上で作業中に鋼管製足場が倒壊して転落。鋼管に衝突し約2時間後に死亡。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100055",
    mainCauses: [
      "支柱の設置が不十分",
      "墜落防止柵の隙間防止不備",
      "足場支持具の締結不十分",
    ],
    preventionPoints: [
      "足場の点検を十分な知識を有する者が実施する",
      "支柱・筋交いの設置を確実に行う",
      "手すり・中桟の設置を省略しない",
    ],
  },
  {
    id: "mhlw-100060",
    title: "ビスケット工場のカレー粉貯蔵庫で通路の突起物につまずき転倒",
    occurredOn: "2008-03-22",
    type: "転倒",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "カレー粉貯蔵庫内の狭い通路で、床に露出した突起物とシリコンシーラントの劣化により転倒し重傷。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100060",
    mainCauses: [
      "シリコンシーラント劣化による滑りやすい床面",
      "通路確保が不十分",
      "保守管理と危険表示の欠如",
    ],
    preventionPoints: [
      "通路の4S（整理・整頓・清掃・清潔）を徹底する",
      "定期的な床面の保守点検を実施する",
      "つまずき・滑り防止の安全標識を設置する",
    ],
  },
  {
    id: "mhlw-100080",
    title: "新築マンション工事で建設用エレベーターに挟まれ重傷",
    occurredOn: "2008-05-14",
    type: "挟まれ",
    workCategory: "建設",
    severity: "重傷",
    summary:
      "新築マンション工事で建設用エレベーター使用中、かごと階段踏面の間（約14cm）に挟まれ重傷。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100080",
    mainCauses: [
      "エレベーター周囲の安全範囲確認不足",
      "管理者による安全確認が不十分",
      "設置時の安全確認の欠如",
    ],
    preventionPoints: [
      "エレベーター周囲の安全距離を確保する",
      "施工計画に挟まれ防止措置を盛り込む",
      "作業員に対する安全教育を実施する",
    ],
  },
  {
    id: "mhlw-100090",
    title: "倉庫内のグレーチング床が破損し転落・火傷",
    occurredOn: "2008-06-20",
    type: "墜落",
    workCategory: "倉庫",
    severity: "重傷",
    summary:
      "倉庫内作業中にグレーチング床が破損して転落し火傷を負った。床面の強度不足と保守管理不備が原因。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100090",
    mainCauses: [
      "グレーチング使用箇所の設計不備",
      "管理体制の不備による作業指示の曖昧性",
      "保護具使用基準の不整備",
    ],
    preventionPoints: [
      "床面の定期点検と耐荷重確認を実施する",
      "施設・設備に関する安全情報の提供",
      "保護具管理と安全教育の強化",
    ],
  },
  {
    id: "mhlw-100100",
    title: "クレーン作業中にワイヤーロープ切断で鋼材落下・下敷き",
    occurredOn: "2008-07-25",
    type: "飛来落下",
    workCategory: "重機",
    severity: "重傷",
    summary:
      "クレーン作業中にワイヤーロープが経年劣化で切断し鋼材が落下。作業者が下敷きになり外傷。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100100",
    mainCauses: [
      "ワイヤーロープの経年劣化",
      "過度な負荷の使用",
      "作業前の安全確認不足",
    ],
    preventionPoints: [
      "ワイヤーロープの定期的な点検・交換を実施する",
      "荷重制限を厳守する",
      "定期的な保守管理と安全教育を徹底する",
    ],
  },
  {
    id: "mhlw-100150",
    title: "鋳物工場で溶湯容器のフランジが外れ溶湯流出・熱傷",
    occurredOn: "2008-11-10",
    type: "火災",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "溶湯運搬用クレーンで溶湯容器の底部フランジが外れ、溶湯が流出して作業者に飛散し重傷。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100150",
    mainCauses: [
      "クレーン下部フランジの固定ボルトの保守点検が不十分",
      "クレーンジブの構造上の問題で安全性が確保されていなかった",
    ],
    preventionPoints: [
      "保守管理の強化と定期的な点検の実施",
      "クレーン操作時の安全確保と監視体制の整備",
      "溶融金属取扱い作業の安全手順を策定する",
    ],
  },
  {
    id: "mhlw-100170",
    title: "コンクリートポンプ車の筒処理中に圧力で被災し死亡",
    occurredOn: "2009-01-15",
    type: "挟まれ",
    workCategory: "建設",
    severity: "死亡",
    summary:
      "コンクリートポンプ車でのポンプ筒処理中に圧力がかかり破損。機械の圧力で被災し死亡。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100170",
    mainCauses: [
      "不適切な機械使用方法",
      "作業計画の不十分性",
      "安全装置の不備と教育訓練の不足",
    ],
    preventionPoints: [
      "適切な方法で機械を使用し、メーカー指定の手順を遵守する",
      "作業開始前に圧力残留の有無を確認する",
      "必要に応じて保護装置を使用する",
    ],
  },
  {
    id: "mhlw-100200",
    title: "屋根工事で補助ロープ断裂によりドーマから転落",
    occurredOn: "2009-04-20",
    type: "墜落",
    workCategory: "建設",
    severity: "重傷",
    summary:
      "屋根工事2階のドーマ組立作業中にビニール製補助ロープが断裂し、外側の2階から転落して重傷。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100200",
    mainCauses: [
      "補助ロープの材質が不適切",
      "適切な作業計画・安全措置の欠如",
      "監督者による安全指導不足",
    ],
    preventionPoints: [
      "親綱支柱・親綱の設置と墜落制止用器具の使用",
      "作業前に安全設備の状態を確認する",
      "安全装備は規格品を使用し、定期的に交換する",
    ],
  },
  {
    id: "mhlw-100250",
    title: "農業トラクター操作中に貯蔵庫へ転落し死亡",
    occurredOn: "2009-08-10",
    type: "墜落",
    workCategory: "一般",
    severity: "死亡",
    summary:
      "農業の貯蔵庫でトラクター・シャベルを操作中に転落防止柵がなく貯蔵庫に転落して死亡。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100250",
    mainCauses: [
      "転落防止柵の欠落",
      "操作場所と転落場所の位置確認不足",
      "安全管理の不徹底",
    ],
    preventionPoints: [
      "開口部には転落防止柵を設置する",
      "貯蔵庫の定期的な保守管理を行う",
      "単独作業時の安全確認ルールを設ける",
    ],
  },
  {
    id: "mhlw-100300",
    title: "溶接タンク清掃中に苛性ソーダ漏出で熱傷",
    occurredOn: "2010-01-15",
    type: "中毒",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "溶接タンク内の苛性ソーダが清掃中に漏出し、作業者が液体に接触して熱傷。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100300",
    mainCauses: [
      "危険箇所の管理不十分",
      "作業環境の安全対策不足",
    ],
    preventionPoints: [
      "危険箇所の明確化と標識設置",
      "保護具（耐薬品手袋・ゴーグル等）の適切使用",
      "作業指揮者の配置と定期的な安全点検",
    ],
  },
  {
    id: "mhlw-100320",
    title: "電気機器製造でハロゲンガス爆発・火傷",
    occurredOn: "2010-03-20",
    type: "火災",
    workCategory: "電気",
    severity: "重傷",
    summary:
      "高温のカセットにコイルを挿入して通電した際、温度上昇によりハロゲンガスが発生し引火・爆発。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100320",
    mainCauses: [
      "温度管理システムの不備",
      "ガス排出用配管の設計不足",
      "電源遮断機構の欠如",
    ],
    preventionPoints: [
      "温度上限値設定の改善と自動遮断機構の導入",
      "ハロゲンガス対応の適切な保護装置の導入",
      "関係者への安全教育・訓練の実施",
    ],
  },
  {
    id: "mhlw-100370",
    title: "クレーン運搬中にコンクリート製品が滑り落ち挟まれ死亡",
    occurredOn: "2010-07-15",
    type: "挟まれ",
    workCategory: "重機",
    severity: "死亡",
    summary:
      "コンクリート製ボックスをクレーンで吊り上げ中に荷が滑り落ちて、下に位置していた作業者が押しつぶされ死亡。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100370",
    mainCauses: [
      "荷の不十分な固定方法",
      "不適切な玉掛け手順",
    ],
    preventionPoints: [
      "荷の固定プロトコルを強化する",
      "吊荷の下には立入禁止区域を設ける",
      "玉掛け作業は有資格者が実施する",
    ],
  },
  {
    id: "mhlw-100400",
    title: "昇降式クレーンの配線切断による漏電で感電",
    occurredOn: "2010-10-20",
    type: "感電",
    workCategory: "電気",
    severity: "重傷",
    summary:
      "昇降式クレーンの電気配線切断による漏電状態でクレーン操作を行い感電。湿度80%超の環境。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100400",
    mainCauses: [
      "電気配線の状態確認不備",
      "変圧器と集電装置の電流漏洩確認の不実施",
      "湿度が80%超にもかかわらず保護具の不使用",
    ],
    preventionPoints: [
      "設備使用前の配線点検と保守の徹底",
      "漏電遮断装置の設置",
      "高湿度環境での絶縁保護具の使用を義務付ける",
    ],
  },
  {
    id: "mhlw-100450",
    title: "サイロ内で高さ10mから地面に落下し死亡",
    occurredOn: "2011-01-18",
    type: "墜落",
    workCategory: "一般",
    severity: "死亡",
    summary:
      "農業用サイロ内で作業中、コンクリートタップが外れて10mの高さから地面に落下し死亡。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100450",
    mainCauses: [
      "サイロの吹出圧を事前確認しなかった",
      "落下物の危険性に対する認識不足",
      "墜落防止措置の未設置",
    ],
    preventionPoints: [
      "サイロ使用前に設備と安全装置を確認する",
      "高所作業では必ず墜落制止用器具を使用する",
      "救助用具の配備と緊急時の連絡体制を確保する",
    ],
  },
  {
    id: "mhlw-100500",
    title: "スプロケット交換作業中にセグメント間に挟まれ重傷",
    occurredOn: "2011-05-20",
    type: "挟まれ",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "スプロケット交換作業中にロックアウト手順が不十分でセグメント間に挟まれ重傷。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100500",
    mainCauses: [
      "不適切なロックアウト手順",
      "オペレーター間の連絡不足",
      "危険情報の伝達ギャップ",
    ],
    preventionPoints: [
      "ロックアウト・タグアウト手順を確実に実施する",
      "メンテナンス作業前に全関係者に周知する",
      "安全確認後に初めて機械を再起動する",
    ],
  },
  {
    id: "mhlw-100520",
    title: "鉄骨工事の仮設足場から約3m落下し死亡",
    occurredOn: "2011-07-15",
    type: "墜落",
    workCategory: "足場",
    severity: "死亡",
    summary:
      "鉄骨工事のショアリング作業中、仮設足場の勾配管理が不十分で約3m落下し死亡。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100520",
    mainCauses: [
      "仮設足場の勾配管理が不十分",
      "墜落防止システムの欠如",
      "設置手順の管理不適切",
    ],
    preventionPoints: [
      "足場作業前の適切な地盤準備と安全柵の設置",
      "危険な地盤条件が検出された場合は作業を停止する",
      "足場の組立て等作業主任者を選任する",
    ],
  },
  {
    id: "mhlw-100550",
    title: "パルプ製造工程で機械の扉が突然閉じ壁との間に挟まれ重傷",
    occurredOn: "2011-09-20",
    type: "挟まれ",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "パルプ製造工程で機械の扉が突然閉じ、壁との間に体を挟まれ重傷。扉制御装置の不具合が原因。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100550",
    mainCauses: [
      "扉制御装置の部分的な不具合",
      "定期的な保守点検の不足",
      "安全機構の劣化",
    ],
    preventionPoints: [
      "機械停止時に安全確認（ロックアウト）を実施する",
      "定期的な機械点検と安全装置の動作確認",
      "保守管理体制の強化",
    ],
  },
  {
    id: "mhlw-100570",
    title: "建設資材保管場所で積み荷崩壊により80歳作業者が埋没死亡",
    occurredOn: "2011-11-10",
    type: "崩壊",
    workCategory: "建設",
    severity: "死亡",
    summary:
      "80歳の作業者が保管場所で積み上げられた資材が崩壊して埋没し死亡。地盤条件が悪いにもかかわらず不安定な状態で積み上げられていた。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100570",
    mainCauses: [
      "地盤条件を考慮しない不安定な積み上げ",
      "作業者への指示が不明確",
      "固定方法（ネット等）が未実施",
    ],
    preventionPoints: [
      "荷崩れ防止措置（ロープ・ネット等）を実施する",
      "作業開始前に手順と危険箇所を明確に指示する",
      "高齢作業者には適切な作業配分を行う",
    ],
  },
  {
    id: "mhlw-100600",
    title: "アルミ旋盤加工作業中にモーター配置不良で感電",
    occurredOn: "2012-02-15",
    type: "感電",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "アルミスクラップの溶解・旋盤加工中にモーター配置不良で制御盤が充電状態となり感電。充電部の露出が継続していた。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100600",
    mainCauses: [
      "モーターの配置不良により制御盤が充電状態に",
      "充電部分の露出状態が継続",
      "作業者への感電防止教育が不十分",
    ],
    preventionPoints: [
      "配電設備の安全な配置と保守を徹底する",
      "充電部には絶縁カバーを設置する",
      "感電防止教育と漏電遮断装置の設置を行う",
    ],
  },
  {
    id: "mhlw-100620",
    title: "バッテリー室で排水作業中に防火対策不備で火災・死亡",
    occurredOn: "2012-04-20",
    type: "火災",
    workCategory: "製造",
    severity: "死亡",
    summary:
      "バッテリー室で排水作業中に適切な防火対策が未実施のまま火災が発生し作業者が死亡。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100620",
    mainCauses: [
      "排水作業中の適切な防火対策の未実施",
      "消防設備が適切に維持管理されていなかった",
      "可燃性物質付近での安全プロトコル不遵守",
    ],
    preventionPoints: [
      "排水作業前に監督者が防火安全対策を確認する",
      "消火設備の定期点検と維持管理を徹底する",
      "可燃性物質付近の作業手順を策定し遵守する",
    ],
  },
  {
    id: "mhlw-100670",
    title: "35度斜面でクレーン吊り上げ中の金属板落下で被災",
    occurredOn: "2012-08-15",
    type: "飛来落下",
    workCategory: "建設",
    severity: "重傷",
    summary:
      "35度の斜面で移動式クレーンが吊り上げていた金属板が不安定になり落下。斜面基部から約300mで資材搬送中に被災。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100670",
    mainCauses: [
      "不安定な斜面での不適切な装備配置",
      "クレーンオペレーターの不十分な検査",
      "落下防止措置の欠如",
    ],
    preventionPoints: [
      "水平で安定した地盤にクレーンを設置する",
      "落下防止の機械的拘束システムを使用する",
      "複数名で吊り上げ作業を行い合図者を配置する",
    ],
  },
  {
    id: "mhlw-100720",
    title: "ニトロセルロース製造施設でニトロ化容器が発火し顔面火傷",
    occurredOn: "2013-01-20",
    type: "火災",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "ニトログリセリン製造施設のニトロ化容器内で攪拌中に発火。炎が上方に広がり作業者が顔面と目の周りに火傷。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100720",
    mainCauses: [
      "エチレングリコールとアルコールの蓄積で可燃性条件が発生",
      "装備の不十分な電気接地",
      "ニトロ化材料残渣の不十分な除去",
    ],
    preventionPoints: [
      "全装備に確実な接地システムを実施する",
      "容器開放前に徹底的な検査を行う",
      "装備操作中の安全プロトコルを確立する",
    ],
  },
  {
    id: "mhlw-100750",
    title: "塩化ビニールモノマー輸送試験中にポンプ故障で有毒ガス吸入",
    occurredOn: "2013-04-15",
    type: "中毒",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "塩化ビニールモノマー輸送試験中にポンプの振動でビニール製ホースの接続部が外れ、有害ガスが放出・吸入。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100750",
    mainCauses: [
      "ポンプの振動によりホース接続部が外れた",
      "接続点の振動耐性が不十分",
      "安全プロトコルを伴う試験手順が未策定",
    ],
    preventionPoints: [
      "振動耐性のある接続方法（フランジ接続等）を使用する",
      "MSDSに基づく保護具の使用を徹底する",
      "有害物質の取り扱いと緊急時対応の訓練を実施する",
    ],
  },
  {
    id: "mhlw-100770",
    title: "金属めっき設備分解時にニッケルカルボニル中毒",
    occurredOn: "2013-06-20",
    type: "中毒",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "金属めっき設備の分解時にニッケルカルボニルが飛散して作業者が被曝。排気換気が不十分で有毒ガス濃度が安全レベルを大幅超過。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100770",
    mainCauses: [
      "施設の排気換気が不十分でニッケルカルボニル濃度が安全レベル超過",
      "適切な保守点検の未実施",
      "保護具の不使用",
    ],
    preventionPoints: [
      "換気設備を改善しニッケルカルボニル濃度を管理濃度以下に維持する",
      "適切な保護具（防毒マスク等）の使用を徹底する",
      "化学的危険と安全な取り扱い方法の教育訓練を実施する",
    ],
  },
  {
    id: "mhlw-101200",
    title: "プレス機械で安全ブロック迂回により挟まれ重傷",
    occurredOn: "2015-06-15",
    type: "挟まれ",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "プレス機械で安全ブロックを迂回して金属製品加工中に作業者が挟まれ重傷。安全装置の不適切な設定と認識欠如が原因。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=101200",
    mainCauses: [
      "安全装置の不適切な設定と認識欠如",
      "作業員が機械の安全機能を無視",
      "管理者による安全教育の不実施",
    ],
    preventionPoints: [
      "安全装置の迂回・無効化を禁止し定期的に確認する",
      "プレス機械は定期自主検査を確実に実施する",
      "作業員への安全教育と訓練を徹底する",
    ],
  },
  {
    id: "mhlw-101500",
    title: "金属加工液の短絡ワイヤーから感電し重傷",
    occurredOn: "2016-11-20",
    type: "感電",
    workCategory: "製造",
    severity: "重傷",
    summary:
      "金属加工液に浸った短絡ワイヤーから、絶縁不十分な電気ドリル使用時に感電。リスクアセスメント未実施。出典: anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=101500",
    mainCauses: [
      "不適切な場所での絶縁不十分な短絡ワイヤー",
      "危険防止に関する作業者への適切な指導文書の欠如",
      "電気装備に対するリスクアセスメントの不在",
    ],
    preventionPoints: [
      "絶縁不十分な環境での電気装備の使用を中止する",
      "リスクアセスメントを実施し結果に基づく対策を講じる",
      "漏電遮断装置の設置と接地を確実に行う",
    ],
  },
];

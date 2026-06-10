/**
 * 30-item fatal-accident prevention checklists per industry.
 *
 * Each list is curated from the typical patterns surfaced by the
 * /accidents-reports analysis (top causes, archetypes, MHLW deaths
 * categories) and is bucketed into 6 categories of 5 items each so a
 * printed A4 page can show the entire list as a checkable form.
 *
 * Source rationale is captured per item via `basis` — typically the
 * statute (安衛法・安衛則), the recurring fatal pattern, or an MHLW
 * guideline. We deliberately phrase items as concrete behaviours
 * (verbs first) rather than abstract goals.
 */
import type { IndustrySlug } from "@/lib/industry-slugs";

export type ChecklistCategory =
  | "high-risk-work" // 高リスク作業の事前管理
  | "equipment" // 設備・機械の安全装置
  | "training" // 教育・資格・指揮命令
  | "environment" // 作業環境・整理整頓
  | "individual" // 個人保護具・健康管理
  | "emergency"; // 緊急時対応・連絡体制

export type ChecklistItem = {
  /** 1..30 — stable ordinal used for print numbering */
  no: number;
  category: ChecklistCategory;
  /** Action phrased as a verb-first directive */
  text: string;
  /** Legal/guideline basis cited so the user can defend the item in an audit */
  basis: string;
};

export const CATEGORY_LABEL: Record<ChecklistCategory, string> = {
  "high-risk-work": "1. 高リスク作業の事前管理",
  equipment: "2. 設備・機械の安全装置",
  training: "3. 教育・資格・指揮命令",
  environment: "4. 作業環境・整理整頓",
  individual: "5. 保護具・健康管理",
  emergency: "6. 緊急時対応・連絡体制",
};

export const CATEGORY_ORDER: readonly ChecklistCategory[] = [
  "high-risk-work",
  "equipment",
  "training",
  "environment",
  "individual",
  "emergency",
] as const;

const CONSTRUCTION: ChecklistItem[] = [
  { no: 1, category: "high-risk-work", text: "高さ2m以上の作業は事前に作業計画書と作業手順書を作成し、当日点呼で読み合わせている", basis: "労働安全衛生規則 第518条（墜落・転落防止）" },
  { no: 2, category: "high-risk-work", text: "クレーン・移動式クレーン使用時は合図者と運転者を明確化し、立入禁止区域を表示している", basis: "クレーン等安全規則 第74条" },
  { no: 3, category: "high-risk-work", text: "土砂崩壊のおそれがある掘削は事前に地山の点検と土止め支保工計画を確認している", basis: "労働安全衛生規則 第361条〜第367条" },
  { no: 4, category: "high-risk-work", text: "電気工事・活線近接作業は停電確認と接地・短絡作業を実施している", basis: "労働安全衛生規則 第339条〜第354条" },
  { no: 5, category: "high-risk-work", text: "酸欠・有機溶剤・粉じんを伴う作業は事前測定と換気・送気マスクを準備している", basis: "酸欠則 / 有機則 / 粉じん則" },
  { no: 6, category: "equipment", text: "足場の組立・解体は作業主任者の指揮下で、毎日の始業前点検を記録している", basis: "労働安全衛生規則 第567条" },
  { no: 7, category: "equipment", text: "墜落制止用器具（フルハーネス型）を支給し、フックの掛け先・取付設備を毎現場確認している", basis: "労働安全衛生規則 第518条第2項 / 構造規格" },
  { no: 8, category: "equipment", text: "重機（バックホウ・ダンプ等）の作業半径内に作業員を立ち入らせていない", basis: "労働安全衛生規則 第158条" },
  { no: 9, category: "equipment", text: "高所作業車・脚立・ローリングタワーは点検記録簿に基づき毎月点検している", basis: "労働安全衛生規則 第194条の23" },
  { no: 10, category: "equipment", text: "電動工具は使用前にコード絶縁被覆と接地端子の状態を確認している", basis: "労働安全衛生規則 第333条" },
  { no: 11, category: "training", text: "新規入場者教育（KYT含む）を実施し、教育記録を3年間保管している", basis: "労働安全衛生法 第59条 / 安衛則 第36条" },
  { no: 12, category: "training", text: "作業主任者・職長教育の修了者を作業内容に応じて配置している", basis: "労働安全衛生法 第14条・第60条" },
  { no: 13, category: "training", text: "玉掛け・フォークリフト等の有資格者リストを現場に掲示している", basis: "労働安全衛生法 第61条" },
  { no: 14, category: "training", text: "外国人作業員には母国語の教材または翻訳資料を用いて安全教育を実施している", basis: "労働安全衛生法 第59条 / 厚労省「外国人労働者に対する労働安全衛生教育の進め方」" },
  { no: 15, category: "training", text: "毎朝のKY活動（危険予知活動）で当日の作業リスクを共有・記録している", basis: "厚労省「危険予知活動の進め方」" },
  { no: 16, category: "environment", text: "通路・足場上の資材は整理整頓し、躓きの原因を毎日撤去している", basis: "労働安全衛生規則 第544条" },
  { no: 17, category: "environment", text: "雨天・強風時の高所作業中止基準を就業規則または安全衛生計画書に明記している", basis: "労働安全衛生規則 第522条" },
  { no: 18, category: "environment", text: "騒音・粉じんが発生する作業区画は標識で明示し、立入を制限している", basis: "労働安全衛生規則 第585条" },
  { no: 19, category: "environment", text: "照明不足の作業箇所は仮設照明を設置し、必要照度を確保している", basis: "労働安全衛生規則 第604条" },
  { no: 20, category: "environment", text: "暑熱環境ではWBGT測定と作業強度別の作業時間管理を実施している", basis: "厚労省「職場における熱中症予防基本対策要綱」" },
  { no: 21, category: "individual", text: "ヘルメット・安全靴・墜落制止用器具を全作業員に支給し、着用状況を職長が点検している", basis: "労働安全衛生規則 第539条" },
  { no: 22, category: "individual", text: "粉じん・有機溶剤・石綿に対し用途に合った呼吸用保護具を支給・点検している", basis: "労働安全衛生規則 第593条〜第599条" },
  { no: 23, category: "individual", text: "雇入時・定期健康診断を実施し、有所見者には就業区分・保健指導を行っている", basis: "労働安全衛生法 第66条" },
  { no: 24, category: "individual", text: "高年齢作業員には体力低下を考慮した作業配分とエイジフレンドリーな職場改善を行っている", basis: "厚労省「エイジフレンドリーガイドライン」" },
  { no: 25, category: "individual", text: "メンタルヘルス対応として、月1回以上の声がけ・ストレスチェックを実施している", basis: "労働安全衛生法 第66条の10" },
  { no: 26, category: "emergency", text: "緊急連絡網（救急車・最寄り病院・元請）を現場詰所に掲示している", basis: "労働安全衛生規則 第29条" },
  { no: 27, category: "emergency", text: "AEDの設置場所と使用可能な作業員を周知し、年1回の救急訓練を実施している", basis: "厚労省「職場におけるAEDの設置促進」" },
  { no: 28, category: "emergency", text: "労働災害が発生した場合の労基署報告（労働者死傷病報告）の責任者を明確化している", basis: "労働安全衛生規則 第97条" },
  { no: 29, category: "emergency", text: "ヒヤリハット・微傷災害を月次でレビューし再発防止に反映している", basis: "厚労省「ヒヤリ・ハット活動の進め方」" },
  { no: 30, category: "emergency", text: "請負・下請会社を含めた合同安全衛生協議会を月1回以上開催している", basis: "労働安全衛生法 第30条（特定元方事業者の措置）" },
];

const MANUFACTURING: ChecklistItem[] = [
  { no: 1, category: "high-risk-work", text: "プレス・ロボット等の本質安全設計を満たすリスクアセスメントを年1回以上実施している", basis: "労働安全衛生法 第28条の2 / 機械の包括的な安全基準に関する指針" },
  { no: 2, category: "high-risk-work", text: "金型・刃物交換等の段取替作業は停止確認とインターロック解除手順を文書化している", basis: "労働安全衛生規則 第107条" },
  { no: 3, category: "high-risk-work", text: "化学物質を取扱う作業はSDSを基にリスクアセスメントを実施・記録している", basis: "労働安全衛生規則 第34条の2の7" },
  { no: 4, category: "high-risk-work", text: "高温・低温物の取扱作業は防護具・遮へい板の整備と作業手順を確立している", basis: "労働安全衛生規則 第341条" },
  { no: 5, category: "high-risk-work", text: "粉じん発生工程は局所排気装置と作業環境測定を実施している", basis: "粉じん障害防止規則 第26条" },
  { no: 6, category: "equipment", text: "プレス機・シャー機にはガード・光線式安全装置を設置し、安全プラグの定期点検を行っている", basis: "労働安全衛生規則 第131条" },
  { no: 7, category: "equipment", text: "コンベア・ロール機の囲い・覆い・非常停止スイッチが機能することを毎日確認している", basis: "労働安全衛生規則 第151条の78（非常停止装置）" },
  { no: 8, category: "equipment", text: "フォークリフト・無人搬送車（AGV）の通路は人作業エリアと色別ラインで区分している", basis: "労働安全衛生規則 第151条の7（接触の防止）" },
  { no: 9, category: "equipment", text: "クレーン・ホイストの吊り具・ワイヤロープを月次点検・年次自主検査している", basis: "クレーン等安全規則 第34条" },
  { no: 10, category: "equipment", text: "局所排気装置（フード・ダクト・排風機）を定期自主検査している", basis: "有機溶剤中毒予防規則 第20条" },
  { no: 11, category: "training", text: "特定機械（プレス・ボイラー等）の特別教育・技能講習修了者を配置している", basis: "労働安全衛生法 第59条第3項" },
  { no: 12, category: "training", text: "化学物質管理者を選任し、SDS交付・取扱手順の見直しを実施している", basis: "労働安全衛生規則 第12条の5（2024年改正）" },
  { no: 13, category: "training", text: "新規配属者には機械操作の実技OJTを実施し、合格後に単独作業を許可している", basis: "労働安全衛生規則 第35条" },
  { no: 14, category: "training", text: "ライン責任者は朝礼・終礼で異常・ヒヤリハットを共有している", basis: "厚労省「ヒヤリ・ハット活動の進め方」" },
  { no: 15, category: "training", text: "毎朝のKY活動で当日の段取替・異常処置のリスクを共有している", basis: "厚労省「危険予知活動の進め方」" },
  { no: 16, category: "environment", text: "工場通路は5S（整理・整頓・清掃・清潔・しつけ）の状態を週次でチェックしている", basis: "労働安全衛生規則 第544条" },
  { no: 17, category: "environment", text: "切粉・油膜・水濡れによる転倒防止のため、清掃手順と当番制を運用している", basis: "労働安全衛生規則 第544条第2項" },
  { no: 18, category: "environment", text: "化学物質保管庫は施錠管理・転倒防止・換気設備を整備している", basis: "労働安全衛生規則 第325条 / 危険物の規制に関する政令" },
  { no: 19, category: "environment", text: "騒音80dB超の作業場は標識掲示と聴覚保護具着用を義務付けている", basis: "労働安全衛生規則 第595条 / 騒音障害防止ガイドライン" },
  { no: 20, category: "environment", text: "夏季の屋内作業はスポットクーラー・送風機等で熱中症予防を実施している", basis: "厚労省「職場における熱中症予防基本対策要綱」" },
  { no: 21, category: "individual", text: "保護メガネ・耐切創手袋・耐熱手袋等を作業に応じて支給し、着用率を点検している", basis: "労働安全衛生規則 第593条" },
  { no: 22, category: "individual", text: "有機溶剤・石綿・特定化学物質に対し用途別の呼吸用保護具を支給している", basis: "労働安全衛生規則 第593条" },
  { no: 23, category: "individual", text: "雇入時・定期健康診断と特殊健康診断（有機溶剤・特定化学物質）を実施している", basis: "労働安全衛生規則 第43条〜第45条" },
  { no: 24, category: "individual", text: "高齢作業者の体力に応じた作業配置・作業時間調整を行っている", basis: "厚労省「エイジフレンドリーガイドライン」" },
  { no: 25, category: "individual", text: "ストレスチェックを年1回実施し、高ストレス者に医師面接を提案している", basis: "労働安全衛生法 第66条の10" },
  { no: 26, category: "emergency", text: "緊急停止ボタン・避難経路・消火器の位置を作業者全員が把握している", basis: "労働安全衛生規則 第548条 / 消防法" },
  { no: 27, category: "emergency", text: "化学物質漏えい・火災・爆発の想定訓練を年1回以上実施している", basis: "労働安全衛生規則 第27条" },
  { no: 28, category: "emergency", text: "労働災害発生時の救護・通報・労基署報告の役割分担を文書化している", basis: "労働安全衛生規則 第97条" },
  { no: 29, category: "emergency", text: "ヒヤリハット報告制度を運用し、月次で対策を実施・水平展開している", basis: "厚労省「ヒヤリ・ハット活動の進め方」" },
  { no: 30, category: "emergency", text: "安全衛生委員会を月1回以上開催し、議事録を労働者に周知している", basis: "労働安全衛生法 第18条" },
];

const TRANSPORT: ChecklistItem[] = [
  { no: 1, category: "high-risk-work", text: "荷役作業（トラック荷台・テールゲートリフター等）は安全衛生教育受講者を配置している", basis: "陸災防「荷役作業安全ガイドライン」/ 安衛則 第36条第5号の4（テールゲートリフター特別教育）" },
  { no: 2, category: "high-risk-work", text: "高さ2m以上のトラック荷台での作業には昇降設備・墜落制止用器具を準備している", basis: "労働安全衛生規則 第151条の67（昇降設備）" },
  { no: 3, category: "high-risk-work", text: "フォークリフト荷役は無資格者の運転を禁止し、合図者を配置している", basis: "安衛法 第61条 / 労働安全衛生規則 第151条の8（合図）" },
  { no: 4, category: "high-risk-work", text: "長距離運行は改善基準告示の拘束時間・休息時間を遵守している", basis: "自動車運転者の労働時間等の改善のための基準" },
  { no: 5, category: "high-risk-work", text: "冬季・降雪時の運行可否判断基準と代替ルートを社内で運用している", basis: "貨物自動車運送事業安全規則 第3条" },
  { no: 6, category: "equipment", text: "車両は日常点検・3か月点検・12か月点検を実施し、点検整備記録を保管している", basis: "道路運送車両法 第48条" },
  { no: 7, category: "equipment", text: "テールゲートリフター使用時は積載重量と取扱手順を遵守している", basis: "労働安全衛生規則 第151条の67・第151条の74（2023年改正）" },
  { no: 8, category: "equipment", text: "フォークリフトのバックブザー・ヘッドガード・シートベルトを点検している", basis: "労働安全衛生規則 第151条の17（ヘッドガード）・第151条の25（点検）" },
  { no: 9, category: "equipment", text: "ロールボックスパレット・カゴ車のキャスター・止め金具を点検している", basis: "陸災防「ロールボックスパレットの安全使用」" },
  { no: 10, category: "equipment", text: "車両のドライブレコーダー・デジタコにより速度・運行を管理している", basis: "貨物自動車運送事業輸送安全規則" },
  { no: 11, category: "training", text: "運転者には初任・特別運転・適性診断を実施し記録を保管している", basis: "貨物自動車運送事業輸送安全規則 第10条" },
  { no: 12, category: "training", text: "フォークリフト技能講習修了者のみを運転業務に従事させている", basis: "労働安全衛生法 第61条" },
  { no: 13, category: "training", text: "腰痛予防の作業姿勢教育を年1回以上実施している", basis: "厚労省「職場における腰痛予防対策指針」" },
  { no: 14, category: "training", text: "新人・転入者には先輩運転者の同乗指導を一定期間実施している", basis: "貨物自動車運送事業輸送安全規則 第10条" },
  { no: 15, category: "training", text: "毎朝の点呼で運転者の健康状態・酒気帯び確認・運行内容を確認している", basis: "貨物自動車運送事業輸送安全規則 第7条" },
  { no: 16, category: "environment", text: "荷物の積み付け基準・固縛方法を文書化し荷崩れを防いでいる", basis: "労働安全衛生規則 第151条の68" },
  { no: 17, category: "environment", text: "倉庫内通路は人と車両を区分し、転倒・接触の防止を行っている", basis: "労働安全衛生規則 第544条" },
  { no: 18, category: "environment", text: "倉庫の照度・通路幅・段差を点検し、躓きの原因を排除している", basis: "労働安全衛生規則 第604条" },
  { no: 19, category: "environment", text: "暑熱環境下の荷役作業はWBGT基準で休憩を確保している", basis: "厚労省「職場における熱中症予防基本対策要綱」" },
  { no: 20, category: "environment", text: "凍結・降雨時の荷役は滑り止め対策（敷物・スパイクシューズ等）を講じている", basis: "労働安全衛生規則 第522条" },
  { no: 21, category: "individual", text: "ヘルメット・安全靴・反射ベスト等を支給し、夜間作業時は反射材着用を徹底している", basis: "労働安全衛生規則 第593条" },
  { no: 22, category: "individual", text: "腰部保護ベルト・荷役補助具を必要に応じて支給している", basis: "厚労省「職場における腰痛予防対策指針」" },
  { no: 23, category: "individual", text: "雇入時・定期健康診断と運転者適性診断を実施している", basis: "労働安全衛生規則 第43条〜第45条" },
  { no: 24, category: "individual", text: "高年齢運転者には視力・反射神経の確認と作業配分の見直しを行っている", basis: "厚労省「エイジフレンドリーガイドライン」" },
  { no: 25, category: "individual", text: "睡眠時無呼吸症候群（SAS）スクリーニング検査を実施している", basis: "国土交通省「事業用自動車の運転者の健康管理マニュアル」" },
  { no: 26, category: "emergency", text: "事故発生時の通報・救護・運行管理者連絡の手順を運転者に教育している", basis: "貨物自動車運送事業輸送安全規則 第18条" },
  { no: 27, category: "emergency", text: "発煙筒・三角表示板・救急セットを車両に常備している", basis: "道路運送車両の保安基準 第43条の3" },
  { no: 28, category: "emergency", text: "労働災害発生時の労基署報告の責任者を明確化している", basis: "労働安全衛生規則 第97条" },
  { no: 29, category: "emergency", text: "ヒヤリハット・事故情報を月次で全運転者に共有している", basis: "厚労省「ヒヤリ・ハット活動の進め方」" },
  { no: 30, category: "emergency", text: "安全衛生委員会または運行管理会議を月1回以上開催している", basis: "労働安全衛生法 第18条" },
];

const HEALTHCARE: ChecklistItem[] = [
  { no: 1, category: "high-risk-work", text: "移乗・体位交換・入浴介助は1名介助か2名介助かを利用者ごとに判定し記録している", basis: "厚労省「職場における腰痛予防対策指針」" },
  { no: 2, category: "high-risk-work", text: "感染症が疑われる利用者にはスタンダードプリコーション＋経路別感染予防策を運用している", basis: "厚労省「医療機関における院内感染対策マニュアル」" },
  { no: 3, category: "high-risk-work", text: "針刺し・切創を伴う処置はリキャップ禁止・安全器具使用を徹底している", basis: "労働安全衛生規則 第594条 / 厚労省「医療従事者の感染防止」" },
  { no: 4, category: "high-risk-work", text: "暴力・ハラスメントが想定される利用者対応は事前にリスク評価し2人対応にしている", basis: "労働施策総合推進法 第30条の2 / 厚労省「カスタマーハラスメント対策」" },
  { no: 5, category: "high-risk-work", text: "夜勤・準夜勤は適正人員配置と仮眠時間を確保している", basis: "労働基準法 第41条 / 厚労省「夜勤・交代制勤務改善ガイドライン」" },
  { no: 6, category: "equipment", text: "移乗用リフト・スライディングシート等のノーリフトケア機器を整備している", basis: "厚労省「職場における腰痛予防対策指針」" },
  { no: 7, category: "equipment", text: "安全機構付き針・耐切創手袋等の感染対策器具を常備している", basis: "厚労省「医療従事者の感染防止」" },
  { no: 8, category: "equipment", text: "ベッド・車椅子・浴室の手すり・滑り止めを定期点検している", basis: "労働安全衛生規則 第544条" },
  { no: 9, category: "equipment", text: "オートロック・防犯カメラ・通報装置等の暴力対策設備を運用している", basis: "厚労省「カスタマーハラスメント対策」" },
  { no: 10, category: "equipment", text: "AED・救急カート・除細動器の点検記録を保管している", basis: "厚労省「職場におけるAED設置促進」" },
  { no: 11, category: "training", text: "移乗・体位交換等の身体介助技術研修を新人・配置転換時に実施している", basis: "厚労省「職場における腰痛予防対策指針」" },
  { no: 12, category: "training", text: "感染症対策（標準予防策・経路別予防策）の研修を年2回以上実施している", basis: "感染症法 / 厚労省「医療機関における院内感染対策」" },
  { no: 13, category: "training", text: "暴力・ハラスメント対応のシミュレーション訓練を実施している", basis: "厚労省「カスタマーハラスメント対策」" },
  { no: 14, category: "training", text: "ハラスメント・暴力被害の相談窓口を設置し周知している", basis: "労働施策総合推進法 第30条の2" },
  { no: 15, category: "training", text: "毎勤務開始時に申送り・KYで本日のリスクを共有している", basis: "厚労省「危険予知活動の進め方」" },
  { no: 16, category: "environment", text: "床面の濡れ・段差・コードを点検し、転倒の原因を排除している", basis: "労働安全衛生規則 第544条" },
  { no: 17, category: "environment", text: "ユニフォーム・リネンの感染区分（清潔・不潔）を区分管理している", basis: "感染症法 / 院内感染対策マニュアル" },
  { no: 18, category: "environment", text: "薬剤・消毒薬の保管庫を施錠管理し、転倒防止を講じている", basis: "労働安全衛生規則 第325条" },
  { no: 19, category: "environment", text: "ナースステーション・スタッフルームに防犯センサー・通報装置を設置している", basis: "厚労省「カスタマーハラスメント対策」" },
  { no: 20, category: "environment", text: "屋外送迎・洗濯物干し作業は熱中症対策（WBGT・水分補給）を実施している", basis: "厚労省「職場における熱中症予防基本対策要綱」" },
  { no: 21, category: "individual", text: "感染防護具（マスク・ガウン・手袋・フェイスシールド）を業務に応じて支給している", basis: "労働安全衛生規則 第593条" },
  { no: 22, category: "individual", text: "腰部保護ベルト・滑りにくい靴等を必要に応じて支給している", basis: "厚労省「職場における腰痛予防対策指針」" },
  { no: 23, category: "individual", text: "雇入時健康診断・B型肝炎ワクチン・抗体検査等を実施している", basis: "労働安全衛生規則 第43条" },
  { no: 24, category: "individual", text: "夜勤回数・連続夜勤の上限を就業規則で定めている", basis: "労働基準法 第41条" },
  { no: 25, category: "individual", text: "メンタルヘルス相談窓口・EAPを設置し利用方法を周知している", basis: "労働安全衛生法 第66条の10" },
  { no: 26, category: "emergency", text: "コードブルー・コードシルバー等の緊急コール体制を訓練している", basis: "医療法施行規則 第1条の11" },
  { no: 27, category: "emergency", text: "AED・蘇生処置の訓練を年1回以上全職員に実施している", basis: "厚労省「職場におけるAED設置促進」" },
  { no: 28, category: "emergency", text: "労働災害（針刺し・暴力被害含む）の労基署報告体制を明確化している", basis: "労働安全衛生規則 第97条" },
  { no: 29, category: "emergency", text: "ヒヤリハット・インシデント報告を月次で分析し再発防止策を講じている", basis: "厚労省「医療安全管理体制」" },
  { no: 30, category: "emergency", text: "安全衛生委員会または医療安全委員会を月1回以上開催している", basis: "労働安全衛生法 第18条 / 医療法 第6条の12" },
];

const SERVICE: ChecklistItem[] = [
  { no: 1, category: "high-risk-work", text: "厨房・調理場での刃物・調理機器の作業手順を文書化し新人に教育している", basis: "労働安全衛生規則 第111条" },
  { no: 2, category: "high-risk-work", text: "高温油・蒸気・熱湯を扱う作業の手順を周知し防護具を支給している", basis: "労働安全衛生規則 第341条" },
  { no: 3, category: "high-risk-work", text: "ビルメン・清掃の高所作業は墜落制止用器具と昇降設備を整備している", basis: "労働安全衛生規則 第518条" },
  { no: 4, category: "high-risk-work", text: "屋外清掃・配送・案内業務は熱中症予防のWBGT管理を実施している", basis: "厚労省「職場における熱中症予防基本対策要綱」" },
  { no: 5, category: "high-risk-work", text: "迷惑客・暴力リスクが高い時間帯・店舗を特定し対応手順を共有している", basis: "厚労省「カスタマーハラスメント対策」" },
  { no: 6, category: "equipment", text: "厨房設備（フライヤー・スライサー・グリドル等）の安全装置と非常停止を点検している", basis: "労働安全衛生規則 第111条" },
  { no: 7, category: "equipment", text: "脚立・踏み台・カートのキャスターを定期点検している", basis: "労働安全衛生規則 第544条" },
  { no: 8, category: "equipment", text: "清掃用カートに段差超え用ストッパー・滑り止めを装備している", basis: "労働安全衛生規則 第544条" },
  { no: 9, category: "equipment", text: "防犯カメラ・通報ボタン・防犯ブザー等の暴力対策設備を運用している", basis: "厚労省「カスタマーハラスメント対策」" },
  { no: 10, category: "equipment", text: "AED・消火器・緊急照明の点検記録を保管している", basis: "消防法 / 厚労省「職場におけるAED設置促進」" },
  { no: 11, category: "training", text: "新人スタッフには店舗ごとのKY・接客対応訓練を実施している", basis: "労働安全衛生法 第59条" },
  { no: 12, category: "training", text: "厨房・清掃の特別教育（必要な作業のみ）を実施している", basis: "労働安全衛生法 第59条第3項" },
  { no: 13, category: "training", text: "暴力・ハラスメント対応のロールプレイ研修を実施している", basis: "労働施策総合推進法 第30条の2" },
  { no: 14, category: "training", text: "ハラスメント・暴力被害の相談窓口を設置し周知している", basis: "労働施策総合推進法 第30条の2" },
  { no: 15, category: "training", text: "毎朝のKY・ミーティングで当日のリスクを共有している", basis: "厚労省「危険予知活動の進め方」" },
  { no: 16, category: "environment", text: "床面の濡れ・段差・障害物を清掃・整理し転倒原因を排除している", basis: "労働安全衛生規則 第544条" },
  { no: 17, category: "environment", text: "厨房床の油・水濡れに対し滑り止め床材・防滑靴を運用している", basis: "労働安全衛生規則 第544条第2項" },
  { no: 18, category: "environment", text: "化学洗剤・薬品の保管庫を施錠管理し換気を確保している", basis: "労働安全衛生規則 第325条" },
  { no: 19, category: "environment", text: "夜間営業店舗・無人時間帯の防犯対策（複数勤務・現金管理）を運用している", basis: "厚労省「カスタマーハラスメント対策」" },
  { no: 20, category: "environment", text: "屋外作業・厨房は熱中症予防の冷風機・水分補給場所を確保している", basis: "厚労省「職場における熱中症予防基本対策要綱」" },
  { no: 21, category: "individual", text: "耐切創手袋・耐熱手袋・滑りにくい靴等を業務に応じて支給している", basis: "労働安全衛生規則 第593条" },
  { no: 22, category: "individual", text: "化学洗剤を扱う場合は保護メガネ・耐薬品手袋を支給している", basis: "労働安全衛生規則 第594条" },
  { no: 23, category: "individual", text: "雇入時・定期健康診断（食品衛生従事者は検便含む）を実施している", basis: "労働安全衛生規則 第43条 / 食品衛生法" },
  { no: 24, category: "individual", text: "高齢・短時間労働者にも健康診断・教育を漏れなく実施している", basis: "労働安全衛生法 第66条 / 短時間労働者の活躍推進指針" },
  { no: 25, category: "individual", text: "メンタルヘルス相談窓口・EAPを設置し利用方法を周知している", basis: "労働安全衛生法 第66条の10" },
  { no: 26, category: "emergency", text: "緊急連絡網（消防・警察・本部）を店舗・現場に掲示している", basis: "労働安全衛生規則 第29条" },
  { no: 27, category: "emergency", text: "火災・暴力被害発生時の通報・避難・救護訓練を年1回以上実施している", basis: "消防法 / 厚労省「カスタマーハラスメント対策」" },
  { no: 28, category: "emergency", text: "労働災害発生時の労基署報告の責任者を明確化している", basis: "労働安全衛生規則 第97条" },
  { no: 29, category: "emergency", text: "ヒヤリハット・カスタマーハラスメント事案を月次で集約し再発防止に反映している", basis: "厚労省「カスタマーハラスメント対策」" },
  { no: 30, category: "emergency", text: "安全衛生委員会または店舗連絡会を月1回以上開催している", basis: "労働安全衛生法 第18条" },
];

const CHECKLISTS: Record<IndustrySlug, ChecklistItem[]> = {
  construction: CONSTRUCTION,
  manufacturing: MANUFACTURING,
  transport: TRANSPORT,
  healthcare: HEALTHCARE,
  service: SERVICE,
};

export function getPreventionChecklist(slug: IndustrySlug): ChecklistItem[] {
  return CHECKLISTS[slug] ?? [];
}

export function getChecklistByCategory(
  slug: IndustrySlug,
): Record<ChecklistCategory, ChecklistItem[]> {
  const items = getPreventionChecklist(slug);
  const result: Record<ChecklistCategory, ChecklistItem[]> = {
    "high-risk-work": [],
    equipment: [],
    training: [],
    environment: [],
    individual: [],
    emergency: [],
  };
  for (const it of items) result[it.category].push(it);
  return result;
}

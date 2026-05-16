/**
 * Common monthly events that appear in nearly every Japanese employer's
 * annual safety & health plan. Industry-specific events are layered on top
 * in each industry template file.
 *
 * Key anchors:
 * - 7/1〜7/7: 全国安全週間（準備期間 6/1〜6/30）
 * - 9/1: 防災の日
 * - 10/1〜10/7: 全国労働衛生週間（準備期間 9/1〜9/30）
 * - 11月: 過労死等防止啓発月間
 * - 11月: 「労働保険適正加入推進」「賃金不払残業解消キャンペーン」
 */

import type { MonthlySchedule } from "@/types/safety-plan";

export const commonMonthlySchedule: MonthlySchedule[] = [
  {
    month: 4,
    events: [
      {
        title: "年度方針発表・安全衛生計画周知",
        category: "committee",
        description:
          "事業者方針と当年度の重点目標・実施事項を全従業員に周知する。朝礼・委員会・社内掲示で確実に伝達。",
        required: false,
      },
      {
        title: "新入社員向け雇入れ時教育",
        category: "education",
        description:
          "新規採用者全員に対し、業務に応じた危険有害性・保護具・整理整頓・事故時の措置を教育する。",
        reference: "安衛法第59条第1項",
        required: true,
      },
      {
        title: "安全衛生委員会（4月）",
        category: "committee",
        description:
          "前年度の災害分析報告と当年度計画の審議・周知。議事録は3年間保存。",
        reference: "安衛法第18条 / 安衛則第23条",
        required: true,
      },
    ],
  },
  {
    month: 5,
    events: [
      {
        title: "定期健康診断（春実施分）",
        category: "health-check",
        description:
          "全従業員対象の定期健診を計画的に実施。深夜業従事者は6か月以内ごとのため対象月に注意。",
        reference: "安衛法第66条 / 安衛則第44条",
        required: true,
      },
      {
        title: "ゴールデンウィーク前後の安全点検",
        category: "inspection",
        description:
          "長期休業前後の設備点検、施錠・電源等の確認。長期休業明けの始業前点検チェックリスト運用。",
        required: false,
      },
      {
        title: "安全衛生委員会（5月）",
        category: "committee",
        description: "健診受診計画と熱中症対策の協議。",
        reference: "安衛則第23条",
        required: true,
      },
    ],
  },
  {
    month: 6,
    events: [
      {
        title: "全国安全週間 準備期間",
        category: "education",
        description:
          "全国安全週間（7/1〜7/7）の準備期間として、職場の自主点検・標語掲示・経営トップ巡視を計画する。",
        required: false,
      },
      {
        title: "熱中症予防対策の徹底",
        category: "industry-specific",
        description:
          "WBGT測定機器の点検、暑熱順化計画、休憩・水分塩分補給ルール、緊急連絡体制を確認。改正安衛則による「重篤化防止のための措置」（令和7年6月1日施行）に基づく体制整備を含む。",
        reference: "安衛則第612条の2（令和7年改正）",
        required: true,
      },
      {
        title: "安全衛生委員会（6月）",
        category: "committee",
        description: "熱中症予防対策と安全週間取組の協議。",
        reference: "安衛則第23条",
        required: true,
      },
    ],
  },
  {
    month: 7,
    events: [
      {
        title: "全国安全週間（7/1〜7/7）",
        category: "education",
        description:
          "経営トップ巡視、安全大会、職場標語、表彰、家族向けメッセージ等を実施。年度スローガンに沿って計画する。",
        required: false,
      },
      {
        title: "熱中症対策の継続",
        category: "industry-specific",
        description:
          "暑熱期のリスク評価を週次で見直し、塩飴・経口補水液・冷却用具の備蓄を確認する。屋外作業は休止判断基準（WBGT 28以上で重点警戒等）を運用。",
        required: true,
      },
      {
        title: "安全衛生委員会（7月）",
        category: "committee",
        description: "安全週間の振り返りと夏季対策の進捗確認。",
        reference: "安衛則第23条",
        required: true,
      },
    ],
  },
  {
    month: 8,
    events: [
      {
        title: "お盆休暇前の一斉点検",
        category: "inspection",
        description:
          "長期休業前の設備停止・施錠・廃棄物・薬品保管の確認。緊急連絡網と当番制の周知。",
        required: false,
      },
      {
        title: "夏季の腰痛・熱中症対策フォロー",
        category: "health-check",
        description:
          "高負荷作業者へのヒアリングと配置調整、塩分・水分摂取の声掛けを継続。",
        required: false,
      },
      {
        title: "安全衛生委員会（8月）",
        category: "committee",
        description: "夏季の災害・ヒヤリハット分析と秋に向けた重点事項の協議。",
        reference: "安衛則第23条",
        required: true,
      },
    ],
  },
  {
    month: 9,
    events: [
      {
        title: "防災の日（9/1）防災訓練",
        category: "drill",
        description:
          "地震・火災を想定した避難訓練、通報訓練、初期消火訓練、安否確認システムの起動訓練を実施する。",
        reference: "消防法第8条",
        required: true,
      },
      {
        title: "全国労働衛生週間 準備期間（9/1〜9/30）",
        category: "education",
        description:
          "メンタルヘルス・過重労働対策・健診事後措置・受動喫煙対策の自主点検を実施。",
        required: false,
      },
      {
        title: "安全衛生委員会（9月）",
        category: "committee",
        description: "労働衛生週間の取組と防災訓練結果の協議。",
        reference: "安衛則第23条",
        required: true,
      },
    ],
  },
  {
    month: 10,
    events: [
      {
        title: "全国労働衛生週間（10/1〜10/7）",
        category: "education",
        description:
          "産業医・衛生管理者による職場巡視強化、健康教室、ストレスチェック実施計画、受動喫煙対策の周知。",
        required: false,
      },
      {
        title: "ストレスチェック実施（50人以上事業場）",
        category: "health-check",
        description:
          "厚労省版「職業性ストレス簡易調査票」等で実施。結果通知から1か月以内に申出を受付け、申出から1か月以内に医師面接指導を実施。",
        reference: "安衛法第66条の10",
        required: true,
      },
      {
        title: "秋実施分の定期健康診断",
        category: "health-check",
        description:
          "深夜業従事者・春に未受診者を対象に定期健診を実施し、未受診者をゼロに。",
        reference: "安衛則第44条",
        required: true,
      },
    ],
  },
  {
    month: 11,
    events: [
      {
        title: "過労死等防止啓発月間",
        category: "health-check",
        description:
          "長時間労働者の把握、勤務間インターバル制度の周知、医師面接指導の対象者抽出を強化する。",
        reference: "過労死等防止対策推進法",
        required: false,
      },
      {
        title: "ストレスチェック結果フィードバック",
        category: "health-check",
        description:
          "個人結果通知、集団分析の活用、職場環境改善計画の策定。",
        reference: "安衛法第66条の10第7項",
        required: true,
      },
      {
        title: "安全衛生委員会（11月）",
        category: "committee",
        description: "過重労働対策の進捗確認と冬季対策の協議。",
        reference: "安衛則第23条",
        required: true,
      },
    ],
  },
  {
    month: 12,
    events: [
      {
        title: "年末年始の安全点検",
        category: "inspection",
        description:
          "長期休業前の設備・電源・施錠・凍結対策・廃棄物・危険物保管の確認。緊急連絡体制と非常時の対応ルートを再確認。",
        required: false,
      },
      {
        title: "インフルエンザ等感染症対策",
        category: "health-check",
        description:
          "予防接種の案内、咳エチケット・手指衛生の徹底、休暇取得の促進。",
        required: false,
      },
      {
        title: "安全衛生委員会（12月）",
        category: "committee",
        description: "年末年始対策と次年度計画の論点整理。",
        reference: "安衛則第23条",
        required: true,
      },
    ],
  },
  {
    month: 1,
    events: [
      {
        title: "年始の安全衛生方針共有",
        category: "committee",
        description:
          "経営トップから年始の安全方針を発信。前年度の災害発生状況と今年度残り3か月の重点を周知。",
        required: false,
      },
      {
        title: "健康診断結果のフォロー",
        category: "health-check",
        description:
          "要再検査者・要医療者の受診状況を確認し、就業区分判定と保健指導の進捗を点検する。",
        reference: "安衛法第66条の4・第66条の5",
        required: true,
      },
      {
        title: "安全衛生委員会（1月）",
        category: "committee",
        description: "次年度計画の骨子協議。冬季災害（転倒・凍結・乾燥）の対策確認。",
        reference: "安衛則第23条",
        required: true,
      },
    ],
  },
  {
    month: 2,
    events: [
      {
        title: "次年度計画案の策定",
        category: "committee",
        description:
          "重点目標・数値目標・実施事項・月別スケジュールの草案を作成し、3月の委員会で審議できる状態にする。",
        required: false,
      },
      {
        title: "粉じん・有機溶剤等の作業環境測定（該当事業場）",
        category: "inspection",
        description:
          "対象作業場では6か月以内ごとに1回の作業環境測定を実施。第3管理区分は速やかに改善計画を策定。",
        reference: "作業環境測定法 / 安衛法第65条",
        required: true,
      },
      {
        title: "安全衛生委員会（2月）",
        category: "committee",
        description: "年度総括の準備と次年度計画案の論点整理。",
        reference: "安衛則第23条",
        required: true,
      },
    ],
  },
  {
    month: 3,
    events: [
      {
        title: "年度総括・災害分析",
        category: "committee",
        description:
          "発生災害・ヒヤリハット・健診・ストレスチェック等の年度集計を行い、再発防止策の有効性を評価する。",
        required: false,
      },
      {
        title: "次年度安全衛生計画の決定",
        category: "committee",
        description:
          "安全衛生委員会で次年度計画を審議・決定。事業者方針の決裁を得て社内へ周知。",
        reference: "安衛則第23条",
        required: true,
      },
      {
        title: "年度末点検と引継ぎ",
        category: "inspection",
        description:
          "設備点検記録・健診結果・教育記録・委員会議事録の保存状態を点検。担当者異動に備えて引継ぎ資料を整備。",
        required: false,
      },
    ],
  },
];

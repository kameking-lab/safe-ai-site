/**
 * カリキュラム正本レジストリ（企画 02章 層1・03章 初期ラインナップ5本）。
 *
 * 科目・範囲・時間は告示正本（e-Gov／MHLW法令等データベース／JAISH）から 2026-07-12 に転記。
 * 時間は全て下限（「〜時間以上」）。scopeItems は告示「範囲」欄を項目分割（照合の最小単位）。
 * 転記の改変は curriculum-snapshot.test.ts が科目名・範囲・時間の合計をピン留めして CI で検知する。
 *
 * 出典（正本・2026-07-12確認）:
 * - 安全衛生特別教育規程（昭和47年労働省告示第92号）第24条＝フルハーネス・第6条＝低圧電気:
 *   https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0&pageNo=1
 * - 粉じん作業特別教育規程（昭和54年労働省告示第68号）:
 *   https://www.mhlw.go.jp/web/t_doc?dataId=74109000&dataType=0&pageNo=1
 * - 酸素欠乏危険作業特別教育規程（昭和57年労働省告示第132号）第1条＝第1種・第2条＝第2種:
 *   https://www.mhlw.go.jp/web/t_doc?dataId=74106000&dataType=0&pageNo=1
 * - 熱中症: 安衛則第612条の2（令和7年6月1日施行）＋基発0520第6号＋「職場における熱中症対策のための
 *   ガイドライン」（令和8年3月18日基発0318第1号別紙）第3の5 労働衛生教育:
 *   https://www.jaish.gr.jp/anzen/hor/hombun/hor1-67/hor1-67-3-1-0.htm
 */

import type { EducationCurriculum } from "./types";

const MHLW_SE_KITEI = "https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0&pageNo=1";

/** フルハーネス型墜落制止用器具 特別教育（安衛則36条41号＋規程第24条）。 */
const FULLHARNESS: EducationCurriculum = {
  curriculumId: "se-36-41-fullharness",
  name: "フルハーネス型墜落制止用器具を用いて行う作業に係る特別教育",
  educationClass: "special",
  basis: {
    ruleRef: "安衛則第36条第41号",
    // 根拠告示は規程第24条（平30告示249号で追加・平31.2.1適用）。器具の構造規格である
    // 「墜落制止用器具の規格（平31.1.25厚労省告示第11号）」とは別物（企画01章§2-1の是正）。
    kokuji:
      "安全衛生特別教育規程（昭和47年労働省告示第92号）第24条（平成30年厚生労働省告示第249号で追加・平成31年2月1日適用）",
    sourceUrl: MHLW_SE_KITEI,
    retrievedOn: "2026-07-12",
  },
  tracks: [
    {
      trackId: "default",
      name: "フルハーネス型墜落制止用器具特別教育",
      totalGakkaHours: 4.5,
      totalJitsugiHours: 1.5,
      units: [
        {
          unitId: "fh-gakka-1",
          kind: "gakka",
          subject: "作業に関する知識",
          minHours: 1,
          scopeItems: [
            "作業に用いる設備の種類、構造及び取扱い方法",
            "作業に用いる設備の点検及び整備の方法",
            "作業の方法",
          ],
        },
        {
          unitId: "fh-gakka-2",
          kind: "gakka",
          subject: "墜落制止用器具に関する知識",
          minHours: 2,
          scopeItems: [
            "墜落制止用器具のフルハーネス及びランヤードの種類及び構造",
            "墜落制止用器具のフルハーネスの装着の方法",
            "墜落制止用器具のランヤードの取付け設備等への取付け方法及び選定方法",
            "墜落制止用器具の点検及び整備の方法",
            "墜落制止用器具の関連器具の使用方法",
          ],
        },
        {
          unitId: "fh-gakka-3",
          kind: "gakka",
          subject: "労働災害の防止に関する知識",
          minHours: 1,
          scopeItems: [
            "墜落による労働災害の防止のための措置",
            "落下物による危険防止のための措置",
            "感電防止のための措置",
            "保護帽の使用方法及び保守点検の方法",
            "事故発生時の措置",
            "その他作業に伴う災害及びその防止方法",
          ],
        },
        {
          unitId: "fh-gakka-4",
          kind: "gakka",
          subject: "関係法令",
          minHours: 0.5,
          scopeItems: ["法、令及び安衛則中の関係条項"],
        },
        {
          unitId: "fh-jitsugi-1",
          kind: "jitsugi",
          subject: "墜落制止用器具の使用方法等",
          minHours: 1.5,
          scopeItems: [
            "墜落制止用器具のフルハーネスの装着の方法",
            "墜落制止用器具のランヤードの取付け設備等への取付け方法",
            "墜落による労働災害防止のための措置",
            "墜落制止用器具の点検及び整備の方法",
          ],
        },
      ],
    },
  ],
};

/** 熱中症予防 労働衛生教育（通達・ガイドラインベース）。管理者教育225分を照合対象トラックとする。 */
const NECCHU: EducationCurriculum = {
  curriculumId: "circular-necchu",
  name: "熱中症予防のための労働衛生教育",
  educationClass: "circular",
  basis: {
    // 特別教育ではない。義務の根拠は則612条の2、教育の根拠はガイドライン。
    ruleRef: "安衛則第612条の2",
    kokuji:
      "職場における熱中症対策のためのガイドライン（令和8年3月18日基発0318第1号別紙）第3の5 労働衛生教育／義務の根拠: 安衛則第612条の2（令和7年6月1日施行）・基発0520第6号",
    sourceUrl:
      "https://www.jaish.gr.jp/anzen/hor/hombun/hor1-67/hor1-67-3-1-0.htm",
    retrievedOn: "2026-07-12",
  },
  tracks: [
    {
      // 管理者に対する教育（計225分＝3時間45分）。職長等60分・作業従事者は将来トラックで追加（EDU-S1）。
      trackId: "manager",
      name: "管理者に対する教育（225分）",
      totalGakkaHours: 3.75,
      totalJitsugiHours: null,
      units: [
        {
          unitId: "nc-mgr-1",
          kind: "gakka",
          subject: "熱中症の症状",
          minHours: 0.5, // 30分
          scopeItems: [
            "熱中症の概要",
            "職場における熱中症の特徴",
            "体温の調節",
            "体液の調節",
            "熱中症が発生する仕組みと症状",
          ],
        },
        {
          unitId: "nc-mgr-2",
          kind: "gakka",
          subject: "熱中症の予防方法",
          minHours: 2.5, // 150分
          scopeItems: [
            "熱中症リスク要因とWBGT（意味、WBGT基準値に基づく評価）",
            "作業環境管理（WBGT値の低減、休憩場所の整備等）",
            "作業管理（作業時間の短縮、暑熱順化、水分及び塩分の摂取、服装、作業中の巡視等）",
            "健康管理（健康診断結果に基づく対応、日常の健康管理、作業従事者の健康状態の確認等）",
            "労働衛生教育（作業従事者に対する教育の重要性、教育内容及び教育方法）",
            "熱中症予防対策事例",
          ],
        },
        {
          unitId: "nc-mgr-3",
          kind: "gakka",
          subject: "緊急時の救急処置",
          minHours: 0.25, // 15分
          scopeItems: [
            "報告体制の整備及び周知・手順等の作成及び周知",
            "緊急時の救急措置",
          ],
        },
        {
          unitId: "nc-mgr-4",
          kind: "gakka",
          subject: "熱中症の事例",
          minHours: 0.25, // 15分
          scopeItems: ["熱中症の災害事例"],
        },
        {
          unitId: "nc-mgr-5",
          kind: "gakka",
          subject: "関係法令等",
          minHours: 0.25, // 15分
          scopeItems: ["熱中症の関係法令等"],
        },
      ],
    },
  ],
};

/** 粉じん作業 特別教育（粉じん則22条＋規程・学科のみ4.5h）。 */
const DUST: EducationCurriculum = {
  curriculumId: "se-36-29-dust",
  name: "特定粉じん作業に係る業務の特別教育",
  educationClass: "special",
  basis: {
    ruleRef: "安衛則第36条第29号",
    kokuji: "粉じん作業特別教育規程（昭和54年労働省告示第68号）",
    sourceUrl: "https://www.mhlw.go.jp/web/t_doc?dataId=74109000&dataType=0&pageNo=1",
    retrievedOn: "2026-07-12",
  },
  tracks: [
    {
      trackId: "default",
      name: "粉じん作業特別教育（学科のみ）",
      totalGakkaHours: 4.5,
      totalJitsugiHours: null,
      units: [
        {
          unitId: "dust-1",
          kind: "gakka",
          subject: "粉じんの発散防止及び作業場の換気の方法",
          minHours: 1,
          scopeItems: [
            "粉じんの発散防止対策の種類及び概要",
            "換気の種類及び概要",
          ],
        },
        {
          unitId: "dust-2",
          kind: "gakka",
          subject: "作業場の管理",
          minHours: 1,
          scopeItems: [
            "粉じんの発散防止対策に係る設備及び換気のための設備の保守点検の方法",
            "作業環境の点検の方法",
            "清掃の方法",
          ],
        },
        {
          unitId: "dust-3",
          kind: "gakka",
          subject: "呼吸用保護具の使用の方法",
          minHours: 0.5,
          scopeItems: ["呼吸用保護具の種類、性能、使用方法及び管理"],
        },
        {
          unitId: "dust-4",
          kind: "gakka",
          subject: "粉じんに係る疾病及び健康管理",
          minHours: 1,
          scopeItems: [
            "粉じんの有害性",
            "粉じんによる疾病の病理及び症状",
            "健康管理の方法",
          ],
        },
        {
          unitId: "dust-5",
          kind: "gakka",
          subject: "関係法令",
          minHours: 1,
          scopeItems: [
            "労働安全衛生法、労働安全衛生法施行令、労働安全衛生規則及び粉じん障害防止規則並びにじん肺法及びじん肺法施行規則中の関係条項",
          ],
        },
      ],
    },
  ],
};

/** 低圧電気取扱業務 特別教育（安衛則36条4号＋規程第6条）。 */
const TEIATSU: EducationCurriculum = {
  curriculumId: "se-36-4-teiatsu",
  name: "低圧の充電電路の敷設・修理等の業務に係る特別教育",
  educationClass: "special",
  basis: {
    ruleRef: "安衛則第36条第4号",
    kokuji: "安全衛生特別教育規程（昭和47年労働省告示第92号）第6条",
    sourceUrl: MHLW_SE_KITEI,
    retrievedOn: "2026-07-12",
  },
  tracks: [
    {
      trackId: "default",
      name: "低圧電気取扱業務特別教育",
      totalGakkaHours: 7,
      // 実技は業務内容で分岐（活線作業等は7h以上／開閉器の操作のみは1h以上）。下限を保持。
      totalJitsugiHours: 7,
      units: [
        {
          unitId: "te-gakka-1",
          kind: "gakka",
          subject: "低圧の電気に関する基礎知識",
          minHours: 1,
          scopeItems: ["低圧の電気の危険性", "短絡", "漏電", "接地", "電気絶縁"],
        },
        {
          unitId: "te-gakka-2",
          kind: "gakka",
          subject: "低圧の電気設備に関する基礎知識",
          minHours: 2,
          scopeItems: [
            "配電設備",
            "変電設備",
            "配線",
            "電気使用設備",
            "保守及び点検",
          ],
        },
        {
          unitId: "te-gakka-3",
          kind: "gakka",
          subject: "低圧用の安全作業用具に関する基礎知識",
          minHours: 1,
          scopeItems: [
            "絶縁用保護具",
            "絶縁用防具",
            "活線作業用器具",
            "検電器",
            "その他の安全作業用具",
            "管理",
          ],
        },
        {
          unitId: "te-gakka-4",
          kind: "gakka",
          subject: "低圧の活線作業及び活線近接作業の方法",
          minHours: 2,
          scopeItems: [
            "充電電路の防護",
            "作業者の絶縁保護",
            "停電電路に対する措置",
            "作業管理",
            "救急処置",
            "災害防止",
          ],
        },
        {
          unitId: "te-gakka-5",
          kind: "gakka",
          subject: "関係法令",
          minHours: 1,
          scopeItems: ["法、令及び安衛則中の関係条項"],
        },
        {
          unitId: "te-jitsugi-1",
          kind: "jitsugi",
          // 実技は規程第6条第3項の条文本文で規定（範囲の表なし）。開閉器の操作の業務のみは1h以上。
          subject: "低圧の活線作業及び活線近接作業の方法",
          minHours: 7,
          scopeItems: ["低圧の活線作業及び活線近接作業の方法"],
        },
      ],
    },
  ],
};

/** 酸素欠乏危険作業 特別教育（酸欠則12条＋規程。第1種4h／第2種5.5h）。 */
const OXYGEN: EducationCurriculum = {
  curriculumId: "se-36-26-oxygen",
  name: "酸素欠乏危険作業に係る業務の特別教育",
  educationClass: "special",
  basis: {
    ruleRef: "安衛則第36条第26号",
    kokuji: "酸素欠乏危険作業特別教育規程（昭和57年労働省告示第132号）第1条（第1種）・第2条（第2種）",
    sourceUrl: "https://www.mhlw.go.jp/web/t_doc?dataId=74106000&dataType=0&pageNo=1",
    retrievedOn: "2026-07-12",
  },
  tracks: [
    {
      trackId: "type-1",
      name: "第1種酸素欠乏危険作業（学科4時間）",
      totalGakkaHours: 4,
      totalJitsugiHours: null,
      units: [
        {
          unitId: "o1-1",
          kind: "gakka",
          subject: "酸素欠乏の発生の原因",
          minHours: 0.5,
          scopeItems: ["酸素欠乏の発生の原因", "酸素欠乏の発生しやすい場所"],
        },
        {
          unitId: "o1-2",
          kind: "gakka",
          subject: "酸素欠乏症の症状",
          minHours: 0.5,
          scopeItems: ["酸素欠乏による危険性", "酸素欠乏症の主な症状"],
        },
        {
          unitId: "o1-3",
          kind: "gakka",
          subject: "空気呼吸器等の使用の方法",
          minHours: 1,
          scopeItems: [
            "空気呼吸器、酸素呼吸器若しくは送気マスク又は換気装置の使用方法及び保守点検の方法",
          ],
        },
        {
          unitId: "o1-4",
          kind: "gakka",
          subject: "事故の場合の退避及び救急そ生の方法",
          minHours: 1,
          scopeItems: [
            "墜落制止用器具等並びに救出用の設備及び器具の使用方法並びに保守点検の方法",
            "人工呼吸の方法",
            "人工そ生器の使用方法",
          ],
        },
        {
          unitId: "o1-5",
          kind: "gakka",
          subject: "その他酸素欠乏症の防止に関し必要な事項",
          minHours: 1,
          scopeItems: [
            "労働安全衛生法、労働安全衛生法施行令、労働安全衛生規則及び酸素欠乏症等防止規則中の関係条項",
            "酸素欠乏症を防止するため当該業務について必要な事項",
          ],
        },
      ],
    },
    {
      trackId: "type-2",
      name: "第2種酸素欠乏危険作業（学科5.5時間・硫化水素含む）",
      totalGakkaHours: 5.5,
      totalJitsugiHours: null,
      units: [
        {
          unitId: "o2-1",
          kind: "gakka",
          subject: "酸素欠乏等の発生の原因",
          minHours: 1,
          scopeItems: ["酸素欠乏等の発生の原因", "酸素欠乏等の発生しやすい場所"],
        },
        {
          unitId: "o2-2",
          kind: "gakka",
          subject: "酸素欠乏症等の症状",
          minHours: 1,
          scopeItems: ["酸素欠乏等による危険性", "酸素欠乏症等の主な症状"],
        },
        {
          unitId: "o2-3",
          kind: "gakka",
          subject: "空気呼吸器等の使用の方法",
          minHours: 1,
          scopeItems: [
            "空気呼吸器、酸素呼吸器若しくは送気マスク又は換気装置の使用方法及び保守点検の方法",
          ],
        },
        {
          unitId: "o2-4",
          kind: "gakka",
          subject: "事故の場合の退避及び救急そ生の方法",
          minHours: 1,
          scopeItems: [
            "墜落制止用器具等並びに救出用の設備及び器具の使用方法並びに保守点検の方法",
            "人工呼吸の方法",
            "人工そ生器の使用方法",
          ],
        },
        {
          unitId: "o2-5",
          kind: "gakka",
          subject: "その他酸素欠乏症等の防止に関し必要な事項",
          minHours: 1.5,
          scopeItems: [
            "労働安全衛生法、労働安全衛生法施行令、労働安全衛生規則及び酸素欠乏症等防止規則中の関係条項",
            "酸素欠乏症等を防止するため当該業務について必要な事項",
          ],
        },
      ],
    },
  ],
};

export const EDUCATION_CURRICULA: readonly EducationCurriculum[] = [
  FULLHARNESS,
  NECCHU,
  DUST,
  TEIATSU,
  OXYGEN,
];

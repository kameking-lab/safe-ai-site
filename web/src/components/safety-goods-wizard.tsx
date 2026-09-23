"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, ExternalLink, RotateCcw, Search, ShieldCheck } from "lucide-react";
import {
  generateAmazonAffiliateUrl,
  generateRakutenSearchUrl,
} from "@/lib/affiliate-url";
import { trackEvent } from "@/components/Analytics";

const MHLW_OXYGEN_RULES_URL =
  "https://anzeninfo.mhlw.go.jp/horei/hor1-45/hor1-45-33-1-5.html";
const MHLW_DUST_MASK_GUIDANCE_URL =
  "https://www.mhlw.go.jp/web/t_doc?dataId=00tc2747&dataType=1";
const MHLW_SAFETY_FOOTWEAR_URL =
  "https://www.mhlw.go.jp/web/t_doc?dataId=74003000&dataType=0&pageNo=9";
const NETIS_SEARCH_URL =
  "https://www.netis.mlit.go.jp/netis/input/pubsearch/search";

type Option = { id: string; label: string; detail: string };

type Selection = {
  category: Option;
  task: Option;
  condition: Option;
};

type Recommendation = {
  title: string;
  query?: string;
  summary: string;
  officialHref: string;
  officialLabel: string;
  checks: readonly string[];
  verifiedCandidate?: {
    name: string;
    maker: string;
    reason: string;
    href: string;
  };
  urgent?: boolean;
  withholdPurchase?: boolean;
};

type RecommendationProfile = Omit<Recommendation, "query"> & {
  categoryId: string;
  taskIds: readonly string[];
  query: string;
};

type ConditionProfile = {
  categoryId: string;
  conditionIds: readonly string[];
  label: string;
  queryTerms: string;
  guidance: string;
  check: string;
};

const CATEGORIES: readonly Option[] = [
  { id: "respiratory", label: "呼吸用保護具", detail: "粉じん・蒸気・ガス・酸欠が気になる" },
  { id: "fall", label: "墜落・転落対策", detail: "高所・足場・開口部で作業する" },
  { id: "chemical", label: "薬液・化学物質", detail: "手や目、皮膚への付着が気になる" },
  { id: "machine", label: "重機・機械まわり", detail: "接触・巻き込まれ・立入を防ぎたい" },
  { id: "noise", label: "騒音・飛来物", detail: "音、切粉、研削火花、飛散物がある" },
  { id: "foot", label: "足元・移動", detail: "踏抜き、滑り、落下物、つまずきがある" },
] as const;

const TASKS: Record<string, readonly Option[]> = {
  respiratory: [
    { id: "dust", label: "粉じん・研削・清掃", detail: "固体の粉じん、ヒューム、繊維が舞う" },
    { id: "vapor", label: "塗装・洗浄・接着", detail: "有機溶剤などの蒸気・ガスが出る" },
    { id: "confined", label: "マンホール・槽・ピット", detail: "酸欠や有害ガスの可能性がある" },
    { id: "unknown", label: "何が出ているか不明", detail: "SDSや作業環境の情報をまだ確認していない" },
  ],
  fall: [
    { id: "scaffold", label: "足場・屋根・高所", detail: "墜落のおそれがある場所で作業する" },
    { id: "opening", label: "開口部・縁端", detail: "床の穴、端部、昇降口の近くで作業する" },
    { id: "ladder", label: "はしご・脚立", detail: "昇降や短時間の高所作業を行う" },
  ],
  chemical: [
    { id: "splash", label: "薬液の飛散・注入", detail: "液体が手・目・顔にかかるおそれがある" },
    { id: "contact", label: "洗浄・拭取り・配管", detail: "皮膚に触れる時間が長い、または繰り返す" },
    { id: "mix", label: "混合・調製", detail: "複数の薬剤を取り扱う" },
  ],
  machine: [
    { id: "vehicle", label: "重機・フォークリフト周辺", detail: "車両との接触や死角が気になる" },
    { id: "moving", label: "稼働中の機械の近く", detail: "回転体・搬送機・プレス等がある" },
    { id: "restricted", label: "危険区域への立入り", detail: "吊り荷下、旋回範囲、開口部を区画したい" },
  ],
  noise: [
    { id: "grinding", label: "研削・切断・はつり", detail: "騒音と飛散物が同時にある" },
    { id: "loud", label: "大きな機械音", detail: "耳への負担や会話のしづらさがある" },
    { id: "welding", label: "溶接・光を使う作業", detail: "火花や光線から目・顔を守りたい" },
  ],
  foot: [
    { id: "slip", label: "濡れた床・油・段差", detail: "滑り・つまずきの可能性がある" },
    { id: "puncture", label: "釘・金属片・解体材", detail: "踏抜きや足のけがが気になる" },
    { id: "impact", label: "荷役・落下物", detail: "つま先への落下・挟まれが気になる" },
  ],
};

const CONDITIONS: Record<string, readonly Option[]> = {
  respiratory: [
    { id: "ventilated", label: "換気が効いている", detail: "局所排気や十分な換気がある" },
    { id: "limited", label: "換気が弱い・屋内", detail: "濃度や空気の流れを確認したい" },
    { id: "oxygen", label: "酸素濃度が不明・低いおそれ", detail: "密閉空間、槽、ピットなど" },
  ],
  fall: [
    { id: "anchor", label: "取付設備がある", detail: "親綱・フック取付点を確認できる" },
    { id: "no-anchor", label: "取付設備が未確認", detail: "先に足場・手すり・取付方法を整えたい" },
  ],
  chemical: [
    { id: "sds", label: "SDSが手元にある", detail: "対象物質・濃度・使用時間を確認できる" },
    { id: "no-sds", label: "SDS・成分が未確認", detail: "容器表示だけ、または混合物で不明" },
  ],
  machine: [
    { id: "layout", label: "動線を区画できる", detail: "人と車両・機械を分ける場所がある" },
    { id: "shared", label: "人と機械の動線が重なる", detail: "見通しや合図の方法に不安がある" },
  ],
  noise: [
    { id: "short", label: "短時間・断続的", detail: "限定した時間だけ発生する" },
    { id: "long", label: "長時間・毎日", detail: "ばく露の確認と継続対策が必要" },
  ],
  foot: [
    { id: "outdoor", label: "屋外・不整地", detail: "雨天、泥、段差がある" },
    { id: "indoor", label: "屋内・倉庫", detail: "油、水、通路の混雑がある" },
  ],
};

function buildRecommendation(selection: Selection): Recommendation {
  const { category, task, condition } = selection;
  if (category.id === "respiratory") {
    const limitedVentilation = condition.id === "limited";
    if (task.id === "unknown") {
      return {
        title: "危険有害性が分かるまで、製品推薦を保留します",
        summary: "何を吸うおそれがあるか不明な状態では、ろ過式マスクを選べません。SDS・容器表示を入手し、粉じん／蒸気・ガス／酸欠を切り分け、酸素濃度・濃度・換気を確認してから選定を再開してください。",
        officialHref: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121_00005.html",
        officialLabel: "厚生労働省｜化学物質による労働災害防止",
        checks: ["SDSと容器表示を入手する", "入場前に酸素濃度と有害ガスの可能性を確認する", "粉じん・蒸気・ガスを切り分け、濃度・換気・作業時間を確認する"],
        urgent: true,
        withholdPurchase: true,
      };
    }
    if (task.id === "confined" || condition.id === "oxygen") {
      return {
        title: "まず酸素・有害ガスを測るための候補",
        query: "酸素濃度計 ガス検知器 作業用 校正",
        summary: "酸欠や有害ガスのおそれがある場所は、防じん・防毒マスクを先に買う入口ではありません。入る前に測定、換気、監視、救助手順を整えるための機器・体制を確認します。",
        officialHref: MHLW_OXYGEN_RULES_URL,
        officialLabel: "厚生労働省｜酸素欠乏症等防止対策",
        checks: ["酸素濃度と有害ガスを入坑前・作業中に測れるか", "換気、監視人、救助手順を先に決めたか", "必要な呼吸用保護具の方式は責任者・専門家と確認したか"],
        urgent: true,
      };
    }
    if (task.id === "vapor") {
      return {
        title: "有機ガス用防毒マスク（製品群）の購入候補",
        query: `スリーエム ジャパン 面体 6000 有機ガス用吸収缶 6001${limitedVentilation ? " 屋内 換気 濃度測定" : ""}`,
        summary: `塗装・洗浄などの蒸気には、対象物質に合う吸収缶を使う防毒マスクの製品群から探します。粉じん用だけで置き換えず、SDSの記載を基に絞り込みます。${limitedVentilation ? "換気が弱い場所では、購入前に濃度測定と局所排気の改善を優先します。" : ""}`,
        officialHref: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121_00005.html",
        officialLabel: "厚生労働省｜化学物質による労働災害防止",
        checks: ["SDSで対象物質と吸収缶の対象を照合", "国家検定合格標章と面体・吸収缶の組み合わせを確認", "交換時期、フィット、換気対策を確認", ...(limitedVentilation ? ["作業環境の濃度を測定し、局所排気の改善後に必要な防護係数を確認"] : [])],
        verifiedCandidate: {
          name: "3M 面体6000シリーズ＋有機ガス用吸収缶6001",
          maker: "スリーエム ジャパン",
          reason:
            "メーカー公式で6001を有機ガス用・国家検定合格品とし、面体6000シリーズとの組合せを明記。面体サイズと対象物質・濃度の確認が必要です。",
          href: "https://www.3mcompany.jp/3M/ja_JP/p/d/v101817450/",
        },
      };
    }
    return {
      title: "防じんマスク（製品群）の購入候補",
      query: `重松製作所 DD02V-S2-2K DS2 排気弁付${limitedVentilation ? " 屋内 集じん 換気" : ""}`,
      summary: `研削・清掃などの粉じん作業では、国家検定合格表示のある防じんマスクの製品群から、粉じんの性状と作業条件に合うものを探します。${limitedVentilation ? "換気が弱い場所では、集じん・局所排気と濃度確認を先に組み合わせます。" : ""}`,
      officialHref: MHLW_DUST_MASK_GUIDANCE_URL,
      officialLabel: "厚生労働省｜粉じん障害防止対策",
      checks: ["粉じんの種類・濃度・作業時間を確認", "国家検定合格標章とろ過材の区分を確認", "顔への密着、ひげ・眼鏡との干渉、交換時期を確認", ...(limitedVentilation ? ["集じん・局所排気を改善し、改善後の濃度で必要な区分を確認"] : [])],
      verifiedCandidate: {
        name: "DD02V-S2-2K（DS2・排気弁付）",
        maker: "重松製作所",
        reason:
          "メーカー公式の使い捨て式防じんマスク一覧でDS2・排気弁付を確認。顔面との密着性と、対象粉じんに必要な区分を確認して選びます。",
        href: "https://www.sts-japan.com/products/dd/",
      },
    };
  }

  const profiles: readonly RecommendationProfile[] = [
    {
      categoryId: "fall", taskIds: ["scaffold"],
      title: "足場・屋根用フルハーネスの候補", query: "フルハーネス 足場 屋根 新規格 ランヤード",
      summary: "足場・屋根では、作業高さ、移動範囲、落下距離に合うフルハーネスとランヤードを絞ります。",
      officialHref: "https://www.mhlw.go.jp/web/t_doc?dataId=74ab6770&dataType=0&pageNo=1",
      officialLabel: "厚生労働省｜墜落制止用器具の規格",
      checks: ["作業高さ、落下距離、取付点を確認", "使用可能質量とランヤードの仕様を確認", "始業前点検・救助計画を確認"],
      verifiedCandidate: {
        name: "3M DBI-サラ エグゾフィット ライト 1114080N",
        maker: "スリーエム ジャパン",
        reason:
          "メーカー公式で墜落制止用器具の規格適合を確認できるSサイズの具体候補です。体格に応じたサイズ、ランヤード、取付設備、落下距離は別に照合します。",
        href: "https://www.3mcompany.jp/3M/ja_JP/p/d/v100838081/",
      },
    },
    { categoryId: "fall", taskIds: ["opening"], title: "開口部を塞ぐ養生・手すりの候補", query: "開口部 養生 手すり 親綱 支柱 転落防止", summary: "開口部・縁端では、個人用保護具より先に蓋・囲い・手すりで落下経路をなくす候補を絞ります。", officialHref: "https://www.mhlw.go.jp/web/t_doc?dataId=74ab6770&dataType=0&pageNo=1", officialLabel: "厚生労働省｜墜落制止用器具の規格", checks: ["開口部を固定蓋または手すりで塞げるか", "蓋の固定・表示と復旧責任者を確認", "残る危険に対する取付点と器具を確認"] },
    { categoryId: "fall", taskIds: ["ladder"], title: "脚立・はしごの安定対策候補", query: "脚立 はしご 転倒防止 アウトリガー 作業用", summary: "脚立・はしごでは、より安全な作業床への置換を検討し、使用する場合は安定・固定用品を絞ります。", officialHref: "https://www.mhlw.go.jp/web/t_doc?dataId=74ab6770&dataType=0&pageNo=1", officialLabel: "厚生労働省｜墜落制止用器具の規格", checks: ["作業台・足場に置き換えられないか", "設置角度、天板使用禁止、転位防止を確認", "昇降時に三点支持を保てるか"] },
    {
      categoryId: "chemical", taskIds: ["splash"], title: "薬液飛散用ゴーグル・フェイスシールド候補", query: "薬液 ゴーグル フェイスシールド 間接通気", summary: "注入・移し替えでは、正面・側面からの飛沫を防ぐ目・顔面保護具を中心に絞ります。",
      officialHref: "https://www.mhlw.go.jp/content/11300000/001670143.pdf",
      officialLabel: "厚生労働省｜保護具の選定マニュアル",
      checks: ["SDSの眼・皮膚有害性を確認", "ゴーグルと顔面保護を組み合わせる必要を確認", "緊急洗眼・シャワーまでの動線を確認"],
    },
    { categoryId: "chemical", taskIds: ["contact"], title: "長時間接触用の化学防護手袋候補", query: "化学防護手袋 耐透過 長時間 洗浄", summary: "洗浄・拭取りでは、対象物質と接触時間に合う耐透過・耐劣化データのある手袋を絞ります。", officialHref: "https://www.mhlw.go.jp/content/11300000/001670143.pdf", officialLabel: "厚生労働省｜保護具の選定マニュアル", checks: ["SDSの物質名・濃度・接触時間を確認", "メーカーの耐透過時間と劣化データを照合", "交換頻度と脱着・廃棄手順を決める"] },
    { categoryId: "chemical", taskIds: ["mix"], title: "混合・調製用の全身防護候補", query: "化学防護服 エプロン ゴーグル 耐薬品 混合", summary: "混合・調製では反応・発熱・飛散範囲も確認し、手・目だけでなく衣類を含む防護を絞ります。", officialHref: "https://www.mhlw.go.jp/content/11300000/001670143.pdf", officialLabel: "厚生労働省｜保護具の選定マニュアル", checks: ["混合禁止・反応性・発熱をSDSで確認", "飛散範囲に応じた手・目・顔・身体の防護を確認", "局所排気と緊急時手順を確認"] },
    {
      categoryId: "machine", taskIds: ["vehicle"], title: "車両接近警報・動線分離用品の候補", query: "フォークリフト 接近警報 人車分離 LED ライン", summary: "重機・フォークリフトでは、人車分離を基本に死角を補う警報・表示用品を絞ります。",
      officialHref: NETIS_SEARCH_URL,
      officialLabel: "国土交通省｜NETIS公式検索",
      checks: ["人と車両の動線を物理的に分けられるか", "死角・後退・交差箇所を現地確認", "警報の検知範囲と停止ルールを確認"],
    },
    { categoryId: "machine", taskIds: ["moving"], title: "機械停止・ロックアウト用品の候補", query: "ロックアウト タグアウト キット 機械 メンテナンス", summary: "回転体・搬送機・プレスでは、接近警報ではなく停止・隔離・施錠を軸に用品を絞ります。", officialHref: NETIS_SEARCH_URL, officialLabel: "国土交通省｜NETIS公式検索", checks: ["清掃・調整・復旧時に動力を遮断できるか", "残留エネルギーと再起動を防げるか", "施錠者と解除手順を決めたか"] },
    { categoryId: "machine", taskIds: ["restricted"], title: "危険区域の区画・立入表示候補", query: "立入禁止 バリケード コーンバー 危険区域 表示", summary: "吊り荷下・旋回範囲などには、境界が一目で分かり勝手に外れにくい区画用品を絞ります。", officialHref: NETIS_SEARCH_URL, officialLabel: "国土交通省｜NETIS公式検索", checks: ["危険区域を現場で見える形にできるか", "区画の移設・解除権限を決めたか", "多言語表示と夜間視認性を確認"] },
    {
      categoryId: "noise", taskIds: ["grinding"], title: "研削用の耳・目・顔面保護候補", query: "研削 フェイスシールド 保護めがね イヤーマフ", summary: "研削・切断では、騒音に加えて高速飛来物から目・顔を守る組合せを絞ります。",
      officialHref: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc7618&dataType=1&pageNo=1",
      officialLabel: "厚生労働省｜騒音障害防止ガイドライン",
      checks: ["砥石・切粉の飛散方向を確認", "保護めがねとフェイスシールドの併用を確認", "騒音値と必要な遮音性能を確認"],
    },
    { categoryId: "noise", taskIds: ["loud"], title: "騒音レベルに合う耳栓・イヤーマフ候補", query: "耳栓 イヤーマフ SNR NRR 工場 騒音", summary: "大きな機械音では、測定値とばく露時間に合い、警報・会話も考慮できる聴覚保護具を絞ります。", officialHref: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc7618&dataType=1&pageNo=1", officialLabel: "厚生労働省｜騒音障害防止ガイドライン", checks: ["騒音値とばく露時間を測る", "必要以上の遮音で警報を聞き逃さないか確認", "耳栓の装着教育と衛生管理を確認"] },
    { categoryId: "noise", taskIds: ["welding"], title: "溶接光・火花用の遮光面候補", query: "溶接面 自動遮光 遮光度 保護めがね", summary: "溶接では、工程に合う遮光度と火花への耐性を備えた面・保護めがねを絞ります。", officialHref: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc7618&dataType=1&pageNo=1", officialLabel: "厚生労働省｜騒音障害防止ガイドライン", checks: ["溶接方法・電流に合う遮光度を確認", "側方光・飛散物への保護範囲を確認", "呼吸用保護具・ヘルメットとの干渉を確認"] },
    {
      categoryId: "foot", taskIds: ["slip"], title: "床面に合う耐滑作業靴候補", query: "耐滑 作業靴 油 水 SRC 厨房 倉庫", summary: "濡れ・油のある床では、床材と汚れに合う耐滑性と靴底形状を軸に絞ります。",
      officialHref: MHLW_SAFETY_FOOTWEAR_URL,
      officialLabel: "厚生労働省｜労働安全衛生規則（履物）",
      checks: ["水・油・粉体など滑りの原因を確認", "床材に合う耐滑性能と靴底を確認", "清掃方法と靴底の交換基準を決める"],
    },
    { categoryId: "foot", taskIds: ["puncture"], title: "踏抜き防止板入り安全靴候補", query: "踏抜き防止 安全靴 踏抜き抵抗 解体", summary: "釘・金属片・解体材には、靴底の踏抜き抵抗を確認できる安全靴を絞ります。", officialHref: MHLW_SAFETY_FOOTWEAR_URL, officialLabel: "厚生労働省｜労働安全衛生規則（履物）", checks: ["釘・金属片の長さと散在範囲を確認", "踏抜き抵抗を示す規格・仕様を確認", "中敷きだけに頼らず靴全体の適合を確認"] },
    { categoryId: "foot", taskIds: ["impact"], title: "先芯・甲プロテクタ付き安全靴候補", query: "安全靴 先芯 甲プロテクタ 荷役 JIS", summary: "荷役・落下物には、つま先保護と必要に応じ甲部保護を備える安全靴を絞ります。", officialHref: MHLW_SAFETY_FOOTWEAR_URL, officialLabel: "厚生労働省｜労働安全衛生規則（履物）", checks: ["落下物の重量・形状と挟まれ箇所を確認", "先芯・甲プロテクタの規格を確認", "サイズ、足幅、歩行時の安定性を確認"] },
  ];

  const conditionProfiles: readonly ConditionProfile[] = [
    { categoryId: "fall", conditionIds: ["anchor"], label: "取付設備を確認済み", queryTerms: "取付点 適合", guidance: "取付点の位置と強度を確認し、落下距離に合う器具へ絞ります。", check: "取付設備の位置・強度・使用人数を記録する" },
    { categoryId: "fall", conditionIds: ["no-anchor"], label: "取付設備は未確認", queryTerms: "仮設手すり 親綱 支柱", guidance: "個人用保護具の購入より先に、作業床・手すり・親綱と取付方法を計画します。", check: "取付点が確定するまで高所作業を開始しない" },
    { categoryId: "chemical", conditionIds: ["sds"], label: "SDS照合が可能", queryTerms: "耐透過 データ", guidance: "SDSの物質名・濃度をメーカーの耐透過表と照合して候補を狭めます。", check: "SDSの版、物質名、濃度を製品選定記録に残す" },
    { categoryId: "chemical", conditionIds: ["no-sds"], label: "成分確認を優先", queryTerms: "SDS 取り寄せ 保護具", guidance: "成分不明のまま材質を決めず、供給者からSDSを入手するまで暫定措置を取ります。", check: "SDS入手前は接触・混合を避け、責任者に確認する" },
    { categoryId: "machine", conditionIds: ["layout"], label: "物理分離できる現場", queryTerms: "固定柵 ガードレール", guidance: "警報だけに頼らず、固定柵や専用通路による物理分離を優先します。", check: "区画が作業中に外されない固定方法を確認する" },
    { categoryId: "machine", conditionIds: ["shared"], label: "交差動線を重点対策", queryTerms: "交差点 センサー 警告灯", guidance: "動線が重なる箇所を限定し、一時停止・合図・検知を組み合わせます。", check: "交差点ごとの優先ルールと停止位置を表示する" },
    { categoryId: "noise", conditionIds: ["short"], label: "短時間作業向け", queryTerms: "着脱 短時間", guidance: "着脱しやすさと確実な装着を重視し、短時間でも保護具なしの作業をなくします。", check: "作業開始前から終了まで装着できる運用を確認する" },
    { categoryId: "noise", conditionIds: ["long"], label: "長時間ばく露向け", queryTerms: "長時間 低圧迫 測定", guidance: "測定と工学的対策を優先し、長時間装着できる圧迫感・通気性も確認します。", check: "個人ばく露測定と休止・ローテーションを検討する" },
    { categoryId: "foot", conditionIds: ["outdoor"], label: "屋外・不整地向け", queryTerms: "防水 不整地 ラグソール", guidance: "泥・雨・傾斜で目詰まりしにくい靴底と防水性を軸に絞ります。", check: "泥・雨天・斜面でのグリップと足首支持を確認する" },
    { categoryId: "foot", conditionIds: ["indoor"], label: "屋内・倉庫向け", queryTerms: "倉庫 油床 軽量", guidance: "床面の油・水への耐滑性と、長時間歩行の負担を軸に絞ります。", check: "床材・油への耐滑性と通路での取り回しを確認する" },
  ];

  const profile = profiles.find((item) => item.categoryId === category.id && item.taskIds.includes(task.id));
  const conditionProfile = conditionProfiles.find((item) => item.categoryId === category.id && item.conditionIds.includes(condition.id));
  if (!profile || !conditionProfile) {
    throw new Error(`Safety goods recommendation profile is missing: ${category.id}/${task.id}/${condition.id}`);
  }
  const verifiedCandidate = category.id === "fall" && task.id === "scaffold" && condition.id === "anchor" ? profile.verifiedCandidate : undefined;
  return {
    ...profile,
    title: `${profile.title}｜${conditionProfile.label}`,
    query: verifiedCandidate
      ? `${verifiedCandidate.maker} ${verifiedCandidate.name}`
      : `${profile.query} ${conditionProfile.queryTerms}`,
    summary: `${profile.summary}${conditionProfile.guidance}`,
    checks: [...profile.checks, conditionProfile.check],
    verifiedCandidate,
  };
}

function affiliateClick(platform: "amazon" | "rakuten", recommendation: Recommendation) {
  trackEvent("affiliate_click", {
    platform,
    product_id: `wizard-${recommendation.query ?? "withheld"}`,
    product_name: recommendation.title,
    page_location: "goods_selection_wizard",
  });
}

export function SafetyGoodsWizard() {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [conditionId, setConditionId] = useState<string | null>(null);

  const category = CATEGORIES.find((item) => item.id === categoryId) ?? null;
  const task = category ? TASKS[category.id].find((item) => item.id === taskId) ?? null : null;
  const condition = category ? CONDITIONS[category.id].find((item) => item.id === conditionId) ?? null : null;
  const recommendation = useMemo(
    () => (category && task && condition ? buildRecommendation({ category, task, condition }) : null),
    [category, task, condition],
  );

  function chooseCategory(id: string) {
    setCategoryId(id);
    setTaskId(null);
    setConditionId(null);
  }

  function reset() {
    setCategoryId(null);
    setTaskId(null);
    setConditionId(null);
  }

  const step = recommendation ? 4 : condition ? 4 : task ? 3 : category ? 2 : 1;
  const options = !category ? CATEGORIES : !task ? TASKS[category.id] : CONDITIONS[category.id];
  const prompt = !category
    ? "1. どの危険がいちばん近いですか？"
    : !task
      ? "2. どんな作業ですか？"
      : "3. 現場の条件は？";

  return (
    <section aria-labelledby="goods-wizard-title" className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 px-5 py-6 text-white sm:px-7">
        <p className="text-xs font-black tracking-[.16em] text-emerald-100">PPE PICKER</p>
        <h2 id="goods-wizard-title" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">3つ選んで保護具候補を見る</h2>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-emerald-50">カテゴリ → 作業 → 現場条件の3つを選ぶだけ。型式を決め打ちせず、確認すべき条件と購入検索を一緒に出します。</p>
      </div>

      <div className="p-5 sm:p-7">
        <ol className="grid grid-cols-4 gap-1 text-center text-[11px] font-black sm:gap-2 sm:text-xs" aria-label="選定の手順">
          {["危険", "作業", "条件", "候補"].map((label, index) => (
            <li key={label} className={`rounded-full px-2 py-2 ${step >= index + 1 ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}. {label}</li>
          ))}
        </ol>

        {!recommendation ? (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">{prompt}</h3>
              {category ? <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-bold text-slate-600 hover:bg-slate-100"><RotateCcw className="h-3.5 w-3.5" />最初から</button> : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => !category ? chooseCategory(option.id) : !task ? setTaskId(option.id) : setConditionId(option.id)}
                  className="group min-h-28 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                >
                  <span className="flex items-start justify-between gap-3"><span className="text-base font-black text-slate-950 group-hover:text-emerald-900">{option.label}</span><span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-emerald-700 group-hover:text-white">›</span></span>
                  <span className="mt-2 block text-sm leading-6 text-slate-600">{option.detail}</span>
                </button>
              ))}
            </div>
            {category ? <button type="button" onClick={() => { setTaskId(null); setConditionId(null); setCategoryId(null); }} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-emerald-800 hover:underline"><ArrowLeft className="h-4 w-4" />危険の選択に戻る</button> : null}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-black tracking-[.14em] text-emerald-800"><ShieldCheck className="h-4 w-4" />YOUR NEXT STEP</p>
                <h3 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">{recommendation.title}</h3>
              </div>
              <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-700 bg-white px-3 text-sm font-black text-emerald-800 hover:bg-emerald-100"><RotateCcw className="h-4 w-4" />選び直す</button>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{recommendation.summary}</p>
            {recommendation.verifiedCandidate ? (
              <div className="mt-4 rounded-2xl border-2 border-emerald-700 bg-white p-4">
                <p className="text-xs font-black tracking-[.12em] text-emerald-800">
                  公式情報を確認した具体候補
                </p>
                <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-black text-slate-950">
                      {recommendation.verifiedCandidate.name}
                    </h4>
                    <p className="text-xs font-bold text-slate-600">
                      {recommendation.verifiedCandidate.maker}
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                      {recommendation.verifiedCandidate.reason}
                    </p>
                  </div>
                  <a
                    href={recommendation.verifiedCandidate.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-700 px-4 text-sm font-black text-emerald-900 hover:bg-emerald-50"
                  >
                    メーカー公式
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            ) : null}
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs font-black tracking-[.12em] text-slate-700">購入前に見ること</p>
                <ul className="mt-2 space-y-2">
                  {recommendation.checks.map((check) => <li key={check} className="flex gap-2 text-sm leading-6 text-slate-800"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />{check}</li>)}
                </ul>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                <a href={recommendation.officialHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 text-sm font-black text-emerald-900 hover:bg-emerald-100">公式資料 <ExternalLink className="h-4 w-4" /></a>
                {recommendation.withholdPurchase ? (
                  <a href="/contact/automation-email?subject=ppe-selection" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-sm font-black text-white hover:bg-emerald-900 sm:col-span-2 lg:col-span-1"><ShieldCheck className="h-4 w-4" />選定を相談する</a>
                ) : recommendation.query ? (
                  <>
                    <a href={generateAmazonAffiliateUrl(recommendation.query)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => affiliateClick("amazon", recommendation)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-black text-white hover:bg-amber-800"><Search className="h-4 w-4" />Amazonで候補を見る</a>
                    <a href={generateRakutenSearchUrl(recommendation.query)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => affiliateClick("rakuten", recommendation)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-black text-white hover:bg-rose-800"><Search className="h-4 w-4" />楽天で候補を見る</a>
                  </>
                ) : null}
              </div>
            </div>
            <p className={`mt-5 rounded-xl px-4 py-3 text-xs font-semibold leading-6 ${recommendation.urgent ? "bg-rose-100 text-rose-950" : "bg-white text-slate-700"}`}>
              {recommendation.withholdPurchase ? "危険有害性が特定できるまで、通販の商品候補は表示しません。SDS・酸素濃度・作業環境を確認し、判断できない場合は専門家へ相談してください。" : recommendation.urgent ? "酸欠・有害ガスのおそれがある場所では、安易に入らず、測定・換気・監視・救助手順を先に確認してください。" : "これは選んだ条件からの購入候補（製品群）です。型式・規格・価格・在庫・適合性は、公式資料と製品説明で購入前に確認してください。"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

import { getGoodsProductFeature } from '@/data/goods-product-features';
const MHLW_OXYGEN_RULES_URL =
  "https://anzeninfo.mhlw.go.jp/horei/hor1-45/hor1-45-33-1-5.html";
const MHLW_DUST_MASK_GUIDANCE_URL =
  "https://www.mhlw.go.jp/web/t_doc?dataId=00tc2747&dataType=1";
const MHLW_SAFETY_FOOTWEAR_URL =
  "https://www.mhlw.go.jp/web/t_doc?dataId=74003000&dataType=0&pageNo=9";
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

function photoCategoryId(categoryId: string, taskId: string): string {
  if (categoryId === "respiratory") return taskId === "confined" ? "gas-detectors" : "respiratory";
  if (categoryId === "fall") return taskId === "scaffold" ? "fall-protection" : "fall-accessories";
  if (categoryId === "chemical") return taskId === "splash" ? "eye-face-protection" : taskId === "mix" ? "chemical-clothing" : "chemical-gloves";
  if (categoryId === "machine") return taskId === "moving" ? "machine-lockout" : "signs-barriers";
  if (categoryId === "noise") return taskId === "loud" ? "hearing" : "eye-face-protection";
  return "safety-footwear";
}

function photoFeatureId(categoryId: string, taskId: string): string | undefined {
  if (categoryId === "respiratory") return taskId === "dust" ? "dust" : taskId === "vapor" ? "gas" : undefined;
  if (categoryId === "fall" && taskId === "scaffold") return "harness";
  if (categoryId === "chemical" && taskId === "splash") return "splash";
  if (categoryId === "chemical" && taskId === "contact") return "cleaning";
  if (categoryId === "chemical" && taskId === "mix") return "splash";
  if (categoryId === "noise" && taskId === "welding") return "light";
  if (categoryId === "noise" && taskId === "grinding") return "impact";
  if (categoryId === "foot") return taskId === "impact" ? "toe" : taskId;
  if (categoryId === "noise" && taskId === "loud") return "earplugs";
  return undefined;
}

export const CATEGORIES: readonly Option[] = [
  { id: "respiratory", label: "呼吸用保護具", detail: "粉じん・蒸気・ガス・酸欠が気になる" },
  { id: "fall", label: "墜落・転落対策", detail: "高所・足場・開口部で作業する" },
  { id: "chemical", label: "薬液・化学物質", detail: "手や目、皮膚への付着が気になる" },
  { id: "machine", label: "重機・機械まわり", detail: "接触・巻き込まれ・立入を防ぎたい" },
  { id: "noise", label: "騒音・飛来物", detail: "音、切粉、研削火花、飛散物がある" },
  { id: "foot", label: "足元・移動", detail: "踏抜き、滑り、落下物、つまずきがある" },
] as const;

export const TASKS: Record<string, readonly Option[]> = {
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

export const CONDITIONS: Record<string, readonly Option[]> = {
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
  if (category.id === "chemical" && condition.id === "no-sds") {
    return {
      title: "成分が分かるまで、保護具の購入候補を保留します",
      summary: "対象物質・濃度・接触時間が不明なままでは、手袋や防護服の耐透過性を照合できません。供給者からSDSを入手し、作業と飛散範囲を確認してください。",
      officialHref: "https://www.mhlw.go.jp/content/11300000/001670143.pdf",
      officialLabel: "厚生労働省｜皮膚障害等防止用保護具の選定マニュアル",
      checks: ["供給者からSDSと物質名・濃度を入手する", "接触時間・飛散範囲・混合の有無を確認する", "保護具の素材と耐透過データを責任者と照合する"],
      urgent: true,
      withholdPurchase: true,
    };
  }
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
    { categoryId: "fall", taskIds: ["opening"], title: "開口部を塞ぐ養生・手すりの候補", query: "開口部 養生 手すり 親綱 支柱 転落防止", summary: "開口部・縁端では、個人用保護具より先に蓋・囲い・手すりで落下経路をなくす候補を絞ります。", officialHref: "https://www.mhlw.go.jp/web/t_doc?dataId=74003000&dataType=0&pageNo=9", officialLabel: "厚生労働省｜労働安全衛生規則第519条（開口部等）", checks: ["開口部を固定蓋または手すりで塞げるか", "蓋の固定・表示と復旧責任者を確認", "残る危険に対する取付点と器具を確認"] },
    { categoryId: "fall", taskIds: ["ladder"], title: "脚立・はしごの安定対策候補", query: "脚立 はしご 転倒防止 アウトリガー 作業用", summary: "脚立・はしごでは、より安全な作業床への置換を検討し、使用する場合は安定・固定用品を絞ります。", officialHref: "https://www.mhlw.go.jp/new-info/kobetu/roudou/gyousei/anzen/dl/170322-1.pdf", officialLabel: "厚生労働省｜はしご・脚立の安全使用", checks: ["作業台・足場に置き換えられないか", "設置角度、天板使用禁止、転位防止を確認", "昇降時に三点支持を保てるか"] },
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
      officialHref: "https://www.mhlw.go.jp/content/11300000/000628483.pdf",
      officialLabel: "厚生労働省｜フォークリフトの接触防止（安衛則第151条の7）",
      checks: ["人と車両の動線を物理的に分けられるか", "死角・後退・交差箇所を現地確認", "警報の検知範囲と停止ルールを確認"],
    },
    { categoryId: "machine", taskIds: ["moving"], title: "機械停止・ロックアウト用品の候補", query: "ロックアウト タグアウト キット 機械 メンテナンス", summary: "回転体・搬送機・プレスでは、接近警報ではなく停止・隔離・施錠を軸に用品を絞ります。", officialHref: "https://www.mhlw.go.jp/web/t_doc?dataId=74003000&dataType=0&pageNo=4", officialLabel: "厚生労働省｜労働安全衛生規則第107・108条（掃除等の運転停止）", checks: ["清掃・調整・復旧時に動力を遮断できるか", "残留エネルギーと再起動を防げるか", "施錠者と解除手順を決めたか"] },
    { categoryId: "machine", taskIds: ["restricted"], title: "危険区域の区画・立入表示候補", query: "立入禁止 バリケード コーンバー 危険区域 表示", summary: "吊り荷下・旋回範囲などには、境界が一目で分かり勝手に外れにくい区画用品を絞ります。", officialHref: "https://www.mhlw.go.jp/content/11300000/001124694.pdf", officialLabel: "厚生労働省｜危険区域の立入禁止措置", checks: ["危険区域を現場で見える形にできるか", "区画の移設・解除権限を決めたか", "多言語表示と夜間視認性を確認"] },
    {
      categoryId: "noise", taskIds: ["grinding"], title: "研削用の耳・目・顔面保護候補", query: "研削 フェイスシールド 保護めがね イヤーマフ", summary: "研削・切断では、騒音に加えて高速飛来物から目・顔を守る組合せを絞ります。",
      officialHref: "https://www.mhlw.go.jp/content/11300000/000609001.pdf",
      officialLabel: "厚生労働省｜研削作業時の保護めがね",
      checks: ["砥石・切粉の飛散方向を確認", "保護めがねとフェイスシールドの併用を確認", "騒音値と必要な遮音性能を確認"],
    },
    { categoryId: "noise", taskIds: ["loud"], title: "騒音レベルに合う耳栓・イヤーマフ候補", query: "耳栓 イヤーマフ SNR NRR 工場 騒音", summary: "大きな機械音では、測定値とばく露時間に合い、警報・会話も考慮できる聴覚保護具を絞ります。", officialHref: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc7618&dataType=1&pageNo=1", officialLabel: "厚生労働省｜騒音障害防止ガイドライン", checks: ["騒音値とばく露時間を測る", "必要以上の遮音で警報を聞き逃さないか確認", "耳栓の装着教育と衛生管理を確認"] },
    { categoryId: "noise", taskIds: ["welding"], title: "溶接光・火花用の遮光面候補", query: "溶接面 自動遮光 遮光度 保護めがね", summary: "溶接では、工程に合う遮光度と火花への耐性を備えた面・保護めがねを絞ります。", officialHref: "https://www.mhlw.go.jp/content/11300000/001411590.pdf", officialLabel: "厚生労働省｜溶接・熱切断時の有害光線対策", checks: ["溶接方法・電流に合う遮光度を確認", "側方光・飛散物への保護範囲を確認", "呼吸用保護具・ヘルメットとの干渉を確認"] },
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



export type SafetyQuestion = { id: string; title: string; detail: string; check: string; prohibition?: string };
const question = (id: string, title: string, detail: string, check: string, prohibition?: string): SafetyQuestion => ({ id, title, detail, check, prohibition });
export const PPE_REQUIREMENTS: Record<string, readonly SafetyQuestion[]> = {
 respiratory: [
  question('oxygen', '酸素濃度を測りましたか？', '測定結果と、作業中も変化しないかを確認。18%以上だけで適合は決まりません。', '管理者に酸素測定の記録・測定位置・測定時刻と作業中の監視方法を確認する。', '酸素18%未満、酸欠のおそれ、測定未確認では、ろ過式の防じん・防毒マスクを使わない。安易に入らない。'),
  question('substance', '吸い込む物質は特定できていますか？', 'SDSの物質名・成分と、粉じん／ガス・蒸気を確認。', '供給者から最新SDSを入手し、成分と発生する有害物を管理者に確認する。'),
  question('concentration', '濃度と必要な防護性能を確認しましたか？', 'SDSの濃度と、実際に吸う空気の濃度は別です。', '測定担当者に呼吸域のばく露濃度とばく露限界、要求防護係数・指定防護係数の照合を依頼する。'),
  question('mixture', '粉じん・ガス・油ミストの混在は？', '混在の有無と、両機能・オイルミストに合う区分を照合。', '粉じんとガス・蒸気の併存、オイルミストを確認し、メーカー指定の機能・組合せを責任者と照合する。', '防じんマスクはガス・蒸気を除去できません。混在時は各有害物に必要な機能を照合する。'),
  question('emergency', '緊急・救助の用途ではありませんか？', '通常作業と、緊急・救助用の装備は選定を分けます。', '緊急・救助なら通常の商品検索を止め、管理者と救助計画・専門装備を確認する。', '緊急・救助に通常作業用の候補を流用しない。'),
  question('supplied', '給気式が必要か、担当者と確認しましたか？', '高濃度・酸欠などでは、ろ過式を選べない場合があります。', '保護具着用管理責任者に給気式の要否を確認する。必要な場合は供給空気・設備・指定防護係数・救助手順を専門担当者と計画する。', '給気式ならどの型式でも使えるわけではありません。酸欠で使えない型式もあります。'),
  question('fit', '密着性と交換計画まで照合しましたか？', '面体のサイズ、ひげ・眼鏡、対象吸収缶、温湿度を確認。', '面体のフィット、国家検定合格標章と指定組合せ、対象物質用吸収缶・破過特性・交換計画をメーカー取扱説明書で照合する。'),
 ],
 fall: [
  question('size', '身長・体格に合うサイズですか？', 'サイズ表と試着で確認。Sサイズなどを一律に選びません。', 'メーカーの身長・体格別サイズ表と試着で、ベルトの調整範囲・装着状態を担当者に確認してもらう。'),
  question('mass', '体重＋装備の質量を照合しましたか？', '工具や衣服も含め、器具に表示された使用可能質量以内か確認。', '体重と装備（工具・衣服等）を合算し、ハーネス・ランヤードの使用可能質量表示を照合する。'),
  question('clearance', '落下しても下の床・障害物に届きませんか？', '作業高さ、自由落下距離、取付点、下部空間を確認。', '現場で取付点位置と下の床・障害物までの距離を測り、メーカーの落下距離・ショックアブソーバの伸び・必要空間と照合する。', 'フルハーネスでも下の床や障害物に届く条件では使えません。高さだけで適合を判断しない。'),
  question('combination', '取付点と器具の組合せを照合しましたか？', '取付点の強度・使用人数、ランヤードの種別まで確認。', '取付設備の位置・強度・使用人数、メーカー指定組合せとショックアブソーバ種別を確認する。'),
  question('rescue', '始業前点検と救助方法を決めましたか？', '損傷・使用期限と、宙づり時に救助する体制を確認。', '損傷・使用期限・点検記録、必要な教育、宙づり時の救助計画を管理者と確認する。'),
 ],
 chemical: [
  question('substance', '物質名・混合成分・濃度は分かりますか？', 'SDSがあるだけでなく、実際の使用液を確認。', 'SDSの成分・濃度と、希釈後の使用濃度・混合物の全成分を供給者に確認する。'),
  question('exposure', '接触時間・頻度・温度を確認しましたか？', '飛沫、浸漬、繰り返し使用では条件が異なります。', '作業を観察し、接触時間・頻度・温度、液体／粉じん／ガスの形態と飛散範囲を記録する。'),
  question('performance', 'その製品の耐透過・耐浸透性を照合しましたか？', '素材名だけでは選べません。製品・厚み・縫い目まで確認。', 'メーカーに物質・濃度・温度・使用時間を伝え、製品と厚みごとの耐透過・耐浸透（穴・縫い目）・耐劣化データを確認する。'),
  question('replacement', '交換・脱着・廃棄の手順を決めましたか？', '試験の破過時間を、そのまま使用可能時間にはしません。', '責任者と余裕のある使用可能時間・交換頻度を設定し、汚染面に触れない脱着とSDSに沿った廃棄、洗眼・シャワーを確認する。', '見た目が無傷でも透過は起こります。洗浄・乾燥や作業の中断で使用可能時間は延長しません。'),
 ],
 machine: [question('separation', '隔離・停止の方法を確認しましたか？', '警報や保護具だけに頼らず、人と機械を分けます。', '固定柵・専用通路、停止と起動防止、合図・立入管理を管理者と確認する。', '回転部の近くで手袋を使うと巻き込まれるおそれがあります。停止・隔離を優先する。')],
 noise: [question('performance', '音・飛散物・光に合う性能を確認しましたか？', '騒音測定とばく露時間、耐衝撃性や遮光度を確認。', '騒音測定・ばく露時間と遮音値、警報の聞こえ方を照合する。研削は耐衝撃性、溶接は作業に合う遮光度・顔面保護と他の保護具との干渉を確認する。')],
 foot: [question('performance', '床と危険に合う性能・サイズですか？', '先芯、踏抜き防止、耐滑性は別の性能です。', '床の水・油・傾斜、貫通物・落下物と必要な保護性能を照合し、サイズ・装着性・靴底の摩耗を確認する。')],
};

export const PPE_WORK_IMAGES: Record<string, string> = {
 respiratory: '/safety-images/library/previews/dust-mask-required.webp',
 fall: '/safety-images/library/previews/fall-hazard.webp',
 chemical: '/safety-images/library/previews/protective-gloves-required.webp',
 machine: '/safety-images/library/previews/forklift-hazard.webp',
 noise: '/safety-images/library/previews/earplugs-required.webp',
 foot: '/safety-images/library/previews/trip-fall-hazard.webp',
};
export const PPE_WORK_LABELS: Record<string, string> = {
 respiratory: '粉じん・ガスを吸う作業', fall: '高所・足場の作業', chemical: '薬液を扱う作業',
 machine: '車両・機械の近く', noise: '音・切粉・溶接光', foot: '滑り・踏抜き・落下物',
};
export const PPE_DIRECTORY_ROUTES: Record<string, string> = {
 'fall-protection': 'fall', 'fall-accessories': 'fall', respiratory: 'respiratory',
 'chemical-gloves': 'chemical', 'chemical-clothing': 'chemical',
};

export function getPpeDirectoryRoute(categoryId: string, featureId: string | null) {
 return categoryId === 'eye-face-protection' && featureId === 'splash' ? 'chemical' : PPE_DIRECTORY_ROUTES[categoryId];
}

export function getPpeQuestions(categoryId: string) { return PPE_REQUIREMENTS[categoryId] ?? []; }
export function getPpeResult(answers: readonly string[]) {
 const category = CATEGORIES.find(item => item.id === answers[0]);
 const task = category && TASKS[category.id]?.find(item => item.id === answers[1]);
 if (!category || !task) return null;
 const conditions = CONDITIONS[category.id] ?? [];
 const condition = conditions.find(item => item.id === answers[2]);
 const questions = getPpeQuestions(category.id);
 const pending = questions.filter((_, i) => answers[i + 3] !== 'confirmed');
 const baseReasons: string[] = [];
 if (!condition) baseReasons.push('現場条件が未回答・未確認です。作業場所と設備の状況を管理者に確認してください。');
 if (category.id === 'fall' && condition?.id === 'no-anchor') baseReasons.push('取付設備が未確認です。高所作業を開始せず、作業床・手すりと取付点の位置・強度・使用人数を管理者に確認してください。');
 if (category.id === 'chemical' && condition?.id === 'no-sds') baseReasons.push('SDS・成分が未確認です。供給者から最新SDSと物質名・濃度・混合成分を入手してください。');
 if (category.id === 'respiratory') {
  if (task.id === 'unknown') baseReasons.push('吸い込む有害物が特定できていません。供給者のSDS・容器表示と作業時の発生物を確認し、測定担当者にばく露濃度の確認を依頼してください。');
  if (task.id === 'confined') baseReasons.push('槽・ピット等では酸欠・有害ガスのおそれがあります。安易に入らず、入場前と作業中の酸素・有害ガス測定、換気、監視、救助手順を管理者に確認してください。');
  if (condition?.id === 'oxygen') baseReasons.push('酸素濃度が不明、または酸欠のおそれがあります。立入りとろ過式マスクの選定を止め、管理者に酸素・有害ガス測定と必要な設備・保護具の確認を依頼してください。');
 }
 const basePending = baseReasons.length > 0;
 const recommendation = buildRecommendation({ category, task, condition: condition ?? conditions[0] });
 const categoryId = photoCategoryId(category.id, task.id);
 const featureId = photoFeatureId(category.id, task.id);
 const feature = getGoodsProductFeature(categoryId, featureId ?? null);
 // Reuse existing task/category mapping and official checks; do not reuse a SKU or assume fit.
 const types: Record<string, string> = {
  respiratory: task.id === 'dust' ? '防じんマスクの種類を検討' : task.id === 'vapor' ? '防毒マスクの種類を検討' : '呼吸用保護具の方式を専門担当者と検討',
  fall: task.id === 'scaffold' ? '墜落制止用器具・取付設備' : task.id === 'opening' ? '開口部の固定蓋・手すりを優先' : '作業台・足場への置換を優先',
  chemical: task.id === 'splash' ? '化学用ゴーグル・顔面保護＋手・身体の防護' : task.id === 'contact' ? '化学防護手袋＋必要範囲の身体保護' : '手・目・顔・身体の化学防護',
  machine: task.id === 'moving' ? '停止・起動防止・固定ガードを優先' : '人車分離・立入管理を優先',
  noise: task.id === 'welding' ? '作業に合う遮光面・目と顔の保護' : task.id === 'loud' ? '耳栓・イヤーマフ' : '目・顔の保護＋聴覚保護具',
  foot: task.id === 'puncture' ? '踏抜き防止性能のある靴' : task.id === 'impact' ? '先芯の保護性能がある安全靴' : '床に合う耐滑性能のある靴',
 };
 const missing = [...baseReasons, ...pending.map(q => q.check)];
 const blocked = basePending || pending.length > 0;
 return {
  category, task, condition, questions, pending, blocked, missing, categoryId, featureId,
  title: types[category.id],
  importantConditions: category.id === 'respiratory' ? [
   '国家検定合格標章とメーカー指定組合せ。物質・ばく露濃度に合う機能、必要な防護係数・区分を照合。',
   '粉じん・ガス・オイルミストの混在、酸素濃度、面体の密着性、吸収缶の対象物質と交換計画を確認。',
  ] : category.id === 'fall' ? [
   '墜落制止用器具の規格に合う器具と、身長・体格に合うサイズを確認。体重＋装備が使用可能質量以内であること。',
   '作業高さ・取付点・落下距離・下部空間と、ランヤードの種別・指定組合せを照合。点検・必要な教育・救助計画も確認。',
  ] : category.id === 'chemical' ? [
   '物質・濃度・形態・接触時間に合う製品性能。手袋はJIS T 8116の耐透過・耐浸透性を確認。',
   '製品・厚み・縫い目ごとの耐透過・耐浸透・耐劣化データ、温度・飛散範囲と余裕のある交換時間を照合。',
  ] : questions.map(q => q.detail),
  checks: [...recommendation.checks, ...(category.id === 'chemical' ? ['化学防護手袋はJIS T 8116の耐透過・耐浸透性、化学防護服は対象形態に合う製品性能をメーカー資料で照合する。'] : []), ...questions.map(q => q.check)],
  officialHref: category.id === 'chemical' ? 'https://www.mhlw.go.jp/web/t_doc?dataId=00tc2426&dataType=1' : category.id === 'fall' ? 'https://www.mhlw.go.jp/web/t_doc?dataId=00tc4287&dataType=1&pageNo=1' : feature?.officialSource?.url ?? recommendation.officialHref,
  officialLabel: category.id === 'chemical' ? '厚生労働省｜化学防護手袋の選択・使用' : category.id === 'fall' ? '厚生労働省｜墜落制止用器具の安全な使用' : feature?.officialSource?.label ?? recommendation.officialLabel,
  query: blocked ? undefined : feature?.searchQuery ?? (category.id === 'machine' ? recommendation.query : categoryId === 'safety-footwear' ? '作業用 安全靴' : category.id === 'fall' ? (task.id === 'scaffold' ? '墜落制止用器具 フルハーネス' : recommendation.query) : category.id === 'chemical' ? '化学防護手袋 耐透過' : undefined),
  prohibition: category.id === 'respiratory' ? '酸素18%未満・酸欠のおそれがある場所で、ろ過式の防じん・防毒マスクは使用禁止。物質・濃度が不明な場合も選べません。防じんマスクはガス・蒸気を除去できません。' : category.id === 'fall' ? '取付点が未確認、使用可能質量を超える、落下時に下の床や障害物に届く条件では使用できません。' : category.id === 'chemical' ? 'SDSだけや材質名だけでは適合を決められません。試験の破過時間をそのまま使用可能時間にしないでください。' : questions[0]?.prohibition,
 };
}


/** Reject malformed browser history and retain only answers for the active question path. */
export function normalizePpeAnswers(value: unknown): string[] {
 if (!Array.isArray(value) || value.length > 12) return [];
 const answers: string[] = [];
 const category = CATEGORIES.find(item => item.id === value[0]);
 if (!category) return answers;
 answers.push(category.id);
 const task = TASKS[category.id]?.find(item => item.id === value[1]);
 if (!task) return answers;
 answers.push(task.id);
 for (let i=2; i<value.length; i++) {
  if (value[i] === 'result') { answers.push('result'); break; }
  const valid = i === 2 ? value[i] === 'unknown' || CONDITIONS[category.id]?.some(item=>item.id===value[i]) : ['confirmed','unknown','unsafe'].includes(value[i]);
  if (!valid || i >= getPpeQuestions(category.id).length + 3) break;
  answers.push(value[i]);
 }
 return answers;
}

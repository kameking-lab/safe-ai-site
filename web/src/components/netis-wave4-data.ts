import { NETIS_WAVE2_SOURCE_URL } from "./netis-wave2-data";

const imageCredit = (title: string) => ({
  title,
  sourceUrl: "",
  author: "安全AIポータル（AI生成のカテゴリイメージ）",
  license: "当サイト制作",
  licenseUrl: "",
  retrievedAt: "2026-09-25",
  changeNote: "技術固有の製品写真ではありません。960×640 WebPに最適化。",
});

export const NETIS_WAVE4_CATEGORIES = [
  { id: "slope-safety", label: "法面・斜面", purpose: "safety", description: "通路・作業構台・構造物としての斜面保護を区別", checks: "斜面勾配、地盤、設置方法、作業床・通路の区別", image: "/netis-safety/categories/wave4-slope.webp", imageAlt: "法面の階段と作業構台を描いたカテゴリイメージ。特定技術の製品写真ではありません。", imageCredit: imageCredit("法面・斜面のカテゴリイメージ") },
  { id: "containment-fire", label: "飛散・防炎養生", purpose: "safety", description: "塗装・剥離現場の飛散防止と防炎養生", checks: "対象物質、飛散範囲、防炎性能、固定方法", image: "/netis-safety/categories/wave4-containment.webp", imageAlt: "橋梁を養生シートで囲うカテゴリイメージ。特定技術の製品写真ではありません。", imageCredit: imageCredit("飛散・防炎養生のカテゴリイメージ") },
  { id: "road-visibility", label: "道路の視認・区画", purpose: "safety", description: "常設の道路設備と工事区間の夜間視認を区別", checks: "対象道路、設備規格、夜間照度、設置と維持管理", image: "/netis-safety/categories/wave4-road-visibility.webp", imageAlt: "夜間道路工事の視認設備を描いたカテゴリイメージ。特定技術の製品写真ではありません。", imageCredit: imageCredit("道路の視認・区画のカテゴリイメージ") },
  { id: "marine-underwater", label: "海上・水中作業", purpose: "safety", description: "船舶・潜水士・吊荷の位置把握や機械化", checks: "船舶・潜水士・吊荷の対象、通信、監視員、停止手順", image: "/netis-safety/categories/wave4-marine.webp", imageAlt: "作業船と消波ブロックのカテゴリイメージ。特定技術の製品写真ではありません。", imageCredit: imageCredit("海上・水中作業のカテゴリイメージ") },
  { id: "temporary-mats", label: "養生・仮設敷設", purpose: "efficiency", description: "法面養生と仮設マットの敷設作業を効率化", checks: "地盤、荷重、風雪、固定・撤去方法", image: "/netis-safety/categories/wave4-temp-mats.webp", imageAlt: "仮設マットを敷設するカテゴリイメージ。特定技術の製品写真ではありません。", imageCredit: imageCredit("養生・仮設敷設のカテゴリイメージ") },
] as const;

export type NetisWave4CategoryId = (typeof NETIS_WAVE4_CATEGORIES)[number]["id"];
export function isNetisWave4CategoryId(value: string | null): value is NetisWave4CategoryId {
  return NETIS_WAVE4_CATEGORIES.some((category) => category.id === value);
}

type SafetyExistingCategory = "fall-prevention" | "heat-environment";
export type Wave4Technology = {
  categoryIds: readonly (NetisWave4CategoryId | SafetyExistingCategory)[];
  primaryPurpose: "safety" | "efficiency";
  name: string;
  registrationNumber: string;
  sourceRegistrationNumber: string;
  sourcePage: number;
  sourceSelection: string;
  provider: string;
  summary: string;
  mechanism: string;
  useCase: string;
  limitations: string;
  officialSourceUrl: string;
  individualUrl: string;
  sourceBasis: string;
  providerSourceUrl?: string;
};

const sourceBasis = (page: number) => `2026年4月国交省一覧 p.${page}／2026年9月25日NETIS個別ページの名称・番号を確認。販売・現場適合は未確認`;
const individualUrl = (number: string) => `https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=${number.replace(/-(?:A|V?E)$/i, "")}`;

// 技術名・登録番号・選定区分は国交省2026年4月一覧、個別ページは2026年9月25日に照合。
// 提供元URLがない場合は推測して作らず、公式個別ページと一覧だけを案内する。
export const NETIS_WAVE4_TECHNOLOGIES: readonly Wave4Technology[] = [
  { categoryIds: ["slope-safety"], primaryPurpose: "safety", name: "法面設置点検用階段・非常階段", registrationNumber: "SK-180020-VE", sourceRegistrationNumber: "SK-180020-VE", sourcePage: 3, sourceSelection: "令和6年度 準推奨技術", provider: "新東化成株式会社・株式会社西宮産業（申請者）", summary: "法面の点検通路・非常時の避難経路を設けます。", mechanism: "斜面に階段を設置し、点検時の移動経路を確保します。", useCase: "法面の点検や避難経路の確保。", limitations: "斜面勾配、地盤、固定方法、必要な通路幅を個別資料で確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("SK-180020-VE"), sourceBasis: sourceBasis(3) },
  { categoryIds: ["fall-prevention", "slope-safety"], primaryPurpose: "safety", name: "法面作業構台マルチアングル工法", registrationNumber: "KT-160136-VE", sourceRegistrationNumber: "KT-160136-VE", sourcePage: 3, sourceSelection: "令和7年度 準推奨技術", provider: "日綜産業株式会社（申請者）", summary: "法面工事の作業構台をシステム化します。", mechanism: "斜面の条件に合わせて作業構台を組み立て、作業床を設けます。", useCase: "斜面で作業場所が必要な法面工事。", limitations: "法面勾配、支持地盤、構台荷重と墜落防止措置を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("KT-160136-VE"), sourceBasis: sourceBasis(3) },
  { categoryIds: ["fall-prevention"], primaryPurpose: "safety", name: "先行床施工式フロア型システム吊足場(クイックデッキ)", registrationNumber: "TH-150007-VE", sourceRegistrationNumber: "TH-150007-VE", sourcePage: 3, sourceSelection: "令和元年度 準推奨技術", provider: "日綜産業株式会社", summary: "橋梁などの下部にフロア型の吊足場を設けます。", mechanism: "床材を先行して配置する方式で吊足場を組み立てます。", useCase: "橋梁下などアクセスしにくい場所の作業床。", limitations: "吊り元の強度、積載荷重、施工手順、墜落防止措置を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("TH-150007-VE"), sourceBasis: sourceBasis(3), providerSourceUrl: "https://www.nisso-sangyo.co.jp/products/series/quik-deck" },
  { categoryIds: ["slope-safety"], primaryPurpose: "safety", name: "DCネット工法", registrationNumber: "KK-180061-VE", sourceRegistrationNumber: "KK-180061-VE", sourcePage: 2, sourceSelection: "令和6年度 準推奨技術", provider: "日鉄神鋼建材株式会社（申請者）", summary: "法面表層の崩壊対策を行う斜面保護工法です。", mechanism: "斜面表層をネットなどで覆い、法面の保護を図ります。", useCase: "法面表層の保護が必要な現場。", limitations: "人の墜落を防ぐネットではありません。地質・設計荷重・施工条件を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("KK-180061-VE"), sourceBasis: sourceBasis(2) },
  { categoryIds: ["heat-environment"], primaryPurpose: "safety", name: "エコクリーンクールスーツ", registrationNumber: "CB-190009-VE", sourceRegistrationNumber: "CB-190009-VE", sourcePage: 5, sourceSelection: "令和5年度 推奨技術", provider: "ヤマダインフラテクノス株式会社（申請者）", summary: "ブラスト作業時の防護・暑熱負担を考えた専用装備です。", mechanism: "ブラスト作業用のスーツに冷却と送気の仕組みを組み合わせます。", useCase: "有害粉じんを伴うブラスト作業。", limitations: "一般作業用の冷却服として使いません。送気系、呼吸用保護具、作業条件を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("CB-190009-VE"), sourceBasis: sourceBasis(5) },
  { categoryIds: ["containment-fire"], primaryPurpose: "safety", name: "養生用防炎クロス", registrationNumber: "CG-210003-VE", sourceRegistrationNumber: "CG-210003-VE", sourcePage: 5, sourceSelection: "令和6年度 準推奨技術", provider: "萩原工業株式会社（申請者）", summary: "塗装・剥離作業で使う防炎性の養生材です。", mechanism: "対象区画をクロスで覆い、飛散防止と防炎養生に用います。", useCase: "塗装・剥離現場の区画養生。", limitations: "PPEではありません。対象物質、防炎要件、固定方法、飛散範囲を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("CG-210003-VE"), sourceBasis: sourceBasis(5) },
  { categoryIds: ["road-visibility"], primaryPurpose: "safety", name: "Jピカオレンジ反射スペーサー（暫定2車線用ワイヤロープLD種用）", registrationNumber: "KT-210094-VE", sourceRegistrationNumber: "KT-210094-VE", sourcePage: 4, sourceSelection: "令和8年度 推奨技術", provider: "JFE建材株式会社（申請者）", summary: "暫定2車線用ワイヤロープLD種の視認性を補助します。", mechanism: "対象ワイヤロープのスペーサーに反射材を配置します。", useCase: "暫定2車線用ワイヤロープLD種の道路設備。", limitations: "一般の工事用コーンには使いません。対象規格、設置位置、維持管理条件を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("KT-210094-VE"), sourceBasis: sourceBasis(4) },
  { categoryIds: ["road-visibility"], primaryPurpose: "safety", name: "ソーラー式LEDクッションドラムⅡ", registrationNumber: "HR-180002-VE", sourceRegistrationNumber: "HR-180002-VE", sourcePage: 4, sourceSelection: "令和6年度 準推奨技術", provider: "株式会社イケガミ（申請者）", summary: "道路工事区間をLEDで目立たせ、夜間の注意喚起を支援します。", mechanism: "太陽光電源とLEDを備えたクッションドラムを設置します。", useCase: "道路工事区間の夜間視認。", limitations: "照度、日照、電源、配置間隔、交通規制計画を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("HR-180002-VE"), sourceBasis: sourceBasis(4), providerSourceUrl: "https://ikegami-group.co.jp/product/%E3%82%BD%E3%83%BC%E3%83%A9%E3%83%BC%E5%BC%8Fled%E3%82%AF%E3%83%83%E3%82%B7%E3%83%A7%E3%83%B3%E3%83%89%E3%83%A9%E3%83%A0/" },
  { categoryIds: ["road-visibility"], primaryPurpose: "safety", name: "ポストウィングシリーズ", registrationNumber: "KT-170070-VE", sourceRegistrationNumber: "KT-170070-VE", sourcePage: 4, sourceSelection: "令和6年度 準推奨技術", provider: "株式会社吾妻商会（提供元）", summary: "視線誘導標の夜間視認を補助します。", mechanism: "既設の視線誘導標に装着し、反射面で道路の見え方を補います。", useCase: "視線誘導標を設ける道路区間。", limitations: "対象となる既設標の形状、設置条件、道路管理者の仕様を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("KT-170070-VE"), sourceBasis: sourceBasis(4), providerSourceUrl: "https://www.azuma-syokai.co.jp/business/traffic/product/post-cone/post-wing/" },
  { categoryIds: ["marine-underwater"], primaryPurpose: "safety", name: "水中据付作業可視化システム", registrationNumber: "HRK-190002-VE", sourceRegistrationNumber: "HRK-190002-VE", sourcePage: 7, sourceSelection: "令和8年度 推奨技術", provider: "東洋建設株式会社（申請者）", summary: "水中の吊荷と潜水士の位置関係を把握する支援技術です。", mechanism: "水中作業の位置情報を可視化し、監視を支援します。", useCase: "吊荷と潜水士が近接する水中据付作業。", limitations: "吊荷の立入管理、合図、監視員を代替しません。通信・測位条件を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("HRK-190002-VE"), sourceBasis: sourceBasis(7) },
  { categoryIds: ["marine-underwater"], primaryPurpose: "safety", name: "海上衝突防止支援システム", registrationNumber: "HRK-170001-VE", sourceRegistrationNumber: "HRK-170001-VE", sourcePage: 8, sourceSelection: "令和8年度 推奨技術", provider: "東洋建設株式会社（申請者）", summary: "作業船と接近船舶の位置確認を支援します。", mechanism: "作業船と周辺船舶の動きを捉え、接近時の判断を支援します。", useCase: "船舶の接近に注意が必要な海上工事。", limitations: "衝突回避を保証しません。見張り・通信・航行ルールと併用してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("HRK-170001-VE"), sourceBasis: sourceBasis(8), providerSourceUrl: "https://www.toyo-const.co.jp/technology/9553.html" },
  { categoryIds: ["marine-underwater"], primaryPurpose: "safety", name: "消波ブロック吊上装置『F3C』", registrationNumber: "KKK-160001-VE", sourceRegistrationNumber: "KKK-160001-VE", sourcePage: 8, sourceSelection: "令和5年度 準推奨技術", provider: "大裕株式会社（申請者）", summary: "消波ブロックの吊上げ作業を機械化します。", mechanism: "専用装置で消波ブロックを把持し、吊上げを支援します。", useCase: "海上・沿岸工事の消波ブロック移設。", limitations: "吊荷の重量・形状・把持状態、周囲の潜水士や作業船との隔離を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("KKK-160001-VE"), sourceBasis: sourceBasis(8), providerSourceUrl: "https://taiyu-corp.com/topics/8044/" },
  { categoryIds: ["temporary-mats"], primaryPurpose: "efficiency", name: "ピタットシート", registrationNumber: "HK-190004-VE", sourceRegistrationNumber: "HK-190004-VE", sourcePage: 2, sourceSelection: "令和7年度 準推奨技術", provider: "斉藤建設株式会社（申請者）", summary: "法面などで使う養生シートの敷設・維持を支援します。", mechanism: "現場の養生面にシートを配置し、風雪による飛散や補修の手間を減らします。", useCase: "法面等の養生・シート敷設。", limitations: "人の墜落防止具ではありません。風雪、固定方法、対象地盤を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("HK-190004-VE"), sourceBasis: sourceBasis(2) },
  { categoryIds: ["temporary-mats"], primaryPurpose: "efficiency", name: "ナイロン繊維強化特殊ゴムマットシリーズ", registrationNumber: "KTK-200005-VE", sourceRegistrationNumber: "KTK-200005-VE", sourcePage: 7, sourceSelection: "令和7年度 準推奨技術", provider: "篠田ゴム株式会社（申請者）", summary: "仮設敷板の運搬・敷設を省力化します。", mechanism: "特殊ゴムマットを仮設通路や作業面に敷設します。", useCase: "仮設敷板を運搬・敷設する現場。", limitations: "全現場の荷重・走行安全を保証しません。地盤、荷重、固定方法を確認してください。", officialSourceUrl: NETIS_WAVE2_SOURCE_URL, individualUrl: individualUrl("KTK-200005-VE"), sourceBasis: sourceBasis(7) },
];

export const NETIS_SEARCH_URL =
  "https://www.netis.mlit.go.jp/netis/input/pubsearch/search";

export const NETIS_RELEASE_URL =
  "https://www.mlit.go.jp/report/press/kanbo08_hh_001326.html";

export const NETIS_CHECKED_AT = "2026年9月24日確認";

export const NETIS_SAFETY_CATEGORIES = [
  {
    id: "machine-collision",
    label: "重機接触",
    title: "重機接触を減らす",
    image: "/safety-images/library/previews/collision-hazard.webp",
    imageAlt: "重機との接触危険を示す安全イラスト",
    searchTerms: "重機 接触 人検知 接近警報",
    description:
      "カメラ、AI画像認識、ICタグ、センサーで接近を検知し、運転者や作業員へ知らせる技術。",
    checks: "死角、検知範囲、遅延、雨天・粉じん、誤報時の運用",
  },
  {
    id: "restricted-zone",
    label: "立入禁止",
    title: "立入禁止区域を守る",
    image: "/safety-images/library/previews/equipment-swing-zone.webp",
    imageAlt: "重機の旋回範囲への立入禁止を示す安全イラスト",
    searchTerms: "立入 検知 警報 区画",
    description:
      "侵入検知や無線通知で、旋回範囲・掘削部など危険区域への立入りを知らせる技術。",
    checks: "区域の定義、警報対象、電源喪失、誘導員との役割分担",
  },
  {
    id: "fall-prevention",
    label: "墜落・転落",
    title: "墜落・転落を防ぐ",
    image: "/safety-images/library/previews/fall-hazard.webp",
    imageAlt: "高所からの墜落危険を示す安全イラスト",
    searchTerms: "墜落 転落 高所 足場 安全",
    description:
      "高所作業の状態把握、開口部対策、足場点検、フルハーネス使用確認を支援する技術。",
    checks: "法定措置を代替しないこと、使用環境、取付条件、点検方法",
  },
  {
    id: "heat-environment",
    label: "暑熱・作業環境",
    title: "暑熱・作業環境を見える化",
    image: "/safety-images/library/previews/wbgt-display.webp",
    imageAlt: "WBGT値による暑熱環境の確認を示す安全イラスト",
    searchTerms: "暑熱 WBGT 作業環境 遠隔監視",
    description:
      "WBGT、温湿度、作業者状態を計測・共有し、休憩や作業中止の判断を支援する技術。",
    checks: "校正、測定位置、通信断、個人情報、判断責任者",
  },
] as const;

export type NetisSafetyCategoryId =
  (typeof NETIS_SAFETY_CATEGORIES)[number]["id"];

export const FEATURED_NETIS_TECHNOLOGIES = [
  {
    categoryIds: ["machine-collision"] as const,
    name: "ヒヤリハンター（接近検知警報システム）",
    registrationNumber: "CG-200009-VE",
    summary: "ICタグで作業員の接近を捉え、重機の運転者へ警報します。",
    mechanism:
      "作業員が携帯するICタグを重機側の磁界で識別し、接近時に運転者へブザーと表示灯で知らせます。",
    useCase:
      "死角・夜間・粉じん下を含む、重機やフォークリフト周辺の接近管理。",
    productUrl:
      "https://matrix-inc.co.jp/product/hiyarihunter/hiyari-v2.html",
  },
  {
    categoryIds: ["machine-collision", "restricted-zone"] as const,
    name: "超音波警報センサー・パノラマOプレミアム",
    registrationNumber: "KT-180097-VE",
    summary: "重機後部の人や物体を検知し、周囲と運転者へ警告します。",
    mechanism:
      "重機後部の超音波センサーが人や物体を検知し、周辺作業員には音声、運転者には電子音で警告します。",
    useCase:
      "重機後端・旋回範囲など、立入禁止区域への接近の注意喚起。",
    productUrl: "https://www.tukusi.co.jp/commodity/list/631.html",
  },
  {
    categoryIds: ["machine-collision"] as const,
    name: "重機取付型セーフティカメラシステム「ドボレコJK」",
    registrationNumber: "KK-210060-VE",
    summary: "2台の広角カメラとAIで重機周辺の人物を検知します。",
    mechanism:
      "2台の広角カメラとAI人物検知で重機周辺の死角を監視し、映像とアラートで運転者へ通知します。",
    useCase:
      "タグを持たない来訪者も通る現場での、重機後方・側方の接触防止支援。",
    productUrl:
      "https://www.iwasakinet.co.jp/rental/construction-ict-support/xacti-doboleko-jk/",
  },
  {
    categoryIds: ["fall-prevention"] as const,
    name: "安全帯フックかけ忘れ防止装置「ハーネスノーティファイ」",
    registrationNumber: "KT-230282-A",
    summary: "フックの不使用を検知し、本人へ音と光で警告します。",
    mechanism:
      "後付けスイッチでフックの使用状態を検出し、不使用時に本人へ音と光で警告します。",
    useCase:
      "高所作業でのフック掛け忘れ防止と、使用状況ログによる安全管理。",
    productUrl:
      "https://ronk-jp.com/wp-content/uploads/2024/08/923a78cb58e3840064f71fca56ccd563.pdf",
  },
  {
    categoryIds: ["restricted-zone"] as const,
    name: "移動式ネットワークカメラ「MICS AI」",
    registrationNumber: "QS-210006-A",
    summary: "設定区域への人物進入を検知し、写真付きメールで通知します。",
    mechanism:
      "設定した侵入エリアへの人物進入を画像解析カメラが検知し、写真付きアラートメールを遠隔の管理者へ送信します。",
    useCase:
      "資材ヤード、開口部周辺、無人時間帯を含む危険区域の遠隔監視。",
    productUrl: "https://assistyou-m.com/mics/mics_ai/",
  },
] as const;

export function isNetisSafetyCategoryId(
  value: string | null,
): value is NetisSafetyCategoryId {
  return NETIS_SAFETY_CATEGORIES.some((category) => category.id === value);
}

export function netisDetailUrl(registrationNumber: string) {
  const detailRegistrationNumber = registrationNumber.replace(
    /-(?:A|V?E)$/i,
    "",
  );
  return `https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=${detailRegistrationNumber}`;
}

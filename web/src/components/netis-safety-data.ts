export const NETIS_SEARCH_URL =
  "https://www.netis.mlit.go.jp/netis/input/pubsearch/search";

export const NETIS_RELEASE_URL =
  "https://www.mlit.go.jp/report/press/kanbo08_hh_001326.html";

export const NETIS_CHECKED_AT = "2026年9月24日確認";

/** カテゴリ写真・製品画像候補の取得/権利確認日（証跡: docs/netis-safety-visual-provenance-2026-09-24.md） */
export const NETIS_IMAGE_RETRIEVED_AT = "2026-09-24";

/**
 * 製品画像の掲載状態。
 * - verified: 製品・NETIS番号の対応、取得元URL、利用根拠、取得日を記録済みの実写画像のみ。
 * - pending: 利用根拠を文書で確認できていない。汎用写真・AI生成画像で代替せず未掲載と明示する。
 */
export type NetisProductImage =
  | {
      status: "verified";
      src: string;
      alt: string;
      sourceUrl: string;
      credit: string;
      usageBasis: string;
      retrievedAt: string;
    }
  | {
      status: "pending";
      reason: string;
    };

function pendingProductImage(): NetisProductImage {
  return {
    status: "pending",
    reason: "提供元の第三者利用許諾を文書で確認できていないため未掲載",
  };
}

export const NETIS_SAFETY_CATEGORIES = [
  {
    id: "machine-collision",
    label: "重機接触",
    title: "重機接触を減らす",
    image: "/netis-safety/categories/machine-collision.webp",
    imageAlt:
      "解体現場で稼働する油圧ショベル2台と、その手前に立つ安全ベスト姿の作業員（東京、実写）",
    imageCredit: {
      title: "Polka Dot Machinery (14699068438).jpg",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Polka_Dot_Machinery_(14699068438).jpg",
      author: "George Alexander Ishida Newman",
      license: "CC BY 2.0",
      licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      retrievedAt: NETIS_IMAGE_RETRIEVED_AT,
    },
    searchTerms: "重機 接触 人検知 接近警報",
    description:
      "カメラ、AI画像認識、ICタグ、センサーで接近を検知し、運転者や作業員へ知らせる技術。",
    checks: "死角、検知範囲、遅延、雨天・粉じん、誤報時の運用",
  },
  {
    id: "restricted-zone",
    label: "立入禁止",
    title: "立入禁止区域を守る",
    image: "/netis-safety/categories/restricted-zone.webp",
    imageAlt:
      "「安全第一」と書かれた工事用バリケードとカラーコーン・コーンバーで区画された歩道（滋賀県草津市、実写）",
    imageCredit: {
      title: "Anzen-daiichi fence, Kusatsu, Shiga.jpg",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Anzen-daiichi_fence,_Kusatsu,_Shiga.jpg",
      author: "運動会プロテインパワー",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      retrievedAt: NETIS_IMAGE_RETRIEVED_AT,
    },
    searchTerms: "立入 検知 警報 区画",
    description:
      "侵入検知や無線通知で、旋回範囲・掘削部など危険区域への立入りを知らせる技術。",
    checks: "区域の定義、警報対象、電源喪失、誘導員との役割分担",
  },
  {
    id: "fall-prevention",
    label: "墜落・足場",
    title: "墜落・転落を防ぐ",
    image: "/netis-safety/categories/fall-prevention.webp",
    imageAlt:
      "建設中の建物の開口端で、ハーネスを親綱に接続して脚立上で作業する作業員（米国、実写）",
    imageCredit: {
      title: "On Edge (8744516460).jpg",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:On_Edge_(8744516460).jpg",
      author: "National Institute for Occupational Safety and Health (NIOSH)",
      license: "パブリックドメイン（米国連邦政府機関の著作物）",
      licenseUrl: "",
      retrievedAt: NETIS_IMAGE_RETRIEVED_AT,
    },
    searchTerms: "墜落 転落 高所 足場 安全",
    description:
      "高所作業の状態把握、開口部対策、足場点検、フルハーネス使用確認を支援する技術。",
    checks: "法定措置を代替しないこと、使用環境、取付条件、点検方法",
  },
  {
    id: "heat-environment",
    label: "暑熱・作業環境",
    title: "暑熱・作業環境を見える化",
    image: "/netis-safety/categories/heat-environment.webp",
    imageAlt:
      "屋外の三脚に設置された黒球付きのWBGT（暑さ指数）測定器（実写）",
    imageCredit: {
      title: "Bioenvironmental engineering team defends against the heatwave with exact measurements (9775034).jpg",
      sourceUrl:
        "https://commons.wikimedia.org/wiki/File:Bioenvironmental_engineering_team_defends_against_the_heatwave_with_exact_measurements_(9775034).jpg",
      author: "U.S. Air Force photo by Senior Airman Darius Frazier",
      license: "パブリックドメイン（米国連邦政府機関の著作物）",
      licenseUrl: "",
      retrievedAt: NETIS_IMAGE_RETRIEVED_AT,
    },
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
    limitations:
      "ICタグを携帯する作業員が検知対象です。タグは金属・電子機器から離し、現場の電磁ノイズ、機器ごとの動作温度、検知範囲と警報を事前確認します。電池管理と誘導・目視確認を併用します。",
    checkedAt: NETIS_CHECKED_AT,
    productImage: pendingProductImage(),
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
    limitations:
      "人と物体を識別しません。豪雨・降雪・強風時は適用外で、動作温度は-10～50℃です。DC12/24V電源と後方約3mの確認スペースを確保し、取付位置・検知範囲・警報を始業前に点検します。",
    checkedAt: NETIS_CHECKED_AT,
    productImage: pendingProductImage(),
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
    limitations:
      "人物検知は8mまでで、LTE/Wi-Fi環境と機器の設置スペースを確認します。画角外や遮蔽、天候・照明条件では検知できない場合があります。レンズを清掃し、安全確認や誘導員を併用します。",
    checkedAt: NETIS_CHECKED_AT,
    productImage: pendingProductImage(),
    productUrl:
      "https://www.iwasakinet.co.jp/rental/construction-ict-support/xacti-doboleko-jk/",
  },
  {
    categoryIds: ["fall-prevention"] as const,
    name: "安全帯フックかけ忘れ防止装置「ハーネスノーティファイ」",
    registrationNumber: "KT-230282-A",
    summary: "設定エリアでフックの不使用を検知し、本人へ音と光で警告します。",
    mechanism:
      "後付けスイッチでフックの使用状態を検出し、設定した警報エリア内で不使用時に本人へ音と光で警告します。",
    useCase:
      "高所作業でのフック掛け忘れ防止。使用状況ログによる履歴管理はオプションです。",
    limitations:
      "設定エリア内でフック不使用時に警報が出るか使用前に確認し、充電・電池を管理します。エリアセンサーの使用温度は-20～60℃です。親綱への適切な掛け方や法定の墜落防止措置を自動確認するものではありません。",
    checkedAt: NETIS_CHECKED_AT,
    productImage: pendingProductImage(),
    productUrl:
      "https://ronk-jp.com/wp-content/uploads/2024/08/923a78cb58e3840064f71fca56ccd563.pdf",
  },
  {
    categoryIds: ["restricted-zone"] as const,
    name: "画像解析カメラ（人物検知）MICS-AI",
    registrationNumber: "QS-210006-A",
    summary: "設定区域への人物進入を検知し、写真付きメールで通知します。",
    mechanism:
      "設定した侵入エリアへの人物進入を画像解析カメラが検知し、写真付きアラートメールを遠隔の管理者へ送信します。",
    useCase:
      "資材ヤード、開口部周辺、無人時間帯を含む危険区域の遠隔監視。",
    limitations:
      "安定したdocomo通信、AC100V電源、1m四方の設置場所が必要です。月明かり未満の照度や遮蔽では検知できない場合があり、赤外線対応には別条件があります。通信・電源断やメール遅延を想定し、立入防止措置と巡視を併用します。",
    checkedAt: NETIS_CHECKED_AT,
    productImage: pendingProductImage(),
    productUrl: "https://assistyou-m.com/mics/mics_ai/",
  },
  {
    categoryIds: ["fall-prevention"] as const,
    name: "安全帯フック着脱確認システム「ハーネスアラート」",
    registrationNumber: "QS-240022-A",
    summary: "高所エリアでフック未使用を検知し、作業員へ音で警告します。",
    mechanism:
      "エリア設定機が高所作業エリアを作り、ハーネスへ後付けしたICタグ付きフックホルダの状態を検知して警告します。回転灯はオプションです。",
    useCase:
      "仮設足場の組立・解体、橋梁、屋根、開口部など、フック使用が必要な高所作業。",
    limitations:
      "フックをホルダから外した状態を検知し、親綱等への正しい掛け方は確認しません。水中と100/200V引込線の中心から半径2m以内は適用外です。警告まで2～3秒かかり、設定機1台につき最大20タグです。作業前の警報確認と電池管理が必要です。",
    checkedAt: NETIS_CHECKED_AT,
    productImage: pendingProductImage(),
    productUrl: "https://ykc-amulet.net/harnessalert/",
  },
  {
    categoryIds: ["heat-environment"] as const,
    name: "熱中対策バンド",
    registrationNumber: "KT-230099-VE",
    summary: "外気温と皮膚温度から暑熱リスクを捉え、音・光・振動で知らせます。",
    mechanism:
      "腕に密着させた2つのセンサーで外気温と皮膚温度を測り、深部体温の変化を推定して着用者へ警告します。",
    useCase:
      "舗装工事、風通しや照り返しの厳しい場所、大人数・高齢者を含む暑熱作業。",
    limitations:
      "医療機器ではありません。センサーを肌へ密着させ、表示にかかわらず体調が悪い場合は休憩し、現場の熱中症対策を継続します。",
    checkedAt: NETIS_CHECKED_AT,
    productImage: pendingProductImage(),
    productUrl:
      "https://sooki.co.jp/irental/allproduct/ct15/i-bow-2025/",
  },
  {
    categoryIds: ["heat-environment"] as const,
    name: "現場作業員健康管理システム「TECHNO BAND」",
    registrationNumber: "KT-260019-A",
    summary: "WBGTと年代別心拍数から暑熱リスクを分析し、本人と管理者へ通知します。",
    mechanism:
      "ウェアラブル端末の心拍情報とWBGTを組み合わせてリスクを4段階で判定し、端末の振動・音と管理画面へ通知します。",
    useCase:
      "大人数の現場、季節の変わり目、作業員ごとの暑熱リスクと健康状態を管理したい工事。",
    limitations:
      "BluetoothおよびLTEの通信環境に支障がないことが条件で、医療機器ではありません。強い直射日光で端末電源が落ちる場合があり、装着位置の調整が必要です。",
    checkedAt: NETIS_CHECKED_AT,
    productImage: pendingProductImage(),
    productUrl: "https://www.tecraft.co.jp/topics/2584/",
  },
  {
    categoryIds: ["machine-collision"] as const,
    name: "重機接触防止装置、ハッとセンサー",
    registrationNumber: "KK-210002-VE",
    summary: "超音波で重機周辺の人や物を捉え、周囲と運転者へ音・光で警告します。",
    mechanism:
      "重機に取り付けた反射式超音波センサーが最長5mの人・物を検知し、周囲へ警報音と回転灯、運転席へブザーと距離表示で知らせます。",
    useCase:
      "バックホウ、ブレーカ、ホイルローダなどを使う掘削、道路、舗装、トンネル工事。",
    limitations:
      "豪雨・降雪時は適用外です。設置スペースと配線を確保し、センサーの高さ・方向、検知距離、電池や動作を作業前に確認します。",
    checkedAt: NETIS_CHECKED_AT,
    productImage: pendingProductImage(),
    productUrl: "https://tsucumore.com/backsensor-hatto/",
  },
  {
    categoryIds: ["machine-collision", "restricted-zone"] as const,
    name: "カメラ式人検知システム",
    registrationNumber: "KK-200054-A",
    summary: "AIカメラで人物を検知し、警報や対応機種の停止制御へ信号を送ります。",
    mechanism:
      "最大4台のカメラ映像をAIで解析し、人物検知時に警報や機械制御用の信号を発信します。自動停止は対応する機種・条件でのみ使えます。",
    useCase:
      "トンネル、土工、道路工事の重機死角や、壁面設置カメラによる立入禁止区域の監視。",
    limitations:
      "目視で2m先を確認できる環境が条件です。機種ごとに停止可否を検討し、画角・検知レベルを調整して従来の安全確認を継続します。",
    checkedAt: NETIS_CHECKED_AT,
    productImage: pendingProductImage(),
    productUrl: "https://www.nishio-tm.co.jp/netis/",
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

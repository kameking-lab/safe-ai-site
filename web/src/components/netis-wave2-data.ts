/** 国交省中国地方整備局「NETIS推奨技術等一覧」の識別記号は2026年4月時点。2026年9月の個別掲載は未確認。 */
export const NETIS_WAVE2_SOURCE_URL =
  "https://www.cgr.mlit.go.jp/ctc/pdf/technology/netis/recommend-skill-2026.pdf";

export const NETIS_WAVE2_CATEGORIES = [
  { id: "wave2-survey", label: "現場測量・土量", description: "UAV・レーザー・スマートフォンで地形と土量を把握", checks: "測量対象、要求精度、機材・通信", purpose: "efficiency",
    image: "/netis-safety/categories/wave2-survey.jpg", imageAlt: "上空から撮影した道路現場の実写。掲載技術の製品写真ではありません。",
    imageCredit: { title: "Drone view of the worksite (51697906251).jpg", sourceUrl: "https://commons.wikimedia.org/wiki/File:Drone_view_of_the_worksite_(51697906251).jpg", author: "Oregon Department of Transportation", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", retrievedAt: "2026-09-25", changeNote: "960px縮小版のEXIF/XMPを除去。表示時にCSSで切り抜き。" } },
  { id: "wave2-records", label: "施工計画・3D記録", description: "点群とCIMモデルで施工情報を共有", checks: "入力データ、設計との整合、共有先", purpose: "efficiency",
    image: "/netis-safety/categories/wave2-records.jpg", imageAlt: "BIMの3Dモデル画面。掲載技術の製品画面ではありません。",
    imageCredit: { title: "BIM for residential construction.jpg", sourceUrl: "https://commons.wikimedia.org/wiki/File:BIM_for_residential_construction.jpg", author: "Aadbuild", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", retrievedAt: "2026-09-25", changeNote: "Wikimediaの960px縮小版を取得。表示時にCSSで切り抜き。" } },
  { id: "wave2-mechanization", label: "重機・機械化", description: "積込み・転圧・遠隔操作・トンネル施工を支援", checks: "対応機種、設置条件、運転者の確認", purpose: "efficiency",
    image: "/netis-safety/categories/wave2-mechanization.jpg", imageAlt: "道路用ローラーの実写。掲載技術の製品写真ではありません。",
    imageCredit: { title: "A Road Roller working on an arterial road in Amaravati.jpg", sourceUrl: "https://commons.wikimedia.org/wiki/File:A_Road_Roller_working_on_an_arterial_road_in_Amaravati.jpg", author: "IM3847", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", retrievedAt: "2026-09-25", changeNote: "Wikimediaの縮小版を取得。表示時にCSSで切り抜き。" } },
  { id: "wave2-roadwork", label: "道路作業・区画線", description: "区画線・側溝・交通規制の作業を支援", checks: "路面・天候・照度・交通規制", purpose: "efficiency",
    image: "/netis-safety/categories/wave2-roadwork.jpg", imageAlt: "路面標示機械の操作訓練の実写。掲載技術の製品写真ではありません。",
    imageCredit: { title: "Training Improves NAVFAC Hawaii Worker Operating Knowledge of Riding Paint Striping Machine (29957285503).jpg", sourceUrl: "https://commons.wikimedia.org/wiki/File:Training_Improves_NAVFAC_Hawaii_Worker_Operating_Knowledge_of_Riding_Paint_Striping_Machine_(29957285503).jpg", author: "NAVFAC / Denise Emsley", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", retrievedAt: "2026-09-25", changeNote: "960px縮小版のEXIF/XMPを除去。表示時にCSSで切り抜き。" } },
  { id: "wave2-quality", label: "品質・検査", description: "地盤、コンクリート、溶接、塗布量を確認", checks: "測定条件、品質基準、校正・記録", purpose: "quality",
    image: "/netis-safety/categories/wave2-quality.jpg", imageAlt: "コンクリートのスランプ試験を行う技術者の実写。掲載技術の製品写真ではありません。",
    imageCredit: { title: "DOT project technicians performing slump test on latex concrete.jpg", sourceUrl: "https://commons.wikimedia.org/wiki/File:DOT_project_technicians_performing_slump_test_on_latex_concrete.jpg", author: "NCDOTcommunications", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", retrievedAt: "2026-09-25", changeNote: "Wikimediaの960px縮小版を取得。表示時にCSSで切り抜き。" } },
] as const;

export type NetisWave2CategoryId = (typeof NETIS_WAVE2_CATEGORIES)[number]["id"];

export function isNetisWave2CategoryId(value: string | null): value is NetisWave2CategoryId {
  return NETIS_WAVE2_CATEGORIES.some((category) => category.id === value);
}

export type Wave2Technology = {
  categoryIds: readonly NetisWave2CategoryId[];
  primaryPurpose: "efficiency" | "quality";
  name: string;
  registrationNumber: string;
  sourceRegistrationNumber: string;
  sourcePage: number;
  sourceWorkType: string;
  sourceSelection: string;
  provider: string;
  summary: string;
  mechanism: string;
  useCase: string;
  limitations: string;
  officialSourceUrl: string;
  sourceBasis: string;
  providerSourceUrl: string;
};

function sourceBasis(page: number) {
  return `2026年4月公式一覧掲載（p.${page}）／9月現行NETIS個別状態未確認`;
}

export const NETIS_WAVE2_TECHNOLOGIES: readonly Wave2Technology[] = [
  {
    categoryIds: ["wave2-survey"], primaryPurpose: "efficiency",
    name: "クラウド型空中写真測量解析サービス「Solution Linkage Point Cloud」",
    registrationNumber: "KT-230092", sourceRegistrationNumber: "KT-230092-A", sourcePage: 1, sourceWorkType: "土工", sourceSelection: "令和7年度 推奨技術",
    provider: "日立建機株式会社", summary: "UAVで撮影した写真をクラウド上で3D点群に変換します。",
    mechanism: "空中写真をアップロードして点群データを生成し、現場の地形確認に使います。",
    useCase: "UAV写真測量から点群を作り、出来形や土量を確認する準備。",
    limitations: "UAV撮影条件、標定点、精度、通信環境と対象工事の要領を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(1), providerSourceUrl: "https://ict-construction.hitachicm.com/ja/products/solution-linkage-pointcloud/",
  },
  {
    categoryIds: ["wave2-survey"], primaryPurpose: "efficiency",
    name: "スマートフォン活用３D計測ソリューション (Solution Linkage Survey)",
    registrationNumber: "KT-200112", sourceRegistrationNumber: "KT-200112-VE", sourcePage: 1, sourceWorkType: "土工", sourceSelection: "令和7年度 推奨技術",
    provider: "日立建機株式会社", summary: "スマートフォン動画から3Dデータを作り、土量を計測します。",
    mechanism: "対象物の周囲を動画撮影し、位置情報と合わせて3Dデータを生成します。",
    useCase: "盛土や仮置き土の体積・進捗の確認。",
    limitations: "撮影できない面は3D化されず、測位方式や現場条件で精度が変わります。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(1), providerSourceUrl: "https://ict-construction.hitachicm.com/ja/products/solution-linkage-survey/",
  },
  {
    categoryIds: ["wave2-survey"], primaryPurpose: "efficiency",
    name: "センチメートル級精度の対空標識「エアロボマーカー」",
    registrationNumber: "KT-180029", sourceRegistrationNumber: "KT-180029-VE", sourcePage: 6, sourceWorkType: "調査試験", sourceSelection: "令和7年度 推奨技術",
    provider: "エアロセンス株式会社", summary: "GNSS内蔵の対空標識でUAV測量の標定点を設けます。",
    mechanism: "標定点・検証点に機器を置き、測位情報を取得して写真測量を支援します。",
    useCase: "UAVを使う現場測量の準備と標定点の計測。",
    limitations: "測位環境、必要精度、対応する測量手順と使用機器を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(6), providerSourceUrl: "https://aerosense.co.jp/marker2/",
  },
  {
    categoryIds: ["wave2-records"], primaryPurpose: "efficiency",
    name: "3次元モデルを利用したBIM／CIMコミュニケーションシステム TREND-CORE",
    registrationNumber: "KK-160043", sourceRegistrationNumber: "KK-160043-VE", sourcePage: 1, sourceWorkType: "土工", sourceSelection: "令和7年度 推奨技術",
    provider: "福井コンピュータ株式会社", summary: "施工現場を3Dモデルで表し、手順と情報共有を支援します。",
    mechanism: "現況・設計データを統合し、施工ステップや設計寸法をモデル上で確認します。",
    useCase: "施工計画の共有と関係者への説明。",
    limitations: "設計データの整合、モデル更新と閲覧環境を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(1), providerSourceUrl: "https://const.fukuicompu.co.jp/products/trendcore/",
  },
  {
    categoryIds: ["wave2-records"], primaryPurpose: "efficiency",
    name: "3次元点群処理ソフト(TREND-POINT)を用いた施工土量計測システム",
    registrationNumber: "KK-150058", sourceRegistrationNumber: "KK-150058-VE", sourcePage: 1, sourceWorkType: "土工", sourceSelection: "令和7年度 推奨技術",
    provider: "福井コンピュータ株式会社", summary: "施工段階の点群差分から土量を計算します。",
    mechanism: "3D計測で得た点群を解析し、施工前後の土量差分を算出します。",
    useCase: "土工の進捗把握と施工土量の確認。",
    limitations: "点群の計測精度、座標系、解析条件、要求する出来形精度を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(1), providerSourceUrl: "https://const.fukuicompu.co.jp/products/trendpoint/",
  },
  {
    categoryIds: ["wave2-records"], primaryPurpose: "efficiency",
    name: "鋼橋CIMシステム",
    registrationNumber: "KK-200014", sourceRegistrationNumber: "KK-200014-VE", sourcePage: 6, sourceWorkType: "橋梁上部工", sourceSelection: "令和8年度 推奨技術",
    provider: "オフィスケイワン株式会社", summary: "鋼橋上部工のCIMモデルを自動作成し、施工情報を共有します。",
    mechanism: "鋼橋の設計情報から3Dモデルを生成し、施工管理で使います。",
    useCase: "鋼橋の製作・架設計画に必要なモデル作成と確認。",
    limitations: "橋梁形式、入力図面、モデル詳細度と対象業務の適合を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(6), providerSourceUrl: "https://cim-system.com/cim-girder",
  },
  {
    categoryIds: ["wave2-mechanization"], primaryPurpose: "efficiency",
    name: "自動荷重測定装置を搭載したバックホウを用いた積載重量管理システム(LOADEX 100)",
    registrationNumber: "KT-190022", sourceRegistrationNumber: "KT-190022-VE", sourcePage: 1, sourceWorkType: "土工", sourceSelection: "令和7年度 推奨技術",
    provider: "株式会社トプコン", summary: "バックホウで積込み中の重量を計測し、積載管理を支援します。",
    mechanism: "油圧と姿勢のセンサーでバケット内の重量を推定し、積込みを記録します。",
    useCase: "ダンプへの積載量確認と過積載防止を兼ねた作業記録。",
    limitations: "計量法上の計量器ではありません。対応重機、校正、管理方法を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(1), providerSourceUrl: "https://www.topcon.co.jp/positioning/wp-content/uploads/topcon/products/pdf/LOADEX100_J.pdf",
  },
  {
    categoryIds: ["wave2-mechanization"], primaryPurpose: "efficiency",
    name: "クラウド型転圧管理ソリューション「Solution Linkage Compactor」",
    registrationNumber: "KT-230305", sourceRegistrationNumber: "KT-230305-A", sourcePage: 1, sourceWorkType: "共通工", sourceSelection: "令和7年度 推奨技術",
    provider: "日立建機株式会社", summary: "転圧回数と進捗をクラウドに記録し、現場で共有します。",
    mechanism: "転圧機に装着した機器の施工データをモニタとWebアプリに表示します。",
    useCase: "盛土の転圧進捗管理と施工記録。",
    limitations: "対応機種、GNSS・通信状態、対象工事の管理要領を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(1), providerSourceUrl: "https://ict-construction.hitachicm.com/ja/products/solution-linkage-compactor/",
  },
  {
    categoryIds: ["wave2-mechanization"], primaryPurpose: "efficiency",
    name: "トモロボ",
    registrationNumber: "SK-200003", sourceRegistrationNumber: "SK-200003-A", sourcePage: 3, sourceWorkType: "コンクリート工", sourceSelection: "令和7年度 推奨技術",
    provider: "建ロボテック株式会社", summary: "鉄筋の結束作業をロボットで支援します。",
    mechanism: "配筋上を走るロボットで鉄筋交点の結束作業を自動化します。",
    useCase: "床版やスラブの鉄筋結束作業。",
    limitations: "鉄筋径・配筋形状、走行範囲、作業員との役割分担を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(3), providerSourceUrl: "https://kenrobo-tech.com/tomorobo/rebartying/",
  },
  {
    categoryIds: ["wave2-roadwork"], primaryPurpose: "efficiency",
    name: "Ｇ-スクライト工法",
    registrationNumber: "HK-240021", sourceRegistrationNumber: "HK-240021-VE", sourcePage: 4, sourceWorkType: "付属施設", sourceSelection: "令和8年度 推奨技術",
    provider: "北海道技建株式会社、大日本印刷株式会社", summary: "路面への光投影で区画線の罫書作業を支援します。",
    mechanism: "パターンライトを路面に投影し、直線の位置を可視化します。",
    useCase: "区画線工事の位置出し。",
    limitations: "照度、路面状態、投影距離、光源の設置と交通規制を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(4), providerSourceUrl: "https://www.dnp.co.jp/biz/products/detail/20172754_4986.html",
  },
  {
    categoryIds: ["wave2-roadwork"], primaryPurpose: "efficiency",
    name: "ロードライン マーキュリー ドライサポート工法",
    registrationNumber: "KT-160124", sourceRegistrationNumber: "KT-160124-VE", sourcePage: 4, sourceWorkType: "付属施設", sourceSelection: "令和2年度 準推奨技術",
    provider: "日本ライナー株式会社", summary: "水性路面標示塗料の乾燥を早め、交通開放を支援します。",
    mechanism: "指定の路面標示塗料を塗った直後に特殊硬化液を散布します。",
    useCase: "区画線施工の乾燥待ちと交通規制時間の短縮。",
    limitations: "対応塗料、気温・湿度、施工条件を確認し、他の塗料には流用しません。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(4), providerSourceUrl: "https://www.nipponliner.co.jp/productslist/303/",
  },
  {
    categoryIds: ["wave2-roadwork"], primaryPurpose: "efficiency",
    name: "ハードラインアクア＃２１　ＭＤ工法",
    registrationNumber: "KT-220235", sourceRegistrationNumber: "KT-220235-VE", sourcePage: 4, sourceWorkType: "付属施設", sourceSelection: "令和8年度 推奨技術",
    provider: "アトミクス株式会社", summary: "水性路面標示塗料の乾燥を早める区画線工法です。",
    mechanism: "水性路面標示塗料に乾燥促進剤を組み合わせ、塗装後に促進液を散布します。",
    useCase: "区画線施工後の乾燥待ちと交通開放までの時間短縮。",
    limitations: "対応塗料、促進剤の使用量、気温・湿度、降雨予測と交通規制を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(4), providerSourceUrl: "https://www.atomix.co.jp/product_items/md/",
  },
  {
    categoryIds: ["wave2-quality"], primaryPurpose: "quality",
    name: "固化材含有量計測システム「ｅ－セメダス」",
    registrationNumber: "KT-210023", sourceRegistrationNumber: "KT-210023-VE", sourcePage: 1, sourceWorkType: "共通工", sourceSelection: "令和8年度 推奨技術",
    provider: "株式会社大林組、株式会社立花マテリアル", summary: "地盤改良の固化材含有量を施工直後に確認します。",
    mechanism: "試料に酸を混ぜて反応熱を測り、固化材含有量を推定します。",
    useCase: "地盤改良工の施工直後の品質確認。",
    limitations: "対象土の事前試験、薬品の取扱い、適用できる土質と品質基準を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(1), providerSourceUrl: "https://www.obayashi.co.jp/solution_technology/detail/tech_d246.html",
  },
  {
    categoryIds: ["wave2-quality"], primaryPurpose: "quality",
    name: "スマートバッチャープラント",
    registrationNumber: "CB-180023", sourceRegistrationNumber: "CB-180023-VE", sourcePage: 5, sourceWorkType: "トンネル工", sourceSelection: "令和7年度 推奨技術",
    provider: "株式会社原商、飛島建設株式会社", summary: "吹付けコンクリートの温度を自動制御し製造データを記録します。",
    mechanism: "練上がり温度の制御と製造情報のクラウド管理を行います。",
    useCase: "トンネル吹付けコンクリートの品質と製造記録の管理。",
    limitations: "材料、設備、現場の温度条件と品質管理基準を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(5), providerSourceUrl: "https://www.harasho.co.jp/product/netis/90",
  },
  {
    categoryIds: ["wave2-quality"], primaryPurpose: "quality",
    name: "溶接部ビード計測用3Dハンディスキャナ脚長計測パッケージ「CSM-HSシリーズ」",
    registrationNumber: "KK-200009", sourceRegistrationNumber: "KK-200009-VE", sourcePage: 6, sourceWorkType: "調査試験", sourceSelection: "令和8年度 推奨技術",
    provider: "株式会社コムビック", summary: "溶接ビードの脚長を非接触で測り、結果を記録します。",
    mechanism: "レーザーとカメラで溶接部の断面形状を取得します。",
    useCase: "溶接部の検査と計測記録。",
    limitations: "測定面、校正、要求する検査基準、現場の光条件を確認します。",
    officialSourceUrl: NETIS_WAVE2_SOURCE_URL, sourceBasis: sourceBasis(6), providerSourceUrl: "https://comvic.co.jp/product/",
  },
];

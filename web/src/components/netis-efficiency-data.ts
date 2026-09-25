/** 国交省中国地方整備局の2026年4月一覧（5件）と過去のDX紹介（ALB）を照合。NETIS本体の2026年9月時点の個別掲載状態は未確認。 */
export const NETIS_EFFICIENCY_CATEGORIES = [
  {
    id: "survey-measurement",
    label: "測量・出来形",
    description: "点群・レーザー測量などで計測と出来形確認を支援",
    checks: "測定対象、精度、必要機材、現場での検証方法",
  },
  {
    id: "records-inspection",
    label: "記録・点検",
    description: "施工情報や点検結果の記録・共有を支援",
    checks: "記録対象、入力方法、共有先、通信と保存条件",
  },
] as const;

export type NetisEfficiencyCategoryId =
  (typeof NETIS_EFFICIENCY_CATEGORIES)[number]["id"];

export function isNetisEfficiencyCategoryId(
  value: string | null,
): value is NetisEfficiencyCategoryId {
  return NETIS_EFFICIENCY_CATEGORIES.some((category) => category.id === value);
}

const OFFICIAL_LIST =
  "https://www.cgr.mlit.go.jp/ctc/innfra-dx/infra-technology-list.html";
const APRIL_2026_LIST =
  "https://www.cgr.mlit.go.jp/ctc/pdf/technology/netis/recommend-skill-2026.pdf";

export const NETIS_EFFICIENCY_TECHNOLOGIES = [
  {
    categoryIds: ["survey-measurement"] as const,
    name: "オンライン3D点群処理ソフトウェア ScanX",
    registrationNumber: "KT-210020",
    sourceRegistrationNumber: "KT-210020-A",
    provider: "ローカスブルー株式会社",
    summary: "取得した3D点群をクラウド上で処理・解析し、共有します。",
    mechanism: "レーザー測量機器などの点群をオンラインで処理し、分類・解析・共有するソフトウェアです。",
    useCase: "土量や出来形を確認するための点群処理と関係者間の共有。",
    limitations: "計測精度は元の測量データと処理条件に左右されるため、対象工事の要求精度とデータ取扱条件を確認します。",
    officialSourceUrl: APRIL_2026_LIST,
    sourceBasis: "2026年4月の国交省一覧 p.6・22／現行登録未確認",
    providerSourceUrl: "https://www.cgr.mlit.go.jp/ctc/pdf/innfra-dx/netis/4_ScanX.pdf",
  },
  {
    categoryIds: ["survey-measurement"] as const,
    name: "レーザー三次元計測システム 簡測くん",
    registrationNumber: "KT-140030",
    sourceRegistrationNumber: "KT-140030-VR",
    provider: "日本ファブテック株式会社、東京貿易テクノシステム株式会社",
    summary: "レーザーを使って橋梁部材の出来形を計測します。",
    mechanism: "レーザートラッカーと計測球によって橋梁部材を計測し、従来のターゲット設置作業を減らします。",
    useCase: "橋梁部材の出来形確認と製作時の計測。",
    limitations: "測定対象、設置場所、要求精度、計測球の適用条件を導入前に確認します。",
    officialSourceUrl: APRIL_2026_LIST,
    sourceBasis: "2026年4月の国交省一覧 p.6・24／現行登録未確認",
    providerSourceUrl: "https://www.cgr.mlit.go.jp/ctc/pdf/innfra-dx/netis/7_20250203kansoku.pdf",
  },
  {
    categoryIds: ["survey-measurement"] as const,
    name: "航空レーザ深浅測量（ALB）",
    registrationNumber: "KK-160016",
    sourceRegistrationNumber: "KK-160016-VE",
    provider: "株式会社パスコ",
    summary: "陸地から水域までを連続した3次元データとして計測します。",
    mechanism: "航空機搭載の陸域用レーザーと水域透過型レーザーを組み合わせ、地形と河床・海底を計測します。",
    useCase: "河川・海岸を含む広い範囲の地形把握。",
    limitations: "水質や水深など対象水域の条件、航空計測の可否、必要な精度を確認します。",
    officialSourceUrl: OFFICIAL_LIST,
    sourceBasis: "過去の地方整備局資料に掲載／現行登録未確認",
    providerSourceUrl: "https://www.pasco.co.jp/biz/tech/aerial-leser/",
  },
  {
    categoryIds: ["records-inspection"] as const,
    name: "ANDPAD",
    registrationNumber: "KT-180049",
    sourceRegistrationNumber: "KT-180049-VE",
    provider: "株式会社アンドパッド",
    summary: "監督者と作業員の連絡や現場情報の共有を支援します。",
    mechanism: "図面、工程、写真などの現場情報をクラウド上で共有し、連絡調整を支援します。",
    useCase: "現場の変更連絡、写真・施工記録の共有。",
    limitations: "利用する機能、通信環境、関係者の権限設定と記録の保存方法を確認します。",
    officialSourceUrl: APRIL_2026_LIST,
    sourceBasis: "2026年4月の国交省一覧 p.7・23／現行登録未確認",
    providerSourceUrl: "https://andpad.jp/products/construction_management",
  },
  {
    categoryIds: ["records-inspection"] as const,
    name: "杭・地盤改良施工情報可視化システム 3Dパイルビューアー",
    registrationNumber: "KT-170030",
    sourceRegistrationNumber: "KT-170030-VE",
    provider: "計測ネットサービス株式会社、株式会社安藤・間",
    summary: "杭・地盤改良の施工情報を3Dで可視化し、記録します。",
    mechanism: "地中の杭・地盤改良の施工情報をリアルタイムに表示し、記録します。",
    useCase: "杭施工や地盤改良の位置・出来形の確認。",
    limitations: "対応工法、計測機器、施工情報の取得・記録条件を確認します。",
    officialSourceUrl: APRIL_2026_LIST,
    sourceBasis: "2026年4月の国交省一覧 p.3・36／現行登録未確認",
    providerSourceUrl: "https://www.cgr.mlit.go.jp/ctc/pdf/innfra-dx/netis/6_3D.pdf",
  },
  {
    categoryIds: ["records-inspection"] as const,
    name: "走行型高速3Dトンネル点検システム MIMM",
    registrationNumber: "KK-130026",
    sourceRegistrationNumber: "KK-130026-VE",
    provider: "計測検査株式会社、パシフィックコンサルタンツ株式会社",
    summary: "車両走行でトンネル覆工面の画像と3D位置を記録します。",
    mechanism: "走行車両から覆工面のカラー画像と3次元位置データを取得し、変状図の作成を支援します。",
    useCase: "道路トンネルの定期点検と変状の記録。",
    limitations: "通行条件、計測可能な速度と精度、近接目視など必要な点検手順との役割分担を確認します。",
    officialSourceUrl: APRIL_2026_LIST,
    sourceBasis: "2026年4月の国交省一覧 p.7・35／現行登録未確認",
    providerSourceUrl: "https://www.keisokukensa.co.jp/MIMM",
  },
] as const;

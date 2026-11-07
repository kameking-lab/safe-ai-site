type Wave6Category =
  | "wave2-mechanization"
  | "wave2-records"
  | "wave2-roadwork"
  | "wave2-quality"
  | "temporary-mats";

export type Wave6Technology = {
  readonly limitedIntroduction: true;
  readonly categoryIds: readonly Wave6Category[];
  readonly primaryPurpose: "efficiency" | "quality";
  readonly categoryLabel: string;
  readonly name: string;
  readonly registrationNumber: string;
  readonly summary: string;
  readonly individualUrl: string;
  readonly checkedAt: "2026年9月26日";
  readonly searchTerms: string;
};

const t = (
  categoryIds: Wave6Technology["categoryIds"],
  primaryPurpose: Wave6Technology["primaryPurpose"],
  categoryLabel: string,
  name: string,
  registrationNumber: string,
  summary: string,
  searchTerms: string,
): Wave6Technology => ({
  limitedIntroduction: true,
  categoryIds,
  primaryPurpose,
  categoryLabel,
  name,
  registrationNumber,
  summary,
  individualUrl: `https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=${registrationNumber.replace(/-(?:A|V[ER])$/i, "")}`,
  checkedAt: "2026年9月26日",
  searchTerms,
});

// 公式個別ページで番号・正式名称・概要を照合した「調査した技術例」。
// 掲載期限、現場適合、効果、販売状況は確認済みとは扱わない。
export const NETIS_WAVE6_TECHNOLOGIES: readonly Wave6Technology[] = [
  t(["wave2-quality"], "quality", "地盤・基礎", "J-WALLⅡ工法", "KT-190018-A", "合成構造用鋼矢板と後打ち鉄筋コンクリートを一体化し、地下壁を構築する。", "地下壁 地盤 基礎 鋼矢板 コンクリート"),
  t(["wave2-mechanization"], "efficiency", "地盤・基礎", "CI-CMC-HA工法", "QS-160049-VE", "霧状のセメントスラリーと撹拌翼で原地盤を混合し、硬質層にも対応する深層改良体を造成する。", "地盤 基礎 深層改良 撹拌 硬質"),
  t(["wave2-quality"], "quality", "コンクリート・補修", "ハレーサルト張り出し歩道", "CG-130006-VE", "セメントと細骨材の一部又は全部を高炉スラグに置き換えたプレキャスト張り出し歩道を用いる。", "コンクリート 補修 歩道 高炉スラグ 塩害 凍害"),
  t(["wave2-roadwork"], "efficiency", "道路・舗装", "クマンツメ", "QS-170005-VE", "バックホウの刃先に専用エッジを取り付け、橋面舗装の二次剥ぎ取りを行う。", "道路 舗装 橋面 剥ぎ取り バックホウ"),
  t(["wave2-mechanization"], "efficiency", "電気・通信", "電線共同溝(通信)用接着レスさや管", "KT-150113-VE", "電線共同溝の通信管路に、接着剤を使用せず接続するさや管を用いる。", "電気 通信 電線共同溝 管路 接着レス"),
  t(["wave2-quality"], "quality", "電気・通信", "EGy防水コネクタ", "CB-170026-VE", "電源線・制御線をワンタッチで接続し、半嵌合での導通を防ぐ防水コネクタを用いる。", "電気 通信 防水 コネクタ 配線"),
  t(["wave2-mechanization"], "efficiency", "橋梁・架設", "自走式床版搬送据付装置「アームローラー工法」", "KK-220073-A", "専用装置でプレキャスト床版を搬送・昇降し、取替・新設時の据付を行う。", "橋梁 架設 床版 搬送 据付"),
  t(["wave2-quality"], "quality", "橋梁・補修", "リフレッシュジョイント工法(REJ工法)", "QS-190028-VE", "狭小部用ブラストとシーリングで、橋梁のゴム系伸縮継手の止水部を補修する。", "橋梁 補修 伸縮継手 止水 ブラスト"),
  t(["wave2-quality"], "quality", "排水・維持管理", "Gブロックドレイン", "KT-160064-VE", "ステンレス製又はゴム製フィルターを備えた鋼製排水溝で路面雨水を排水する。", "排水 維持管理 橋梁 高架橋 トンネル"),
  t(["temporary-mats"], "efficiency", "排水・維持管理", "橋梁用埋設型排水桝", "HK-140002-VE", "橋梁伸縮装置の取替時に埋設型排水桝を設置し、遊間を利用して床版上の雨水を排出する。", "排水 維持管理 橋梁 床版 雨水"),
  t(["wave2-roadwork"], "efficiency", "道路・維持管理", "消雪パイプ温水高圧洗浄「リバーサルクリーニング」", "HR-220004-A", "洗管リード・垂直ノズル・温水を組み合わせ、消雪パイプ内部を高圧洗浄する。", "道路 維持管理 消雪 パイプ 洗浄"),
  t(["wave2-mechanization"], "efficiency", "電気・通信", "直流給電方式トンネルLED照明", "CG-170008-VE", "照明器具外部の電源装置から直流で給電し、トンネルLED照明を点灯・調光する。", "電気 通信 トンネル LED 照明"),
  t(["wave2-quality"], "quality", "地盤・基礎", "KS-EGG-SE工法", "KTK-180001-VE", "特殊ヘッドと電動オーガーで静的にケーシングを動かし、締固め砂杭等を地盤中に造成する。", "地盤 基礎 液状化 砂杭 オーガー"),
  t(["wave2-records"], "efficiency", "測量・計測", "クラウド計測システム 『クラウド16』", "KT-180043-VE", "最大16台の計測器の情報をクラウドへ蓄積し、環境・気象等の計測管理を行う。", "測量 計測 クラウド 環境 気象 管理"),
];

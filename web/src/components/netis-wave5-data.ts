type ExistingWave5Category =
  | "wave2-mechanization"
  | "wave2-records"
  | "wave2-roadwork"
  | "wave2-quality"
  | "temporary-mats";

const imageCredit = {
  title: "画像なし（文字カテゴリ）",
  sourceUrl: "",
  author: "安全AIポータル",
  license: "画像を使用していません",
  licenseUrl: "",
  retrievedAt: "2026-09-26",
  changeNote: "技術固有写真との誤認を避けるため画像なし",
};

export const NETIS_WAVE5_CATEGORIES = [
  {
    id: "flood-defense",
    label: "洪水・高潮（防災）",
    purpose: "safety",
    description: "水際設備による洪水・高潮対策",
    checks: "設計水位、構造条件、避難計画、維持管理",
    imageCredit,
  },
] as const;

export type NetisWave5CategoryId = (typeof NETIS_WAVE5_CATEGORIES)[number]["id"];
export function isNetisWave5CategoryId(value: string | null): value is NetisWave5CategoryId {
  return NETIS_WAVE5_CATEGORIES.some((category) => category.id === value);
}

export type Wave5Technology = {
  readonly limitedIntroduction: true;
  readonly categoryIds: readonly (ExistingWave5Category | NetisWave5CategoryId)[];
  readonly primaryPurpose: "safety" | "efficiency" | "quality";
  readonly categoryLabel: string;
  readonly name: string;
  readonly registrationNumber: string;
  readonly summary: string;
  readonly individualUrl: string;
  readonly checkedAt: "2026年9月26日";
  readonly searchTerms: string;
};

const t = (
  categoryIds: Wave5Technology["categoryIds"],
  primaryPurpose: Wave5Technology["primaryPurpose"],
  categoryLabel: string,
  name: string,
  registrationNumber: string,
  summary: string,
  searchTerms: string,
): Wave5Technology => ({
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
export const NETIS_WAVE5_TECHNOLOGIES: readonly Wave5Technology[] = [
  t(["wave2-mechanization"], "efficiency", "土工・泥土改質", "吸水性泥土改質材 「ワトル」", "TH-160010-VE", "PS灰を主成分とする材料を泥土に混合し、水分を吸収させて泥土の強度を高める。", "泥土 改質 土工 PS灰"),
  t(["wave2-mechanization"], "efficiency", "土工・マシンガイダンス", "3Dマシンガイダンス【 E三・S 】イーサン・エス", "TH-160014-VE", "バックホウのバケット端部にTS用プリズム等を取り付け、法面整形や整地を3D情報で支援する。", "土工 バックホウ 3D マシンガイダンス 法面"),
  t(["temporary-mats"], "efficiency", "法面・水路被覆", "コンクリートキャンバス工法", "CG-220009-VE", "特殊セメントを封入した布材を散水硬化させ、法面や水路等に薄いライニング層を形成する。", "法面 水路 被覆 ライニング"),
  t(["temporary-mats"], "efficiency", "かご工・排水", "砕石メッシュかご「かご楽」", "KT-200133-VE", "細目のパネルと中枠で構成するかごに砕石を詰め、ドレーン工等の施工を省力化する。", "かご工 排水 ドレーン 砕石"),
  t(["temporary-mats"], "efficiency", "法面・防草", "グラストップSLタイプ", "CB-190013-VE", "モルタル平板と防草シートを一体にした部材を法面等に設置して雑草の発生を抑える。", "法面 防草 モルタル シート"),
  t(["wave2-mechanization"], "efficiency", "地盤改良", "SDM-Fit工法", "KT-180050-VE", "機械撹拌と噴射撹拌を併用して深層地盤を改良し、施工時の地盤変位を抑制する。", "地盤 改良 撹拌"),
  t(["wave2-quality"], "quality", "法面・防草", "ロービングウォールⅡ", "KT-180143-VE", "高精度給糸装置による吹付けで長繊維混入補強土層を造成し、法面を安定させる。", "法面 斜面 安定 吹付け"),
  t(["wave2-mechanization"], "efficiency", "地盤改良", "パワーブレンダー工法(横行施工)", "QS-180038-VE", "角度変換できる撹拌機で横行方向へ連続施工し、狭隘・近接箇所の中層地盤を改良する。", "地盤 改良 撹拌 狭隘"),
  t(["wave2-quality"], "quality", "法面・防草", "侵食防止及び植生の自然侵入促進をはかる土壌藻類資材", "OK-170002-VR", "土壌藻類資材を裸地や法面に吹き付け、被覆形成による侵食抑制と植生の自然侵入を促す。", "法面 侵食 植生 土壌"),
  t(["wave2-quality"], "quality", "地盤・杭", "SAVEコンポーザーHA", "CB-160026-VE", "N値35程度までの砂層への貫入能力を高めた無振動・低騒音のサンドコンパクション施工で、支持層への到達を管理画面に表示する。", "地盤 杭 サンドコンパクション N値 施工管理"),
  t(["wave2-quality"], "quality", "地盤・杭", "油圧ハンマの騒音防止装置を使用した鋼管杭の打止め工法", "KT-210028-VE", "市街地で鋼管杭の先端を低騒音の打撃で打ち止め、杭の支持力を確認しやすくする。", "杭 鋼管杭 支持力 騒音"),
  t(["wave2-mechanization"], "efficiency", "硬質地盤・矢板圧入", "硬質地盤クリア工法（フライホイール式パイルオーガ）", "KT-220224-VE", "フライホイール機構付きオーガで超硬質地盤を削孔しながら鋼矢板を圧入する。", "硬質 地盤 矢板 圧入 オーガ"),
  t(["temporary-mats"], "efficiency", "仮設・土留め", "BUウォール工法", "KT-170101-VE", "中詰め材を入れた袋体を積層して、仮設の土留めや路体構造物を構築する。", "仮設 土留め 路体 袋体"),
  t(["wave2-mechanization"], "efficiency", "圧入・自動制御", "PPTシステム", "SK-170006-VE", "圧入施工中に取得する地盤データを使い、圧入機の施工を自動制御する。", "圧入 自動制御 地盤 オペレータ 監視"),
  t(["temporary-mats"], "efficiency", "護岸・小口止め", "小口止太郎", "QS-170028-VE", "護岸勾配が「1割未満」（NETIS原文）の護岸工に附帯する小口止めをハーフプレキャスト部材で構築する。", "護岸 小口止め プレキャスト"),
  t(["wave2-quality"], "quality", "橋梁・防食", "高機能床版排水パイプ", "HK-200001-VE", "道路橋の床版の水抜きに用いる排水パイプである。", "橋梁 床版 排水 パイプ"),
  t(["wave2-quality"], "quality", "橋梁・防食", "高防食耐久性塗料「ダンジオーラE下塗」", "CG-250006-A", "大気環境にある鋼構造物に用い、素地調整の簡易化と防食品質向上が期待される下塗り塗料である。", "橋梁 鋼構造 防食 塗料"),
  t(["wave2-quality"], "quality", "橋梁・防食", "回転式レーザー素地調整工法（CoolLaser工法）", "CB-230005-A", "回転させた高出力連続波レーザーで鋼構造物のさび・塗膜・塩分を除去する。", "橋梁 防食 素地 レーザー 塗膜"),
  t(["wave2-quality"], "quality", "橋梁・防食", "循環式ショットピーニング工法", "CB-180024-VE", "循環式ブラストの資機材で既設鋼橋の溶接部にショットピーニングを施す。", "橋梁 鋼橋 疲労 ブラスト 溶接"),
  t(["wave2-roadwork"], "efficiency", "道路・防草", "クサデナーズ", "QS-170003-VE", "舗装と縁石等の境界隙間にレベリング材とトップコート材を塗布して雑草を抑える。", "道路 防草 舗装 縁石"),
  t(["wave2-quality"], "quality", "支柱検査", "鋼製埋設部路面境界部の損傷判定、診断方法", "KK-150069-VE", "パルス渦流法のスクリーニングと超音波表面SH波法を組み合わせ、鋼製埋設部の路面境界部損傷を調べる。", "支柱 検査 道路 非破壊 超音波"),
  t(["wave2-quality"], "quality", "支柱検査", "支柱路面境界部検査システム", "KT-130057-VE", "複数モードの超音波で、支柱の路面境界部を掘削せずに検査する。", "支柱 検査 道路 非破壊 超音波"),
  t(["flood-defense"], "safety", "洪水・高潮（防災）", "解放感を保ち、環境を損なわない洪水・高潮対策 アクリル止水パネル", "KTK-210013-A", "護岸壁等に透明なアクリル止水パネルを用い、視界を保ちながら嵩上げによる浸水対策を行う。", "洪水 高潮 防災 アクリル 止水 浸水"),
  t(["wave2-records"], "efficiency", "海上・地盤改良", "地盤改良施工支援システム「Tarpos 3D」", "KTK-200015-VE", "GNSSの位置情報を平面と3Dで表示し、海上地盤改良時の杭芯への誘導を支援する。", "海上 地盤改良 3D GNSS 施工管理"),
  t(["wave2-mechanization"], "efficiency", "海上・浚渫", "浚渫グラブバケット角度制御装置", "KTK-190002-VE", "旋回時のグラブバケットの方向を制御し、浚渫跡の重複を減らす。", "海上 浚渫 グラブ バケット"),
  t(["wave2-records"], "efficiency", "海上・施工可視化", "3D作業船位置管理支援システム", "KKK-170009-VE", "海上工事の作業船位置・作業状態・目的物形状を3D表示して施工管理を支援する。", "海上 作業船 3D 施工 可視化"),
];

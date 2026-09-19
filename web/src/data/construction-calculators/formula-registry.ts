import type {
  FormulaRegistryEntry,
  FormulaSource,
  InputDefinition,
  OutputDefinition,
} from "@/lib/construction-calculators";
import {
  aggregateBaseFixtures,
  asphaltMixtureFixtures,
  averageEndAreaFixtures,
  concreteFixtures,
  drainageSlopeFixtures,
  earthworkConversionFixtures,
  excavationFixtures,
  formworkFixtures,
  rebarSpacingFixtures,
  rebarWeightFixtures,
  scaleCoordinateFixtures,
  slopeFixtures,
} from "./test-fixtures";

const CHECKED_AT = "2026-08-27";

export const constructionFormulaSources: readonly FormulaSource[] = [
  {
    sourceId: "SRC-MLIT-R8-QUANTITY",
    title: "令和8年度 土木工事数量算出要領",
    publisher: "国土交通省 中国地方整備局",
    url: "https://www.cgr.mlit.go.jp/techserv/documents/03/R8_sansyutsuyouryou.pdf",
    applicableYear: "令和8年度（2026年度）",
    locator: "1-1-2 数量計算方法（平均断面法）、1-1-4 数量計算の単位及び数位、1-1-36 単位体積質量、1-4-2 コンクリート工、1-4-5 型枠工、1-4-9 鉄筋工",
    checkedAt: CHECKED_AT,
    sourceKind: "official",
  },
  {
    sourceId: "SRC-MLIT-EARTHWORK-LC",
    title: "施工パッケージ型積算基準 1章 土工 ①土量変化率",
    publisher: "国土交通省",
    url: "https://www.mlit.go.jp/tec/sekisan/sekkei/pdf/260320sekoupackage10.pdf",
    applicableYear: "平成25年度資料（L・Cの定義だけを参照）",
    locator: "PDF p.7-8（表示ページ1-2）：L=ほぐした土量/地山土量、C=締固め後土量/地山土量",
    checkedAt: CHECKED_AT,
    sourceKind: "official",
  },
  {
    sourceId: "SRC-MLIT-R8-COMMON-SPEC",
    title: "土木工事共通仕様書（案）（令和8年3月）",
    publisher: "国土交通省 北陸地方整備局",
    url: "https://www.hrr.mlit.go.jp/gijyutu/kaitei/shiyousho/0803/dobokukyoutsuuR0803.pdf",
    applicableYear: "令和8年3月版",
    locator: "第1編1-3-7-4 3.鉄筋かぶりの確保（PDF表示p.147、冊子1-69）：かぶりはコンクリート表面から鉄筋までの最短距離で、主鉄筋中心までの距離とは異なる",
    checkedAt: CHECKED_AT,
    sourceKind: "official",
  },
  {
    sourceId: "SRC-GSI-PLANAR-DIRECTION",
    title: "距離と方向角の計算（ST計算）",
    publisher: "国土地理院",
    url: "https://vldb.gsi.go.jp/sokuchi/surveycalc/surveycalc/algorithm/xy2st/xy2st.htm",
    applicableYear: null,
    locator: "測地線長・方向角の式、x/y座標と方向角の定義。公開ツールでは測地補正を行わず局所平面のユークリッド式だけを採用",
    checkedAt: CHECKED_AT,
    sourceKind: "official",
  },
  {
    sourceId: "SRC-MATH-EUCLIDEAN-GEOMETRY",
    title: "ユークリッド幾何・三角法からの独立導出",
    publisher: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/tools/construction-calculators",
    applicableYear: null,
    locator: "直方体・円柱・台形断面の積分、円断面積、ピタゴラスの定理、atan2、縮尺比例",
    checkedAt: CHECKED_AT,
    sourceKind: "mathematical-derivation",
  },
] as const;

const quantitySource = constructionFormulaSources[0];
const earthworkSource = constructionFormulaSources[1];
const commonSpecSource = constructionFormulaSources[2];
const gsiSource = constructionFormulaSources[3];
const mathSource = constructionFormulaSources[4];

const roundingRule =
  "全計算を未丸め値で完了後、表示・CSV・PDFの最終値だけを指定小数桁（0〜6）で四捨五入、切上げ、切捨てする。四捨五入はhalf-up、切上げ/切捨ては+∞/-∞方向。台数とピッチ区間数は式の定義として常に整数切上げ。";

function numberInput(
  key: string,
  label: string,
  units: readonly string[],
  help: string,
  condition?: string,
): InputDefinition {
  return { key, label, type: "number", required: true, units, help, condition };
}

function selectInput(
  key: string,
  label: string,
  options: readonly string[],
  help: string,
  condition?: string,
): InputDefinition {
  return { key, label, type: "select", required: true, options, help, condition };
}

function integerInput(key: string, label: string, help: string): InputDefinition {
  return { key, label, type: "integer", required: true, min: 1, help };
}

const roundingInput: InputDefinition = {
  key: "rounding",
  label: "丸め設定",
  type: "select",
  required: false,
  options: ["round", "ceil", "floor"],
  help: "UIではmodeと小数桁0〜6をRoundingConfigオブジェクトとして渡す。省略時は小数第2位の四捨五入。",
};

function output(key: string, label: string, unit: string, integer = false): OutputDefinition {
  return { key, label, unit, integer };
}

export const constructionCalculatorRegistry: readonly FormulaRegistryEntry[] = [
  {
    calculatorId: "concrete-quantity",
    slug: "concrete-quantity",
    title: "コンクリート数量・生コン車台数",
    category: "数量",
    purpose: "単純形状のコンクリート正味体積、ロス込み体積、生コン車台数、最終車数量を概算する。",
    formula: ["直方体 V=L×W×H", "円柱 V=π×(D/2)²×H", "必要量=V×個数×(1+ロス率/100)", "台数=ceil(必要量/積載量)"],
    formulaVersion: "1.0.0",
    inputDefinitions: [
      selectInput("shape", "形状", ["rectangular", "slab", "cylinder", "circular-foundation"], "直方体・床版/土間・円柱・円形基礎を選ぶ。"),
      numberInput("length", "長さ", ["mm", "cm", "m"], "直方体の長さ。", "shape=rectangular|slab"),
      numberInput("width", "幅", ["mm", "cm", "m"], "直方体の幅。", "shape=rectangular|slab"),
      numberInput("height", "高さ・厚さ", ["mm", "cm", "m"], "高さまたは厚さ。"),
      numberInput("diameter", "直径", ["mm", "cm", "m"], "円柱・円形基礎の直径。", "shape=cylinder|circular-foundation"),
      selectInput("dimensionUnit", "寸法単位", ["mm", "cm", "m"], "長さ・幅・高さ・直径へ共通適用。"),
      integerInput("quantity", "個数", "同一形状の個数。"),
      numberInput("lossPercent", "ロス率", ["%"], "0〜100%。現場・発注条件を確認した値。"),
      numberInput("truckCapacityM3", "1台の積載量", ["m3"], "使用車両・供給者に確認した値。"),
      roundingInput,
    ],
    outputDefinitions: [output("netVolumeM3", "正味体積", "m³"), output("volumeWithLossM3", "ロス込み体積", "m³"), output("truckCount", "生コン車台数", "台", true), output("finalTruckVolumeM3", "最終車数量", "m³")],
    supportedUnits: ["mm", "cm", "m", "m³", "%", "台"],
    roundingRule,
    assumptions: ["単純な直方体または真円柱。", "ロス率と積載量は利用者入力。", "発注数量・構造安全を保証しない。"],
    sources: [quantitySource, mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: concreteFixtures,
  },
  {
    calculatorId: "excavation-backfill", slug: "excavation-backfill", title: "掘削・埋戻し土量", category: "土工", purpose: "鉛直掘削、法付き溝、四辺法付き掘削の体積から構造物・基礎材を控除して埋戻し量を概算する。",
    formula: ["鉛直 V=LWH", "法付き溝 V=L(WD+mD²)", "四辺法付き V=D{LW+mD(L+W)+(4/3)m²D²}", "埋戻し=掘削−構造物−基礎材"], formulaVersion: "1.0.0",
    inputDefinitions: [selectInput("shape", "掘削形状", ["vertical", "sloped-trench", "sloped-pit"], "法の広がる方向を区別する。"), numberInput("length", "長さ", ["mm", "cm", "m"], "底面長さ。"), numberInput("width", "幅", ["mm", "cm", "m"], "底面幅。"), numberInput("depth", "深さ", ["mm", "cm", "m"], "鉛直深さ。"), selectInput("dimensionUnit", "寸法単位", ["mm", "cm", "m"], "長さ・幅・深さへ共通適用。"), numberInput("sideSlopeHorizontalPerVertical", "法勾配", ["水平/鉛直"], "m=水平増分/鉛直増分。鉛直は0。"), numberInput("structureVolume", "構造物体積", ["L", "m3"], "埋戻しから控除する体積。"), numberInput("baseMaterialVolume", "基礎材体積", ["L", "m3"], "埋戻しから控除する体積。"), selectInput("deductionVolumeUnit", "控除体積単位", ["L", "m3"], "構造物体積と基礎材体積へ共通適用。"), roundingInput],
    outputDefinitions: [output("excavationVolumeM3", "掘削量", "m³"), output("deductionVolumeM3", "控除量", "m³"), output("backfillVolumeM3", "埋戻し量", "m³")], supportedUnits: ["mm", "cm", "m", "L", "m³"], roundingRule,
    assumptions: ["法付き溝は幅方向だけ、法付き掘削は四辺が同じ勾配。", "土量変化・余掘りを含めない。", "控除量超過は入力矛盾として停止。"], sources: [quantitySource, mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: excavationFixtures,
  },
  {
    calculatorId: "average-end-area", slug: "average-end-area", title: "平均断面法による土量", category: "土工", purpose: "複数区間の前後断面積と区間長から平均断面法の区間土量・合計土量を求める。", formula: ["Vᵢ=(Aᵢ+Aᵢ₊₁)/2×Lᵢ", "V=ΣVᵢ"], formulaVersion: "1.0.0",
    inputDefinitions: [{ key: "segments", label: "複数区間", type: "segments", required: true, help: "各区間の前断面積、後断面積、区間長。1〜500区間。", itemDefinitions: [numberInput("startArea", "前断面積", ["areaUnit"], "0以上。後断面積と同時に0は不可。"), numberInput("endArea", "後断面積", ["areaUnit"], "0以上。前断面積と同時に0は不可。"), numberInput("length", "区間長", ["lengthUnit"], "0より大きい区間長。")] }, selectInput("areaUnit", "断面積単位", ["mm2", "cm2", "m2"], "全断面積へ共通適用。"), selectInput("lengthUnit", "延長単位", ["mm", "cm", "m"], "全区間長へ共通適用。"), roundingInput],
    outputDefinitions: [output("sectionVolumesM3", "区間土量", "m³"), output("totalVolumeM3", "合計土量", "m³")], supportedUnits: ["mm²", "cm²", "m²", "mm", "cm", "m", "m³"], roundingRule,
    assumptions: ["断面積は区間内で線形に変化する近似。", "片側0断面は許容、両側0の区間は停止。", "未丸めの区間値を合計して最終丸め。"], sources: [quantitySource, mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: averageEndAreaFixtures,
  },
  {
    calculatorId: "earthwork-conversion-dump-trucks", slug: "earthwork-conversion-dump-trucks", title: "土量変化・ダンプ台数", category: "土工", purpose: "地山土量から利用者入力のL・Cでほぐし/締固め土量を換算し、指定状態の密度と積載率で運搬台数を概算する。",
    formula: ["ほぐし土量=地山土量×L", "締固め後土量=地山土量×C", "重量=密度基準状態の体積×密度", "有効積載=定格積載×積載率", "台数=ceil(重量/有効積載)"], formulaVersion: "1.0.0",
    inputDefinitions: [numberInput("bankVolume", "地山土量", ["L", "m3"], "掘削前の体積。"), selectInput("bankVolumeUnit", "地山土量単位", ["L", "m3"], "地山土量へ適用。"), numberInput("bulkingFactor", "ほぐし率L", ["比"], "土質・含水状態を確認した利用者入力。"), numberInput("compactionFactor", "締固め率C", ["比"], "土質・施工条件を確認した利用者入力。"), numberInput("density", "土の密度", ["kg/m3", "t/m3"], "選択した状態のかさ密度。"), selectInput("densityUnit", "密度単位", ["kg/m3", "t/m3"], "密度へ適用。"), selectInput("densityState", "密度の基準状態", ["bank", "loose", "compacted"], "重量へ使う密度の状態。"), numberInput("truckPayload", "ダンプ積載量", ["kg", "t"], "車検証等で確認する。"), selectInput("truckPayloadUnit", "積載量単位", ["kg", "t"], "ダンプ積載量へ適用。"), numberInput("loadingRatePercent", "積載率", ["%"], "0より大きく100%以下。"), roundingInput],
    outputDefinitions: [output("looseVolumeM3", "ほぐし土量", "m³"), output("compactedVolumeM3", "締固め後土量", "m³"), output("massT", "重量", "t"), output("truckCount", "必要台数", "台", true)], supportedUnits: ["L", "m³", "kg/m³", "t/m³", "kg", "t", "%", "台"], roundingRule,
    assumptions: ["L、C、密度、積載量、積載率を固定しない。", "密度の状態を明示して重量へ適用。", "過積載、安全運行、現場可否を判定しない。"], sources: [earthworkSource, quantitySource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: earthworkConversionFixtures,
  },
  {
    calculatorId: "aggregate-base-quantity", slug: "aggregate-base-quantity", title: "砕石・路盤材数量", category: "材料", purpose: "面積・厚さ・利用者入力密度・ロス率から路盤材の体積、重量、車両台数を概算する。", formula: ["正味体積=面積×厚さ", "必要体積=正味体積×(1+ロス率/100)", "重量=必要体積×密度", "台数=ceil(重量/積載量)"], formulaVersion: "1.0.0",
    inputDefinitions: [numberInput("area", "面積", ["mm2", "cm2", "m2"], "施工面積。"), selectInput("areaUnit", "面積単位", ["mm2", "cm2", "m2"], "面積へ適用。"), numberInput("thickness", "厚さ", ["mm", "cm", "m"], "施工後の平均厚さ。"), selectInput("thicknessUnit", "厚さ単位", ["mm", "cm", "m"], "厚さへ適用。"), numberInput("density", "密度", ["kg/m3", "t/m3"], "材料・含水状態を確認した値。"), selectInput("densityUnit", "密度単位", ["kg/m3", "t/m3"], "密度へ適用。"), numberInput("lossPercent", "ロス率", ["%"], "仕様書・現場条件を確認した値。"), numberInput("vehicleCapacity", "車両積載量", ["kg", "t"], "使用車両で確認した値。"), selectInput("vehicleCapacityUnit", "積載量単位", ["kg", "t"], "車両積載量へ適用。"), roundingInput],
    outputDefinitions: [output("requiredVolumeM3", "必要体積", "m³"), output("requiredMassT", "必要重量", "t"), output("vehicleCount", "車両台数", "台", true)], supportedUnits: ["mm²", "cm²", "m²", "mm", "cm", "m", "kg/m³", "t/m³", "kg", "t", "%", "台"], roundingRule,
    assumptions: ["厚さは面積全体で一様な近似。", "密度・ロス・積載量は利用者入力。", "発注数量、締固め度、過積載可否を保証しない。"], sources: [quantitySource, mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: aggregateBaseFixtures,
  },
  {
    calculatorId: "asphalt-mixture-quantity", slug: "asphalt-mixture-quantity", title: "アスファルト混合物数量", category: "材料", purpose: "面積・舗装厚・利用者入力密度・ロス率から混合物の体積、重量、車両台数を概算する。", formula: ["正味体積=面積×舗装厚", "必要体積=正味体積×(1+ロス率/100)", "重量=必要体積×締固め後密度", "台数=ceil(重量/積載量)"], formulaVersion: "1.0.0",
    inputDefinitions: [numberInput("area", "面積", ["mm2", "cm2", "m2"], "舗装面積。"), selectInput("areaUnit", "面積単位", ["mm2", "cm2", "m2"], "面積へ適用。"), numberInput("thickness", "舗装厚", ["mm", "cm", "m"], "締固め後の平均厚さ。"), selectInput("thicknessUnit", "舗装厚単位", ["mm", "cm", "m"], "舗装厚へ適用。"), numberInput("density", "締固め後密度", ["kg/m3", "t/m3"], "配合・試験・設計図書を確認した変更可能値。"), selectInput("densityUnit", "密度単位", ["kg/m3", "t/m3"], "密度へ適用。"), numberInput("lossPercent", "ロス率", ["%"], "設計・施工条件を確認した値。"), numberInput("vehicleCapacity", "1台積載量", ["kg", "t"], "使用車両で確認した値。"), selectInput("vehicleCapacityUnit", "積載量単位", ["kg", "t"], "1台積載量へ適用。"), roundingInput],
    outputDefinitions: [output("requiredVolumeM3", "体積", "m³"), output("requiredMassT", "重量", "t"), output("vehicleCount", "車両台数", "台", true)], supportedUnits: ["mm²", "cm²", "m²", "mm", "cm", "m", "kg/m³", "t/m³", "kg", "t", "%", "台"], roundingRule,
    assumptions: ["密度を固定せず利用者が確認・変更する。", "厚さは締固め後の平均値。", "舗装性能・設計適否・発注数量の確定用途ではない。"], sources: [quantitySource, mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: asphaltMixtureFixtures,
  },
  {
    calculatorId: "rebar-weight", slug: "rebar-weight", title: "鉄筋重量", category: "材料", purpose: "呼び径を真円とみなし、鋼密度7,850kg/m³から1m重量・1本重量・総重量を幾何学的に概算する。", formula: ["断面積=π×(d/1000)²/4", "kg/m=断面積×7,850", "総重量=kg/m×長さ×本数"], formulaVersion: "1.0.0",
    inputDefinitions: [numberInput("diameterMm", "鉄筋径", ["mm"], "呼び径。真円直径として概算。"), numberInput("length", "1本長さ", ["mm", "cm", "m"], "1本の長さ。"), selectInput("lengthUnit", "長さ単位", ["mm", "cm", "m"], "1本長さへ適用。"), integerInput("quantity", "本数", "同じ径・長さの本数。"), roundingInput],
    outputDefinitions: [output("massPerMetreKg", "1m当たり重量", "kg/m"), output("massPerBarKg", "1本重量", "kg"), output("totalLengthM", "総延長", "m"), output("totalMassKg", "総重量", "kg"), output("totalMassT", "t換算", "t")], supportedUnits: ["mm", "cm", "m", "kg/m", "kg", "t"], roundingRule,
    assumptions: ["JIS単位質量表を転載せず、呼び径の真円断面と鋼密度から独立導出。", "異形形状、許容差、加工ロスを含まない。", "製品規格・ミルシートを別途確認。"], sources: [quantitySource, mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: rebarWeightFixtures,
  },
  {
    calculatorId: "rebar-spacing", slug: "rebar-spacing", title: "鉄筋本数・配筋ピッチ", category: "材料", purpose: "コンクリート表面からの左右かぶりと端部鉄筋を含み、指定ピッチを超えない等間隔配置の本数、中心間隔、総延長、概算重量を求める。", formula: ["中心間有効幅=施工幅−左かぶり−右かぶり−鉄筋径", "区間数=ceil(中心間有効幅/指定ピッチ)", "1段本数=区間数+1", "中心間隔=中心間有効幅/区間数", "総延長=本数×段数×1本長さ"], formulaVersion: "1.1.0",
    inputDefinitions: [numberInput("constructionWidth", "施工幅", ["mm", "cm", "m"], "左右のコンクリート表面間の全幅。"), numberInput("leftCover", "左かぶり", ["mm", "cm", "m"], "左コンクリート表面から端部鉄筋表面まで。"), numberInput("rightCover", "右かぶり", ["mm", "cm", "m"], "右コンクリート表面から端部鉄筋表面まで。"), numberInput("requestedPitch", "指定ピッチ", ["mm", "cm", "m"], "鉄筋中心間隔の上限。超えないよう区間数を切上げる。"), numberInput("barLength", "1本長さ", ["mm", "cm", "m"], "割付方向と直交する鉄筋長。"), numberInput("diameterMm", "鉄筋径", ["mm"], "中心位置と重量概算に使用。"), selectInput("dimensionUnit", "寸法単位", ["mm", "cm", "m"], "施工幅・かぶり・ピッチ・1本長さへ共通適用。鉄筋径はmm固定。"), integerInput("layers", "段数", "同じ割付の段数。"), roundingInput],
    outputDefinitions: [output("effectiveWidthM", "有効幅", "m"), output("totalBars", "必要本数", "本", true), output("actualSpacingM", "実配置間隔", "m"), output("totalLengthM", "総延長", "m"), output("totalMassKg", "重量", "kg")], supportedUnits: ["mm", "cm", "m", "本", "kg"], roundingRule,
    assumptions: ["かぶりはコンクリート表面から鉄筋表面までの最短距離。", "両端鉄筋の中心間を、指定ピッチを超えない等間隔に割り付ける。", "必要かぶり・継手・定着・構造適否を判定しない。"], sources: [commonSpecSource, mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: rebarSpacingFixtures,
  },
  {
    calculatorId: "formwork-area", slug: "formwork-area", title: "型枠面積", category: "数量", purpose: "基礎、柱、梁、壁、床版端部、任意面の選択面を分解し、控除後の型枠面積を概算する。",
    formula: ["基礎/柱=2LH+2WH", "梁=2LH+LW", "壁/床版端部=LH×面数", "任意面=LW×面数", "合計=(面別合計−控除)×個数"], formulaVersion: "1.0.0",
    inputDefinitions: [selectInput("shape", "部材形状", ["foundation", "column", "beam", "wall", "slab-edge", "custom"], "数量化する面の組合せを選ぶ。"), numberInput("length", "長さ", ["mm", "cm", "m"], "部材長。"), numberInput("width", "幅", ["mm", "cm", "m"], "基礎・柱の短辺、梁底幅、任意面の幅。", "shape=foundation|column|beam|custom"), numberInput("height", "高さ", ["mm", "cm", "m"], "側面高さ。", "shape=foundation|column|beam|wall|slab-edge"), selectInput("dimensionUnit", "寸法単位", ["mm", "cm", "m"], "長さ・幅・高さへ共通適用。"), numberInput("deductionArea", "控除面積（1個当たり）", ["mm2", "cm2", "m2"], "1個当たりについて、適用基準で控除対象となる面積だけ。"), selectInput("deductionAreaUnit", "控除面積単位", ["mm2", "cm2", "m2"], "1個当たりの控除面積へ適用。"), integerInput("faces", "面数", "壁・床版端部・任意面で数量化する面数。"), integerInput("quantity", "個数", "同形状の個数。"), roundingInput],
    outputDefinitions: [output("faceBreakdownM2", "面別面積", "m²"), output("grossAreaM2", "面別合計", "m²"), output("deductionAreaM2", "控除面積（1個当たり）", "m²"), output("netAreaPerItemM2", "控除後面積", "m²/個"), output("totalAreaM2", "合計面積", "m²")], supportedUnits: ["mm", "cm", "m", "mm²", "cm²", "m²"], roundingRule,
    assumptions: ["コンクリート接触面の単純矩形近似。", "基礎/柱は四側面、梁は側面2面と底面。", "控除要否、妻面、上面、目地、支保工は別途確認。"], sources: [quantitySource, mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: formworkFixtures,
  },
  {
    calculatorId: "slope-angle-length", slug: "slope-angle-length", title: "勾配・角度・斜長", category: "測量・勾配", purpose: "水平距離と高低差・勾配・角度・1:nのいずれかから相互変換し、斜長を求める。",
    formula: ["grade=rise/run", "% = grade×100", "‰ = grade×1000", "n=1/|grade|", "angle=atan(grade)", "sloped=√(run²+rise²)"], formulaVersion: "1.0.0",
    inputDefinitions: [selectInput("mode", "入力組合せ", ["rise-run", "percent-run", "angle-run", "ratio-run"], "高低差、%、角度、1:nから選ぶ。"), numberInput("horizontalDistance", "水平距離", ["mm", "cm", "m"], "0より大きい水平距離。"), numberInput("rise", "高低差", ["mm", "cm", "m"], "正は上り、負は下り。", "mode=rise-run"), numberInput("slopePercent", "勾配", ["%"], "符号付き勾配。", "mode=percent-run"), numberInput("angleDegrees", "角度", ["°"], "-89.999999°より大、89.999999°未満。", "mode=angle-run"), numberInput("ratioN", "1:nのn", ["比"], "0より大きいn。", "mode=ratio-run"), selectInput("lengthUnit", "長さ単位", ["mm", "cm", "m"], "水平距離・高低差へ共通適用。"), roundingInput],
    outputDefinitions: [output("slopePercent", "勾配", "%"), output("slopePermille", "勾配", "‰"), output("ratioN", "1:n", "比"), output("angleDegrees", "角度", "°"), output("riseM", "高低差", "m"), output("slopedLengthM", "斜長", "m")], supportedUnits: ["mm", "cm", "m", "%", "‰", "1:n", "°"], roundingRule,
    assumptions: ["同一平面の直角三角形。", "負値は方向だけを表す。", "設計勾配・安全可否を判定しない。"], sources: [mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: slopeFixtures,
  },
  {
    calculatorId: "drainage-slope", slug: "drainage-slope", title: "排水勾配・必要高低差", category: "測量・勾配", purpose: "一定勾配の延長、基準標高、流下方向から必要高低差、始終点標高、等間隔標高を求める。",
    formula: ["差=延長×grade", "始点→終点: end=start−差", "終点→始点: start=end−差", "区間標高=線形補間"], formulaVersion: "1.0.0",
    inputDefinitions: [numberInput("length", "延長", ["mm", "cm", "m"], "勾配を適用する水平延長。"), selectInput("lengthUnit", "延長単位", ["mm", "cm", "m"], "延長へ適用。"), selectInput("gradeMode", "勾配形式", ["percent", "permille", "ratio"], "%、‰、1:nから選ぶ。"), numberInput("gradeValue", "勾配値", ["%", "‰", "n"], "%/‰は負数も入力でき、逆勾配警告を出す。"), selectInput("referencePoint", "基準点", ["start", "end"], "入力標高が始点か終点か。"), numberInput("referenceElevationM", "基準標高", ["m"], "負標高も可。"), selectInput("flowDirection", "流下方向", ["start-to-end", "end-to-start"], "水を流す向き。"), integerInput("intervalCount", "区間数", "標高一覧の等分数。1〜100。"), roundingInput],
    outputDefinitions: [output("requiredDifferenceM", "必要高低差", "m"), output("startElevationM", "始点標高", "m"), output("endElevationM", "終点標高", "m"), output("stationElevations", "区間標高", "m"), output("reverseSlopeWarning", "逆勾配警告", "boolean")], supportedUnits: ["mm", "cm", "m", "%", "‰", "1:n"], roundingRule,
    assumptions: ["全延長で一定勾配。", "標高はm。", "負の%/‰は指定流下方向に対する逆勾配として警告。", "必要勾配や排水能力を判定しない。"], sources: [mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: drainageSlopeFixtures,
  },
  {
    calculatorId: "scale-coordinate", slug: "scale-coordinate", title: "図面縮尺・座標距離・方位角", category: "測量・図面", purpose: "縮尺1:Nの図上寸法/実寸変換、または局所平面座標2点の差・距離・方位角を求める。",
    formula: ["実寸=図上寸法×N", "図上寸法=実寸/N", "ΔX=X₂−X₁", "ΔY=Y₂−Y₁", "距離=√(ΔX²+ΔY²)", "方位角=atan2(ΔY,ΔX) mod 360"], formulaVersion: "1.0.0",
    inputDefinitions: [selectInput("mode", "モード", ["scale", "coordinate"], "縮尺変換または座標。"), selectInput("solveFor", "求める寸法", ["actual", "drawing"], "実寸または図上寸法。", "mode=scale"), numberInput("scaleDenominator", "縮尺分母N", ["比"], "1:NのN。", "mode=scale"), numberInput("drawingLength", "図上寸法", ["mm", "cm", "m"], "実寸を求める場合の図上寸法。", "mode=scale&solveFor=actual"), selectInput("drawingUnit", "図上寸法単位", ["mm", "cm", "m"], "図上寸法へ適用。", "mode=scale"), numberInput("actualLength", "実寸", ["mm", "cm", "m"], "図上寸法を求める場合の実寸。", "mode=scale&solveFor=drawing"), selectInput("actualUnit", "実寸単位", ["mm", "cm", "m"], "実寸へ適用。", "mode=scale"), numberInput("x1", "X1", ["mm", "cm", "m"], "点1の北方向座標。", "mode=coordinate"), numberInput("y1", "Y1", ["mm", "cm", "m"], "点1の東方向座標。", "mode=coordinate"), numberInput("x2", "X2", ["mm", "cm", "m"], "点2の北方向座標。", "mode=coordinate"), numberInput("y2", "Y2", ["mm", "cm", "m"], "点2の東方向座標。", "mode=coordinate"), selectInput("coordinateUnit", "座標単位", ["mm", "cm", "m"], "4座標へ共通適用。", "mode=coordinate"), roundingInput],
    outputDefinitions: [output("drawingLength", "図上寸法", "選択単位"), output("actualLength", "実寸", "選択単位"), output("deltaXM", "ΔX", "m"), output("deltaYM", "ΔY", "m"), output("horizontalDistanceM", "水平距離", "m"), output("azimuthDegrees", "方位角", "°")], supportedUnits: ["mm", "cm", "m", "°"], roundingRule,
    assumptions: ["座標はX北・Y東の局所平面。", "方位角は北から時計回り。", "測地補正、地球曲率、標高補正、印刷倍率誤差を含めない。"], sources: [gsiSource, mathSource], checkedAt: CHECKED_AT, riskLevel: "low", clientOnly: true, testFixtures: scaleCoordinateFixtures,
  },
] as const;

export type ConstructionCalculatorSlug =
  (typeof constructionCalculatorRegistry)[number]["slug"];

export function getConstructionCalculatorFormula(
  slug: string,
): FormulaRegistryEntry | undefined {
  return constructionCalculatorRegistry.find((entry) => entry.slug === slug);
}

export const constructionCalculatorSlugs = constructionCalculatorRegistry.map(
  (entry) => entry.slug,
);

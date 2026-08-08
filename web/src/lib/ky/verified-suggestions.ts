import type {
  KyHazardCandidate,
  KyMeasureCandidate,
  KyWeatherSnapshot,
} from "@/lib/ky/zero-friction-types";

type VerifiedHazardDefinition = Omit<KyHazardCandidate, "reason" | "relevance"> & {
  keywords: string[];
  reasonTemplate: string;
};

function measureOriginForSource(
  sourceRef: string,
): Exclude<KyMeasureCandidate["origin"], undefined> {
  if (sourceRef.startsWith("visual-kyt:")) return "reviewed-visual-kyt";
  if (sourceRef.startsWith("accident-type:")) return "accident-classification";
  if (sourceRef.startsWith("mhlw:") || sourceRef.startsWith("jma:")) {
    return "official-guidance";
  }
  return "verified-library";
}

const measure = (
  id: string,
  text: string,
  level: KyMeasureCandidate["level"],
  sourceLabel: string,
  sourceRef: string,
): KyMeasureCandidate => ({
  id,
  text,
  level,
  sourceLabel,
  sourceRef,
  // 危険候補の由来を継承せず、対策そのものの参照先から独立に確定する。
  origin: measureOriginForSource(sourceRef),
});

const VISUAL_SOURCE = "reviewed Visual KYT（一次資料照合済み）";
const ACCIDENT_SOURCE = "厚労省事故型分類・既存事故データ";
const OFFICIAL_SOURCE = "厚生労働省・確認済み安全資料";

const DEFINITIONS: VerifiedHazardDefinition[] = [
  {
    id: "fall-scaffold",
    title: "墜落・転落",
    accidentType: "墜落・転落",
    reasonTemplate: "足場・高所・開口部に関係する作業が含まれるため",
    sourceLabel: VISUAL_SOURCE,
    sourceRef: "visual-kyt:vkyt-001",
    origin: "reviewed-visual-kyt",
    keywords: [
      "足場",
      "高所",
      "屋根",
      "屋上",
      "開口",
      "外壁",
      "脚立",
      "梯子",
      "はしご",
      "昇降",
    ],
    measures: [
      measure(
        "fall-change-method",
        "地上組立て等へ作業方法を変更し、高所作業を減らす",
        "elimination",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-001",
      ),
      measure(
        "fall-guardrail",
        "作業床・上桟・中桟・幅木を含む手すり設備を設置する",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-001",
      ),
      measure(
        "fall-cover",
        "開口部を覆い、容易に外れない方法で固定する",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-001",
      ),
      measure(
        "fall-access",
        "安全な昇降設備と作業前点検を確保する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:fall-prevention",
      ),
      measure(
        "fall-harness",
        "必要な場合は適合するフルハーネスを承認済み取付設備へ接続する",
        "ppe",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-001",
      ),
    ],
  },
  {
    id: "falling-object",
    title: "飛来・落下",
    accidentType: "飛来・落下",
    reasonTemplate: "上部で資材・工具を扱う作業が含まれるため",
    sourceLabel: VISUAL_SOURCE,
    sourceRef: "visual-kyt:vkyt-001",
    origin: "reviewed-visual-kyt",
    keywords: ["足場", "高所", "外壁", "パネル", "揚重", "吊", "クレーン", "荷下ろし", "荷揚げ"],
    measures: [
      measure(
        "drop-preassemble",
        "地上で組み立て、上部で扱う部材と工具を減らす",
        "elimination",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-001",
      ),
      measure(
        "drop-toeboard",
        "幅木・落下防止網・工具落下防止具を設置する",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-001",
      ),
      measure(
        "drop-zone",
        "落下範囲を区画し、上下作業を時間または場所で分離する",
        "administrative",
        ACCIDENT_SOURCE,
        "accident-type:falling-object",
      ),
      measure(
        "drop-inspect",
        "部材の固定と工具数を作業前後に確認する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:falling-object",
      ),
      measure(
        "drop-helmet",
        "適合する保護帽を着用する",
        "ppe",
        OFFICIAL_SOURCE,
        "mhlw:ppe",
      ),
    ],
  },
  {
    id: "wind-panel",
    title: "風荷重による資材のあおられ",
    accidentType: "飛来・落下／転倒",
    reasonTemplate: "パネル・シート等の風を受ける資材を屋外で扱うため",
    sourceLabel: VISUAL_SOURCE,
    sourceRef: "visual-kyt:vkyt-015",
    origin: "reviewed-visual-kyt",
    keywords: ["外壁", "パネル", "シート", "屋外", "強風", "風", "搬入"],
    measures: [
      measure(
        "wind-stop",
        "中止基準を超える風では作業を行わない",
        "elimination",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-015",
      ),
      measure(
        "wind-smaller-load",
        "部材を小分けするか治具で保持し、受風面積を減らす",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-015",
      ),
      measure(
        "wind-anchor",
        "仮置き材・シート・区画材を固定する",
        "engineering",
        OFFICIAL_SOURCE,
        "mhlw:wind-work",
      ),
      measure(
        "wind-measure",
        "現場の風速を測り、責任者が中止・再開を判断する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:wind-work",
      ),
      measure(
        "wind-zone",
        "あおられ方向と落下範囲を立入禁止にする",
        "administrative",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-015",
      ),
    ],
  },
  {
    id: "vehicle-collision",
    title: "車両との接触・激突され",
    accidentType: "交通事故・激突され",
    reasonTemplate: "フォークリフト・トラック等の車両移動が含まれるため",
    sourceLabel: ACCIDENT_SOURCE,
    sourceRef: "accident-type:vehicle-collision",
    origin: "accident-classification",
    keywords: ["フォークリフト", "リフト", "トラック", "車両", "後退", "搬入", "荷下ろし", "運搬"],
    measures: [
      measure(
        "vehicle-separate-time",
        "歩行者作業と車両作業を時間で分離する",
        "elimination",
        ACCIDENT_SOURCE,
        "accident-type:vehicle-collision",
      ),
      measure(
        "vehicle-separate-route",
        "防護柵等で歩車動線を物理的に分離する",
        "engineering",
        ACCIDENT_SOURCE,
        "accident-type:vehicle-collision",
      ),
      measure(
        "vehicle-visibility",
        "死角を減らすミラー・警報器・照明を機能確認する",
        "engineering",
        OFFICIAL_SOURCE,
        "mhlw:vehicle-work",
      ),
      measure(
        "vehicle-spotter",
        "誘導員を配置し、合図が見えない場合は停止する",
        "administrative",
        ACCIDENT_SOURCE,
        "accident-type:vehicle-collision",
      ),
      measure(
        "vehicle-zone",
        "旋回・後退・荷役範囲を区画し、立入りを止める",
        "administrative",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-003",
      ),
    ],
  },
  {
    id: "forklift-load",
    title: "荷の崩れ・落下と挟まれ",
    accidentType: "飛来・落下／はさまれ・巻き込まれ",
    reasonTemplate: "フォークリフト等で荷を上げ下げする作業が含まれるため",
    sourceLabel: ACCIDENT_SOURCE,
    sourceRef: "accident-type:load-handling",
    origin: "accident-classification",
    keywords: ["フォークリフト", "リフト", "荷下ろし", "荷役", "積荷", "パレット", "資材"],
    measures: [
      measure(
        "load-stable-method",
        "不安定な荷姿を組み直し、持ち上げない",
        "elimination",
        ACCIDENT_SOURCE,
        "accident-type:load-handling",
      ),
      measure(
        "load-restraint",
        "荷を適正なパレット・固定具で保持する",
        "engineering",
        OFFICIAL_SOURCE,
        "mhlw:forklift",
      ),
      measure(
        "load-capacity",
        "許容荷重・重心・フォーク差込みを作業前に確認する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:forklift",
      ),
      measure(
        "load-no-under",
        "フォーク・荷の下と倒壊方向を立入禁止にする",
        "administrative",
        ACCIDENT_SOURCE,
        "accident-type:load-handling",
      ),
      measure(
        "load-lower-travel",
        "走行時は荷を低くし、視界を確保できない場合は誘導する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:forklift",
      ),
    ],
  },
  {
    id: "chemical-exposure",
    title: "有機溶剤・化学物質へのばく露",
    accidentType: "有害物等との接触",
    reasonTemplate: "有機溶剤・化学品の使用が含まれるため",
    sourceLabel: VISUAL_SOURCE,
    sourceRef: "visual-kyt:vkyt-009",
    origin: "reviewed-visual-kyt",
    keywords: ["有機溶剤", "溶剤", "薬品", "化学", "塗装", "接着剤", "洗浄剤", "シンナー", "SDS"],
    measures: [
      measure(
        "chemical-substitute",
        "より有害性の低い物質または密閉工程へ変更する",
        "elimination",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-009",
      ),
      measure(
        "chemical-local-exhaust",
        "発散源を密閉し、局所排気を有効な位置で使用する",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-009",
      ),
      measure(
        "chemical-spill",
        "受け皿・吸着材を準備し、排水口への流出を防ぐ",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-009",
      ),
      measure(
        "chemical-sds",
        "最新SDSとリスクアセスメント結果、使用量、換気条件を確認する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:chemical-ra",
      ),
      measure(
        "chemical-respirator",
        "選定根拠を確認した呼吸用保護具・手袋・眼保護具を使用する",
        "ppe",
        OFFICIAL_SOURCE,
        "mhlw:chemical-ppe",
      ),
    ],
  },
  {
    id: "chemical-splash",
    title: "化学品の飛沫・皮膚眼障害",
    accidentType: "有害物等との接触",
    reasonTemplate: "化学品の開放取扱い・移替えが想定されるため",
    sourceLabel: VISUAL_SOURCE,
    sourceRef: "visual-kyt:vkyt-009",
    origin: "reviewed-visual-kyt",
    keywords: ["薬品", "化学", "移替", "注入", "混合", "有機溶剤", "洗浄剤"],
    measures: [
      measure(
        "splash-closed",
        "開放移替えをやめ、専用の密閉容器・ポンプへ変更する",
        "elimination",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-009",
      ),
      measure(
        "splash-guard",
        "飛散防止カバーと受け皿を設ける",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-009",
      ),
      measure(
        "splash-eyewash",
        "洗眼・洗身設備への動線を確保し使用前確認する",
        "engineering",
        OFFICIAL_SOURCE,
        "mhlw:chemical-emergency",
      ),
      measure(
        "splash-procedure",
        "容器表示と混触禁止を確認し、こぼれた場合の手順を共有する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:chemical-ra",
      ),
      measure(
        "splash-ppe",
        "耐薬品手袋・ゴーグル・保護衣をSDSに基づき選定する",
        "ppe",
        OFFICIAL_SOURCE,
        "mhlw:chemical-ppe",
      ),
    ],
  },
  {
    id: "heat-illness",
    title: "熱中症",
    accidentType: "高温・低温の物との接触／熱中症",
    reasonTemplate: "高温・炎天下・高WBGTに関係する条件が含まれるため",
    sourceLabel: VISUAL_SOURCE,
    sourceRef: "visual-kyt:vkyt-010",
    origin: "reviewed-visual-kyt",
    keywords: ["炎天下", "暑", "高温", "熱中症", "舗装", "屋外", "WBGT", "夏"],
    measures: [
      measure(
        "heat-reschedule",
        "高温時間帯を避けるか、作業を延期・短縮する",
        "elimination",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-010",
      ),
      measure(
        "heat-shade",
        "日陰・冷房・送風を備えた休憩場所を作業点近くに設ける",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-010",
      ),
      measure(
        "heat-wbgt",
        "現場でWBGTを実測し、値と作業強度に応じて休憩・中止を判断する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:heatstroke-2025",
      ),
      measure(
        "heat-buddy",
        "単独作業を避け、症状の相互確認・報告・作業離脱手順を共有する",
        "administrative",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-010",
      ),
      measure(
        "heat-cooling-ppe",
        "通気性のよい作業着・冷却用品を作業条件に合わせて使用する",
        "ppe",
        OFFICIAL_SOURCE,
        "mhlw:heatstroke-2025",
      ),
    ],
  },
  {
    id: "slip-wet",
    title: "濡れた床・路面での滑り",
    accidentType: "転倒",
    reasonTemplate: "雨天・水濡れ・屋外搬入に関係する条件が含まれるため",
    sourceLabel: VISUAL_SOURCE,
    sourceRef: "visual-kyt:vkyt-015",
    origin: "reviewed-visual-kyt",
    keywords: ["雨", "雨天", "濡", "冠水", "水", "搬入", "屋外"],
    measures: [
      measure(
        "slip-delay",
        "排水・除水が完了するまで当該経路を使用しない",
        "elimination",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-015",
      ),
      measure(
        "slip-drain",
        "排水・滑り止め・仮設通路を設ける",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-011",
      ),
      measure(
        "slip-route",
        "濡れた箇所を区画し、安全な搬入動線へ変更する",
        "administrative",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-015",
      ),
      measure(
        "slip-light",
        "照明を確保し、段差・水たまりを作業前に点検する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:fall-on-same-level",
      ),
      measure(
        "slip-footwear",
        "路面に適した耐滑性のある履物を使用する",
        "ppe",
        OFFICIAL_SOURCE,
        "mhlw:fall-on-same-level",
      ),
    ],
  },
  {
    id: "electric-shock",
    title: "感電",
    accidentType: "感電",
    reasonTemplate: "電気設備・仮設電源・水濡れに関係する作業が含まれるため",
    sourceLabel: VISUAL_SOURCE,
    sourceRef: "visual-kyt:vkyt-007",
    origin: "reviewed-visual-kyt",
    keywords: ["電気", "配線", "電源", "盤", "ケーブル", "充電", "感電", "水濡"],
    measures: [
      measure(
        "electric-deenergize",
        "停電できる作業方法へ変更し、電源を遮断する",
        "elimination",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-007",
      ),
      measure(
        "electric-lockout",
        "遮断器をロック・表示し、検電して無電圧を確認する",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-007",
      ),
      measure(
        "electric-rcd",
        "漏電遮断器・接地・防水接続を点検する",
        "engineering",
        VISUAL_SOURCE,
        "visual-kyt:vkyt-007",
      ),
      measure(
        "electric-qualified",
        "作業範囲と資格、復電手順、立入禁止を確認する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:electrical-work",
      ),
      measure(
        "electric-ppe",
        "作業電圧に適合する絶縁用保護具を使用する",
        "ppe",
        OFFICIAL_SOURCE,
        "mhlw:electrical-ppe",
      ),
    ],
  },
  {
    id: "pinch-hand",
    title: "手指・身体の挟まれ",
    accidentType: "はさまれ・巻き込まれ",
    reasonTemplate: "重量物・部材の位置合わせや機械作業が含まれるため",
    sourceLabel: ACCIDENT_SOURCE,
    sourceRef: "accident-type:caught",
    origin: "accident-classification",
    keywords: ["取付", "据付", "パネル", "荷", "資材", "機械", "組立", "搬入", "フォークリフト"],
    measures: [
      measure(
        "pinch-jig",
        "人手保持をやめ、治具・補助具で部材を保持する",
        "elimination",
        ACCIDENT_SOURCE,
        "accident-type:caught",
      ),
      measure(
        "pinch-guard",
        "挟まれ点へ手を入れずに位置合わせできるガイドを設ける",
        "engineering",
        ACCIDENT_SOURCE,
        "accident-type:caught",
      ),
      measure(
        "pinch-block",
        "荷・部材の不意な移動を止めるストッパーを使用する",
        "engineering",
        OFFICIAL_SOURCE,
        "mhlw:caught-prevention",
      ),
      measure(
        "pinch-signal",
        "合図者を決め、全員の退避確認後だけ動かす",
        "administrative",
        ACCIDENT_SOURCE,
        "accident-type:caught",
      ),
      measure(
        "pinch-stop",
        "視界不良・合図不一致時は作業を停止する",
        "administrative",
        ACCIDENT_SOURCE,
        "accident-type:caught",
      ),
    ],
  },
  {
    id: "manual-handling",
    title: "無理な姿勢・重量物取扱い",
    accidentType: "動作の反動・無理な動作",
    reasonTemplate: "資材の運搬・持上げ・取付作業が含まれるため",
    sourceLabel: ACCIDENT_SOURCE,
    sourceRef: "accident-type:manual-handling",
    origin: "accident-classification",
    keywords: ["運搬", "搬入", "持", "重量", "資材", "パネル", "荷", "取付"],
    measures: [
      measure(
        "manual-mechanize",
        "手運びをやめ、台車・揚重機・吸着治具を使用する",
        "elimination",
        ACCIDENT_SOURCE,
        "accident-type:manual-handling",
      ),
      measure(
        "manual-height",
        "腰高で扱える仮置き台と十分な作業空間を設ける",
        "engineering",
        OFFICIAL_SOURCE,
        "mhlw:back-pain",
      ),
      measure(
        "manual-weight",
        "重量・重心・運搬経路を確認し、分割または複数名で扱う",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:back-pain",
      ),
      measure(
        "manual-rotate",
        "連続時間を短くし、作業を交替する",
        "administrative",
        OFFICIAL_SOURCE,
        "mhlw:back-pain",
      ),
      measure(
        "manual-grip",
        "滑りにくい手袋と履物を作業条件に合わせて使用する",
        "ppe",
        OFFICIAL_SOURCE,
        "mhlw:ppe",
      ),
    ],
  },
  {
    id: "lightning-outdoor",
    title: "雷による屋外・高所作業の危険",
    accidentType: "感電／墜落・転落",
    reasonTemplate: "雷のおそれがある屋外・高所作業のため",
    sourceLabel: OFFICIAL_SOURCE,
    sourceRef: "jma:lightning-information",
    origin: "official-guidance",
    keywords: ["雷", "雷雨", "屋外", "高所", "足場", "クレーン"],
    measures: [
      measure(
        "lightning-stop",
        "雷のおそれがある間は屋外・高所作業を中止する",
        "elimination",
        OFFICIAL_SOURCE,
        "jma:lightning-information",
      ),
      measure(
        "lightning-shelter",
        "安全な退避場所と退避経路を事前に確保する",
        "engineering",
        OFFICIAL_SOURCE,
        "jma:lightning-information",
      ),
      measure(
        "lightning-monitor",
        "気象庁情報を監視する担当者と中止・再開基準を決める",
        "administrative",
        OFFICIAL_SOURCE,
        "jma:lightning-information",
      ),
      measure(
        "lightning-evacuate",
        "雷鳴・積乱雲を確認したら直ちに退避する",
        "administrative",
        OFFICIAL_SOURCE,
        "jma:lightning-information",
      ),
    ],
  },
];

const FALLBACK_IDS = ["pinch-hand", "manual-handling", "slip-wet"];

export function normalizeKyCandidateText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/[\s\u3000・･,，.。/／\\()[\]（）「」『』:：-]/g, "")
    .trim();
}

function keywordScore(normalizedWork: string, keywords: string[]): number {
  return keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeKyCandidateText(keyword);
    if (!normalizedKeyword || !normalizedWork.includes(normalizedKeyword)) {
      return score;
    }
    return score + Math.min(18, 6 + normalizedKeyword.length * 2);
  }, 0);
}

function fromDefinition(
  definition: VerifiedHazardDefinition,
  relevance: number,
  reason = definition.reasonTemplate,
  sourceLabel = definition.sourceLabel,
  sourceRef = definition.sourceRef,
  origin = definition.origin,
): KyHazardCandidate {
  const { keywords: _keywords, reasonTemplate: _reason, ...candidate } = definition;
  return {
    ...candidate,
    measures: candidate.measures.map((item) => ({
      ...item,
      origin: item.origin ?? definition.origin,
    })),
    reason,
    sourceLabel,
    sourceRef,
    origin,
    relevance,
  };
}

function weatherCandidateIds(weather: KyWeatherSnapshot | null): Array<{
  id: string;
  reason: string;
  manual: boolean;
}> {
  if (!weather || weather.stale) return [];
  const found: Array<{ id: string; reason: string; manual: boolean }> = [];
  if (
    weather.heatAlert === "active" ||
      weather.specialHeatAlert === "active" ||
      (typeof weather.wbgtCelsius === "number" && weather.wbgtCelsius >= 28)
  ) {
    const manualWbgt =
      weather.heatAlert !== "active" &&
      weather.specialHeatAlert !== "active" &&
      weather.manuallyEditedFields.includes("wbgt");
    const reason =
      weather.specialHeatAlert === "active"
        ? "気象からの候補：熱中症特別警戒アラートが発表中のため"
        : weather.heatAlert === "active"
          ? "気象からの候補：熱中症警戒アラートが発表中のため"
          : manualWbgt
            ? `手動修正値からの候補：WBGT ${weather.wbgtCelsius?.toFixed(1)}℃のため`
            : `気象からの候補：推定WBGT ${weather.wbgtCelsius?.toFixed(1)}℃のため`;
    found.push({
      id: "heat-illness",
      reason,
      manual: manualWbgt,
    });
  }
  if (
    /雨|雷雨/.test(weather.weather ?? "") ||
    (weather.precipitationMm ?? 0) > 0
  ) {
    const manualWeather =
      /雨|雷雨/.test(weather.weather ?? "") &&
      weather.manuallyEditedFields.includes("weather");
    found.push({
      id: "slip-wet",
      reason: manualWeather
        ? "手動修正値からの候補：雨天条件が入力されたため"
        : "気象からの候補：雨・降水が見込まれるため",
      manual: manualWeather,
    });
  }
  if ((weather.windSpeedMs ?? 0) >= 10) {
    found.push({
      id: "wind-panel",
      reason: `気象からの候補：予想最大風速 ${weather.windSpeedMs?.toFixed(1)}m/sのため`,
      manual: false,
    });
  }
  if (
    /雷/.test(weather.weather ?? "") ||
    weather.warnings.some((warning) => warning.code === "14")
  ) {
    const hasLightningWarning = weather.warnings.some(
      (warning) => warning.code === "14",
    );
    const manualWeather =
      !hasLightningWarning &&
      /雷/.test(weather.weather ?? "") &&
      weather.manuallyEditedFields.includes("weather");
    found.push({
      id: "lightning-outdoor",
      reason: manualWeather
        ? "手動修正値からの候補：雷の条件が入力されたため"
        : "気象からの候補：雷のおそれまたは雷注意報を確認したため",
      manual: manualWeather,
    });
  }
  return found;
}

export function suggestVerifiedHazards(
  workDescription: string,
  weather: KyWeatherSnapshot | null = null,
): KyHazardCandidate[] {
  const normalizedWork = normalizeKyCandidateText(workDescription);
  if (normalizedWork.length < 4) return [];

  const byId = new Map<string, KyHazardCandidate>();
  for (const definition of DEFINITIONS) {
    const score = keywordScore(normalizedWork, definition.keywords);
    if (score <= 0) continue;
    byId.set(definition.id, fromDefinition(definition, 50 + score));
  }

  for (const weatherMatch of weatherCandidateIds(weather)) {
    const definition = DEFINITIONS.find((item) => item.id === weatherMatch.id);
    if (!definition) continue;
    const weatherCandidate = fromDefinition(
      definition,
      92,
      weatherMatch.reason,
      weatherMatch.manual
        ? "手動修正値からの候補"
        : "気象からの候補（取得値は現場実測ではありません）",
      `weather:${weather?.areaId ?? "unresolved"}`,
      "weather",
    );
    const existing = byId.get(definition.id);
    byId.set(
      definition.id,
      existing && existing.relevance > weatherCandidate.relevance
        ? existing
        : weatherCandidate,
    );
  }

  if (byId.size === 0) {
    for (const id of FALLBACK_IDS) {
      const definition = DEFINITIONS.find((item) => item.id === id);
      if (!definition) continue;
      byId.set(
        id,
        fromDefinition(
          definition,
          20,
          "作業の動線・部材・姿勢を現場で確認するための基本候補",
        ),
      );
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.relevance - a.relevance || a.title.localeCompare(b.title, "ja"))
    .map((candidate) => ({
      ...candidate,
      measures: [...candidate.measures].sort((a, b) => {
        const order = {
          elimination: 0,
          engineering: 1,
          administrative: 2,
          ppe: 3,
        } as const;
        return order[a.level] - order[b.level];
      }),
    }));
}

export function verifiedHazardById(id: string): KyHazardCandidate | null {
  const definition = DEFINITIONS.find((item) => item.id === id);
  return definition ? fromDefinition(definition, 100) : null;
}

export function measuresForHazardText(text: string): KyMeasureCandidate[] {
  const normalized = normalizeKyCandidateText(text);
  if (!normalized) return [];
  const scored = DEFINITIONS.map((definition) => ({
    definition,
    score:
      keywordScore(normalized, [definition.title, definition.accidentType]) +
      keywordScore(normalized, definition.keywords),
  })).sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].score > 0
    ? scored[0].definition.measures.map((item) => ({
        ...item,
        origin: item.origin ?? scored[0]!.definition.origin,
      }))
    : [];
}

export function dedupeHazardCandidates(
  candidates: KyHazardCandidate[],
): KyHazardCandidate[] {
  const byTitle = new Map<string, KyHazardCandidate>();
  for (const candidate of candidates) {
    const key = normalizeKyCandidateText(candidate.title);
    const previous = byTitle.get(key);
    if (!previous || candidate.relevance > previous.relevance) {
      byTitle.set(key, candidate);
    }
  }
  return [...byTitle.values()];
}

export function hasDuplicateHazardText(
  existingTitles: string[],
  candidate: string,
): boolean {
  const normalized = normalizeKyCandidateText(candidate);
  return Boolean(
    normalized &&
      existingTitles.some(
        (title) => normalizeKyCandidateText(title) === normalized,
      ),
  );
}

import {
  visualKyScenarioSchema,
  type VisualKyScenario,
} from "./schema";
import { VISUAL_KY_SOURCES as S } from "./sources";

type FacilitatorInput = Pick<
  VisualKyScenario["facilitator"],
  | "learningObjectives"
  | "openingQuestion"
  | "followUpQuestions"
  | "revealCue"
  | "commonMistakes"
  | "summary"
>;

function facilitator(
  input: FacilitatorInput,
): VisualKyScenario["facilitator"] {
  return {
    ...input,
    coursePlans: {
      five: [
        "0:00 画像だけを見せ、最初の問いかけを行う",
        "0:30 各自で危険箇所を1つ以上考える",
        "2:00 参加者の回答を短く共有する",
        "3:20 解答と優先対策を表示する",
        "4:30 今日の行動を1つ決めて終了する",
      ],
      ten: [
        "0:00 学習目標と合成場面であることを伝える",
        "1:00 個人で危険箇所を探す",
        "3:00 2人組または全体で理由を共有する",
        "5:30 解答を表示し、対策の優先順位を選ぶ",
        "8:30 作業中止条件と現場への置換を確認する",
      ],
      fifteen: [
        "0:00 学習目標、進め方、時間を共有する",
        "1:30 個人で危険源・事故型・対策を考える",
        "4:30 参加者の回答を板書または口頭で整理する",
        "8:00 解答、一次資料、関連事故を確認する",
        "11:30 KY用紙候補を現場条件に合わせて人手確認する",
      ],
    },
  };
}

function accident(
  id: `mhlw-${number}`,
  label: string,
): VisualKyScenario["relatedAccidents"][number] {
  return {
    id,
    label,
    // Curated references are intentionally not exposed as official accident
    // detail pages. The detail route fails closed unless its source has been
    // manually verified, so keep these references on the public database hub.
    href: "/accidents",
    sourceStatus: "curated",
  };
}

function law(
  id: string,
  label: string,
  query: string,
  locator: string,
): VisualKyScenario["relatedLaws"][number] {
  return {
    id,
    label,
    href: `/law-search?q=${encodeURIComponent(query)}`,
    locator,
  };
}

function qualification(
  id: string,
  label: string,
  condition: string,
): VisualKyScenario["relatedQualifications"][number] {
  return {
    id,
    label,
    href: "/education-certification/finder",
    condition,
  };
}

const publication = {
  synthetic: true,
  syntheticDisclosure:
    "この場面は安全教育用に作成した架空の学習例で、特定の公表事故や実在現場を再現したものではありません。",
  reviewedBy: "安全AIポータル編集部（一次資料照合）",
  reviewedDate: "2026-07-30",
  reviewStatus: "reviewed",
  indexability: "index",
  rightsStatus: "generated-for-this-project",
  updatedDate: "2026-07-30",
} as const;

const rawScenarios: VisualKyScenario[] = [
  {
    id: "vkyt-001",
    slug: "scaffold-fall",
    title: "足場の開口部と未接続ランヤードから墜落を防ぐ",
    shortTitle: "足場からの墜落",
    category: "scaffold",
    categoryTags: ["scaffold", "fall"],
    industry: ["建設業", "設備工事業"],
    difficulty: "標準",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/scaffold-fall.webp",
      width: 1600,
      height: 900,
      alt: "建物外周の足場に作業者2人と地上作業者1人がおり、床の隙間、開いた端部、未接続のランヤード、端部近くの工具が見える合成安全教育イラスト",
      fullDescription:
        "建物外周に三層の鋼管足場があります。中央の中段ではフルハーネスを着けた作業者が移動中ですが、ランヤードは取付設備に接続されていません。作業床の一部はずれて隙間があり、外側の手すりも連続していません。右側の同じ層には、黄色い保護帽と蛍光ベストを着けた別の作業者が、手すり内側で床材に手を添えて座っています。右側の床端には工具が置かれています。地上の作業者は立入防止柵の外から足場を見上げています。負傷者や墜落の瞬間は描かれていません。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-open-edge",
        x: 59,
        y: 55,
        radius: 5,
        label: "手すりが連続していない作業床端部",
        hazardId: "haz-open-edge",
      },
      {
        id: "spot-lanyard",
        x: 49,
        y: 43,
        radius: 5,
        label: "取付設備へ接続されていないランヤード",
        hazardId: "haz-lanyard",
      },
      {
        id: "spot-plank-gap",
        x: 55,
        y: 61,
        radius: 5,
        label: "ずれた足場板と床の隙間",
        hazardId: "haz-plank-gap",
      },
      {
        id: "spot-edge-tools",
        x: 66,
        y: 58,
        radius: 4,
        label: "床端近くに置かれた工具",
        hazardId: "haz-edge-tools",
      },
      {
        id: "spot-ground-zone",
        x: 19,
        y: 76,
        radius: 5,
        label: "地上の立入防止柵の外にいる作業者",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-open-edge",
        hotspotId: "spot-open-edge",
        title: "開いた作業床端部",
        what: "作業床の外側に連続した手すり・中桟がなく、身体を支える設備が途切れています。",
        why: "移動中のよろめきや資材との接触だけで、身体が端部から外へ出る可能性があります。",
        possibleAccident: "足場から地上または下段へ墜落し、死亡・重篤な外傷につながります。",
        firstAction: "端部へ近づかず作業を止め、手すり等の墜落防止設備を復旧します。",
        engineeringControls: [
          "上桟・中桟・幅木を含む連続した手すり設備を先行して設ける",
          "作業床の開口を覆い、容易に外れない方法で固定する",
        ],
        administrativeControls: [
          "足場使用前点検と不備箇所の使用禁止表示を行う",
          "変更・悪天候後を含む点検者と是正責任者を明確にする",
        ],
        ppe: ["適合する保護帽", "フルハーネス型墜落制止用器具"],
        stopEscalationConditions: [
          "手すり・作業床・取付設備の不備を発見したとき",
          "強風・大雨等で安全な移動や姿勢保持が困難なとき",
        ],
        sourceIds: [S.scaffoldRules.id, S.fallPlan.id],
      },
      {
        id: "haz-lanyard",
        hotspotId: "spot-lanyard",
        title: "ランヤードの未接続",
        what: "フルハーネスを着用していても、ランヤードが取付設備へ接続されていません。",
        why: "墜落が始まった後に器具を接続することはできず、着用だけでは墜落を制止できません。",
        possibleAccident: "開口部や作業床端部から墜落し、墜落制止用器具が機能しないまま地面へ到達します。",
        firstAction: "安全な位置へ戻り、承認された取付設備へ接続してから移動を再開します。",
        engineeringControls: [
          "移動範囲を連続して接続できる親綱・取付設備を設ける",
          "可能な作業は手すり付き作業床へ置き換える",
        ],
        administrativeControls: [
          "移動開始前の相互確認と接続手順を作業計画へ入れる",
          "器具・取付設備の使用前点検を記録する",
        ],
        ppe: ["適合するフルハーネス", "作業高さに合うランヤード"],
        stopEscalationConditions: [
          "連続して接続できる取付設備がないとき",
          "ハーネス、ランヤード、フックに損傷・不適合があるとき",
        ],
        sourceIds: [S.fallPlan.id],
      },
      {
        id: "haz-plank-gap",
        hotspotId: "spot-plank-gap",
        title: "ずれた足場板と床の隙間",
        what: "作業床材がそろわず、足が入り得る隙間と段差が生じています。",
        why: "足先が引っ掛かる、床材が動く、姿勢を崩すという連鎖が端部で発生します。",
        possibleAccident: "つまずきから足場外へ墜落するほか、床材の落下で下方の人を被災させます。",
        firstAction: "当該区画を立入禁止にし、適正な床材へ復旧・固定します。",
        engineeringControls: [
          "床材を支持物へ確実に固定し、許容されない隙間をなくす",
        ],
        administrativeControls: [
          "始業前と変更後に床材・緊結部・隙間を点検する",
        ],
        ppe: ["滑りにくい安全靴", "保護帽"],
        stopEscalationConditions: [
          "床材の浮き、割れ、ずれ、支持不足を発見したとき",
        ],
        sourceIds: [S.scaffoldRules.id],
      },
      {
        id: "haz-edge-tools",
        hotspotId: "spot-edge-tools",
        title: "端部近くの工具",
        what: "工具が幅木のない作業床端部近くへ置かれています。",
        why: "足で蹴る、振動で動く、資材に押されることで下方へ落下します。",
        possibleAccident: "落下工具が地上の作業者へ当たり、頭部外傷等を生じさせます。",
        firstAction: "工具を端部から離し、工具袋や落下防止コードで管理します。",
        engineeringControls: [
          "幅木・メッシュシート・工具落下防止設備を設ける",
        ],
        administrativeControls: [
          "上下作業を分離し、下方を立入禁止にする",
        ],
        ppe: ["保護帽", "工具用落下防止コード"],
        stopEscalationConditions: [
          "下方に人がいる状態で落下物防止措置がないとき",
        ],
        sourceIds: [S.scaffoldRules.id],
      },
    ],
    distractor: {
      hotspotId: "spot-ground-zone",
      label: "立入防止柵の外の作業者",
      explanation:
        "地上作業者が柵の外にいること自体は、この画像では直ちに危険とはしていません。ただし、落下物範囲の設定が十分かは現場で再確認します。",
    },
    answerExplanation:
      "最優先は、個人用保護具に頼る前に、開口・作業床・手すりを復旧して墜落経路をなくすことです。フルハーネスは最後の防護層であり、適正な取付設備への接続と救助計画を含めて使います。",
    preventionHierarchy: {
      elimination: ["地上組立てや別工法に変更し、高所作業そのものを減らす"],
      substitution: ["手すり付き作業台・高所作業車等へ置き換える"],
      engineering: [
        "連続手すり、固定した作業床、幅木、親綱設備を設ける",
      ],
      administrative: [
        "点検、上下作業分離、立入禁止、接続の相互確認を行う",
      ],
      ppe: ["保護帽", "適合するフルハーネス型墜落制止用器具"],
    },
    countermeasureOptions: [
      {
        id: "measure-scaffold-close",
        label: "作業を止め、手すりと床材を復旧してから再開する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "墜落経路を設備側で閉じるため、PPEより先に選ぶ対策です。",
      },
      {
        id: "measure-scaffold-anchor",
        label: "連続して接続できる取付設備を整備する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "移動時の未接続時間をなくし、墜落制止器具を機能させます。",
      },
      {
        id: "measure-scaffold-zone",
        label: "下方を立入禁止にし、工具を落下防止管理する",
        hierarchy: "administrative",
        recommended: true,
        rationale: "落下物による二次災害を防ぎます。",
      },
      {
        id: "measure-scaffold-careful",
        label: "注意して歩けばそのまま作業できる",
        hierarchy: "administrative",
        recommended: false,
        rationale: "注意だけでは設備不備と未接続を制御できません。",
      },
    ],
    officialSources: [S.scaffoldRules, S.fallPlan],
    relatedAccidents: [
      accident(
        "mhlw-100003",
        "ビル建設の高所作業中に約2.3m下へ転落",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-563",
        "労働安全衛生規則 第563条",
        "足場 作業床 手すり 第563条",
        "足場における作業床",
      ),
    ],
    relatedQualifications: [
      qualification(
        "se-36-39-ashiba",
        "足場の組立て等の業務に係る特別教育",
        "足場の組立て、解体、変更の作業に従事する場合",
      ),
      qualification(
        "se-36-41-harness",
        "フルハーネス型墜落制止用器具特別教育",
        "高さ2m以上で作業床を設けることが困難な箇所等の対象業務",
      ),
    ],
    kyPrefill: {
      workDetail: "外部足場上での移動・設備取付け作業",
      risks: [
        {
          hazard: "手すりが途切れた端部・床の隙間から墜落する",
          reduction: "区画を停止し、連続手すりと固定床を復旧・点検する",
        },
        {
          hazard: "ランヤード未接続のまま移動して墜落制止できない",
          reduction: "連続取付設備を整備し、移動前に相互確認する",
        },
        {
          hazard: "端部の工具が落下して下方作業者へ当たる",
          reduction: "工具落下防止と下方立入禁止を実施する",
        },
      ],
      humanReviewRequired: true,
      notice:
        "これは合成イラストから作った未確定候補です。現場の足場構成、作業高さ、取付設備、救助手順を職長等が確認してからKY記録へ採用してください。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "設備対策とPPEの優先順位を説明できる",
        "未接続、床の隙間、落下物を別々の危険源として確認できる",
      ],
      openingQuestion:
        "作業者が次の一歩を踏み出す前に、何を直す必要がありますか。",
      followUpQuestions: [
        "フルハーネスを着けているだけで十分でしょうか。",
        "地上の作業者まで含めると、どの範囲を止めますか。",
      ],
      revealCue:
        "参加者から『端部』『床』『接続』『落下物』のうち2つ以上が出たら解答を表示します。",
      commonMistakes: [
        "本人が注意すればよい、ハーネスを着けているから安全と結論づけること",
      ],
      summary:
        "端部と床を先に直し、連続接続と落下物管理を重ねる。設備不備が残る間は作業を再開しない。",
    }),
    seasonalWeights: {
      default: 1.2,
      summer: 1,
      rainy: 1.4,
      typhoon: 1.5,
      winter: 1.1,
    },
    ...publication,
  },
  {
    id: "vkyt-002",
    slug: "aerial-lift-entrapment",
    title: "高所作業車のバスケットと梁の間の挟まれを防ぐ",
    shortTitle: "高所作業車と梁",
    category: "high-work-platform",
    categoryTags: ["high-work-platform", "fall"],
    industry: ["展示会施工", "設備工事業", "建設業"],
    difficulty: "応用",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/aerial-lift-entrapment.webp",
      width: 1600,
      height: 900,
      alt: "展示会場内で高所作業車のバスケットが梁へ近づき、作業者が上向き作業をしている合成安全教育イラスト",
      fullDescription:
        "大規模展示会場で、青い屈折ブーム式高所作業車のバスケットが天井の鉄骨梁のすぐ下にあります。バスケット内の2人はヘルメット、蛍光ベスト、フルハーネスを着用し、ランヤードを接続しています。右の作業者は天井設備を見上げており、背中側の梁との隙間が小さくなっています。足元には板材が積まれています。地上の監視者は見上げていますが、梁と作業者の隙間を正面から確認しにくい位置です。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-overhead-beam",
        x: 63,
        y: 15,
        radius: 6,
        label: "作業者の上方・背面に近い梁",
        hazardId: "haz-overhead-beam",
      },
      {
        id: "spot-basket-materials",
        x: 58,
        y: 45,
        radius: 5,
        label: "バスケット内に積まれた板材",
        hazardId: "haz-basket-materials",
      },
      {
        id: "spot-ground-spotter",
        x: 80,
        y: 68,
        radius: 6,
        label: "上方隙間を確認しにくい位置の監視者",
        hazardId: "haz-spotter-angle",
      },
      {
        id: "spot-exclusion-zone",
        x: 43,
        y: 77,
        radius: 5,
        label: "車両周囲の立入防止区画",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-overhead-beam",
        hotspotId: "spot-overhead-beam",
        title: "上方梁との挟圧",
        what: "バスケットと固定梁の間隔が小さく、作業者が上を向いたまま上昇操作を続け得る状態です。",
        why: "微小な操作や車体の揺れでも、身体が梁と手すりの間へ挟まれます。",
        possibleAccident: "胸部・頸部の挟圧、操作不能、意識喪失などの重篤災害につながります。",
        firstAction: "上昇を止めて安全な方向へ退避し、上方障害を含む作業計画を見直します。",
        engineeringControls: [
          "上方障害物検知・挟まれ防止装置のある機種を選定する",
          "安全な離隔を保てる位置・高さへ車両を再配置する",
        ],
        administrativeControls: [
          "上方障害、退避方向、緊急降下操作を作業前に共有する",
          "操作者と監視者が常時見える合図位置を決める",
        ],
        ppe: ["あご紐を締めた保護帽", "フルハーネス型墜落制止用器具"],
        stopEscalationConditions: [
          "上方・背面の離隔を操作者または監視者が確認できないとき",
          "緊急降下装置・警報・操作装置に異常があるとき",
        ],
        sourceIds: [S.aerialPlatform.id],
      },
      {
        id: "haz-basket-materials",
        hotspotId: "spot-basket-materials",
        title: "バスケット内の足元障害",
        what: "板材がバスケットの床面を占有し、操作者の足元と移動を妨げています。",
        why: "つまずきや誤操作、非常時にしゃがむ・退避する動作の遅れを生じます。",
        possibleAccident: "姿勢を崩してバスケット外へ投げ出される、操作レバーへ接触するおそれがあります。",
        firstAction: "不要な材料を降ろし、必要品は許容荷重内で固定・整理します。",
        engineeringControls: ["工具・材料を固定できる専用収納を使用する"],
        administrativeControls: [
          "搭載物、人数、総重量を作業計画と許容荷重で確認する",
        ],
        ppe: ["滑りにくい安全靴", "接続した墜落制止用器具"],
        stopEscalationConditions: [
          "足元・操作部・非常退避スペースを確保できないとき",
        ],
        sourceIds: [S.aerialPlatform.id],
      },
      {
        id: "haz-spotter-angle",
        hotspotId: "spot-ground-spotter",
        title: "監視者から見えない上方隙間",
        what: "地上監視者はバスケットを見ていますが、梁との最小隙間を判定しにくい角度です。",
        why: "操作者が作業へ集中したとき、接近を止める二重確認が機能しません。",
        possibleAccident: "警告が遅れ、上方梁との挟圧や構造物への接触が生じます。",
        firstAction: "機械を止め、梁と作業者を同時に見通せる監視位置へ変更します。",
        engineeringControls: ["カメラ・接近警報等を補助として使用する"],
        administrativeControls: [
          "合図方法と停止合図を統一し、監視専任者を置く",
        ],
        ppe: ["高視認性安全服", "保護帽"],
        stopEscalationConditions: [
          "目視・無線・合図のいずれかが途切れたとき",
        ],
        sourceIds: [S.aerialPlatform.id],
      },
    ],
    distractor: {
      hotspotId: "spot-exclusion-zone",
      label: "車両周囲の立入防止区画",
      explanation:
        "画像のコーンとバーで囲われた車両周囲は、第三者の接触を防ぐ良い要素です。区画だけでは上方挟圧を防げないため、上方確認も別に必要です。",
    },
    answerExplanation:
      "高所作業車では墜落だけでなく、固定構造物とバスケットの間の挟圧を先に考えます。操作者の視線が作業対象へ向く場面ほど、上方障害を見渡せる監視位置と停止合図が重要です。",
    preventionHierarchy: {
      elimination: ["地上で組み立てられる部材は地上作業へ変更する"],
      substitution: ["梁から十分離隔できる機種・作業方法へ変更する"],
      engineering: ["挟まれ防止装置、接近警報、整理されたバスケットを使用する"],
      administrative: ["作業計画、監視者、合図、緊急降下訓練を整える"],
      ppe: ["保護帽", "接続したフルハーネス型墜落制止用器具"],
    },
    countermeasureOptions: [
      {
        id: "measure-lift-reposition",
        label: "梁から離れた位置へ車両を再配置する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "固定梁との挟圧点そのものから作業者を離します。",
      },
      {
        id: "measure-lift-spotter",
        label: "上方隙間を見通せる監視位置と停止合図を決める",
        hierarchy: "administrative",
        recommended: true,
        rationale: "操作者の死角を補い、接近前に停止できます。",
      },
      {
        id: "measure-lift-clear",
        label: "バスケット内の材料を降ろして足元を空ける",
        hierarchy: "engineering",
        recommended: true,
        rationale: "誤操作と非常時の動作妨害を減らします。",
      },
      {
        id: "measure-lift-duck",
        label: "梁へ近づいたら作業者が身をかがめる",
        hierarchy: "administrative",
        recommended: false,
        rationale: "機械の動きと固定梁の挟圧力を姿勢だけで制御できません。",
      },
    ],
    officialSources: [S.aerialPlatform],
    relatedAccidents: [
      accident(
        "mhlw-102002",
        "高所作業車のバスケットから作業者が墜落",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-194-20",
        "労働安全衛生規則 第194条の20",
        "高所作業車 作業計画 第194条の20",
        "作業計画",
      ),
    ],
    relatedQualifications: [
      qualification(
        "se-36-10-5-koshosagyosha",
        "高所作業車運転特別教育",
        "作業床高さ10m未満の高所作業車を運転する場合",
      ),
      qualification(
        "st-high-lift",
        "高所作業車運転技能講習",
        "作業床高さ10m以上の高所作業車を運転する場合",
      ),
    ],
    kyPrefill: {
      workDetail: "展示会場内で高所作業車を使用した天井設備取付け",
      risks: [
        {
          hazard: "バスケットと梁の間に身体を挟まれる",
          reduction: "梁から離れた位置へ再配置し、上方監視と停止合図を決める",
        },
        {
          hazard: "バスケット内の材料につまずき誤操作・墜落する",
          reduction: "不要材を降ろし、必要品を固定して操作部周辺を空ける",
        },
      ],
      humanReviewRequired: true,
      notice:
        "機種、上方障害、床高さ、許容荷重、資格区分、緊急降下方法を現場責任者が確認するまで確定しない候補です。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "高所作業車の挟圧危険を墜落危険と分けて説明できる",
        "監視位置・停止合図・足元整理を作業計画へ反映できる",
      ],
      openingQuestion:
        "バスケットがあと少し上がると、最初に誰のどこが危険になりますか。",
      followUpQuestions: [
        "操作者が天井を見ている間、誰が梁との隙間を見ますか。",
        "地上から緊急降下する必要が出たとき、誰が操作できますか。",
      ],
      revealCue:
        "『梁との挟まれ』と『監視位置』が出たら解答を表示します。",
      commonMistakes: [
        "ハーネスが接続されているため、挟圧危険も防げると考えること",
      ],
      summary:
        "上方障害から距離を取り、見える監視位置と停止合図を決め、バスケットの足元を空ける。",
    }),
    seasonalWeights: {
      default: 1.2,
      summer: 1,
      rainy: 1,
      typhoon: 1,
      winter: 1.1,
    },
    ...publication,
  },
  {
    id: "vkyt-003",
    slug: "excavator-blind-spot",
    title: "油圧ショベルの旋回死角と立入範囲を見直す",
    shortTitle: "重機の死角",
    category: "heavy-equipment",
    categoryTags: ["heavy-equipment", "traffic"],
    industry: ["建設業", "土木工事業"],
    difficulty: "標準",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/excavator-blind-spot.webp",
      width: 1600,
      height: 900,
      alt: "油圧ショベルの後部死角に図面を見る作業者がおり、資材で誘導者との視線も遮られている合成安全教育イラスト",
      fullDescription:
        "土工現場で油圧ショベルが土山の前に停止しています。運転者はキャブ内にいます。機体右後方のカウンターウエイト近くに、図面を見下ろす地上作業者が立っています。左側の誘導者との間にはコンクリート製品のパレットがあり、互いの視線を遮っています。手前のコーンとバーによる旋回範囲は途中に開口があります。バケットは地面近くで停止し、接触や負傷は起きていません。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-counterweight-worker",
        x: 72,
        y: 57,
        radius: 7,
        label: "カウンターウエイト横の作業者",
        hazardId: "haz-counterweight-worker",
      },
      {
        id: "spot-open-exclusion",
        x: 47,
        y: 84,
        radius: 8,
        label: "途中で開いた立入防止区画",
        hazardId: "haz-open-exclusion",
      },
      {
        id: "spot-blocked-spotter",
        x: 19,
        y: 48,
        radius: 6,
        label: "資材で視線が遮られた誘導者",
        hazardId: "haz-blocked-spotter",
      },
      {
        id: "spot-lowered-bucket",
        x: 40,
        y: 49,
        radius: 5,
        label: "地面近くで停止したバケット",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-counterweight-worker",
        hotspotId: "spot-counterweight-worker",
        title: "後部旋回死角への立入り",
        what: "地上作業者が運転者から見えにくいカウンターウエイトの側方・後方にいます。",
        why: "旋回を始めると、作業者は機体と土山の間から逃げる時間がありません。",
        possibleAccident: "機体との接触、カウンターウエイトと障害物の間への挟まれで死亡・重傷となります。",
        firstAction: "重機を停止し、運転者が作業者の退避と合図者を確認するまで動かしません。",
        engineeringControls: [
          "物理柵で旋回範囲と歩行経路を分離する",
          "後方カメラ・検知装置を補助として装備する",
        ],
        administrativeControls: [
          "接触のおそれがある範囲を立入禁止にする",
          "誘導者を1名に定め、合図が見えないときは停止する",
        ],
        ppe: ["高視認性安全服", "あご紐を締めた保護帽"],
        stopEscalationConditions: [
          "運転者が周囲の人員を確認できないとき",
          "歩行者を物理的に分離できないとき",
        ],
        sourceIds: [S.vehicleMachinery.id],
      },
      {
        id: "haz-open-exclusion",
        hotspotId: "spot-open-exclusion",
        title: "立入防止区画の開口",
        what: "コーンとバーの区画が連続せず、歩行者が旋回範囲へ入れる状態です。",
        why: "短い移動や近道として開口が使われ、運転者が想定しない接近を生じます。",
        possibleAccident: "重機との接触、履帯への巻き込まれ、挟まれにつながります。",
        firstAction: "開口を閉じ、出入口を監視できる一か所へ集約します。",
        engineeringControls: ["容易にまたげない連続した物理柵を設ける"],
        administrativeControls: ["歩車分離ルートと立入許可手順を周知する"],
        ppe: ["高視認性安全服", "安全靴"],
        stopEscalationConditions: [
          "第三者・新規入場者が旋回範囲へ入れる状態のとき",
        ],
        sourceIds: [S.vehicleMachinery.id],
      },
      {
        id: "haz-blocked-spotter",
        hotspotId: "spot-blocked-spotter",
        title: "合図者との視線遮断",
        what: "資材パレットが誘導者と運転者・地上作業者の視線を遮っています。",
        why: "停止合図や人の侵入を見落とし、複数の合図が競合する可能性があります。",
        possibleAccident: "合図の誤認で重機が動き、死角の人へ接触します。",
        firstAction: "資材を移動するか、全員を見渡せる誘導位置を設定します。",
        engineeringControls: ["視界を妨げる資材を作業区域外へ移す"],
        administrativeControls: [
          "合図者、合図方法、停止条件を作業計画で一意にする",
        ],
        ppe: ["高視認性安全服"],
        stopEscalationConditions: [
          "運転者と合図者の視線・無線連絡が途切れたとき",
        ],
        sourceIds: [S.vehicleMachinery.id],
      },
    ],
    distractor: {
      hotspotId: "spot-lowered-bucket",
      label: "停止時に地面近くへ下ろしたバケット",
      explanation:
        "停止時に作業装置を低い位置へ置くことは安定に寄与します。ただし、エンジン停止・駐車措置・立入管理まで確認が必要です。",
    },
    answerExplanation:
      "重機の死角は運転者の注意力だけで解消できません。人が入れない物理分離、見渡せる合図者、合図が途切れたら止まるルールを組み合わせます。",
    preventionHierarchy: {
      elimination: ["重機稼働時間と人の立入時間を分離する"],
      substitution: ["死角が少なく検知装置を備えた機種を選ぶ"],
      engineering: ["連続物理柵、専用歩行路、後方カメラを整備する"],
      administrative: ["作業計画、合図者、停止条件、入退場確認を統一する"],
      ppe: ["高視認性安全服", "保護帽", "安全靴"],
    },
    countermeasureOptions: [
      {
        id: "measure-excavator-separate",
        label: "旋回範囲を連続した物理柵で分離する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "人が死角へ入る経路を設備で断ちます。",
      },
      {
        id: "measure-excavator-stop",
        label: "合図者が全員の退避を確認するまで重機を停止する",
        hierarchy: "administrative",
        recommended: true,
        rationale: "動き出す前に人員位置を確定できます。",
      },
      {
        id: "measure-excavator-clear",
        label: "誘導者の視界を遮る資材を移動する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "停止合図と侵入者を継続して見られます。",
      },
      {
        id: "measure-excavator-horn",
        label: "旋回前にクラクションを鳴らせば立入りを許容する",
        hierarchy: "administrative",
        recommended: false,
        rationale: "警報音は物理分離や退避確認の代わりになりません。",
      },
    ],
    officialSources: [S.vehicleMachinery],
    relatedAccidents: [
      accident(
        "mhlw-100040",
        "ドラグショベル作業中の吊荷落下で作業者が被災",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-158",
        "労働安全衛生規則 第158条",
        "車両系建設機械 立入禁止 第158条",
        "接触のおそれのある箇所への立入禁止",
      ),
    ],
    relatedQualifications: [
      qualification(
        "se-36-9-seichi",
        "小型車両系建設機械の運転特別教育",
        "機体質量3t未満の整地・運搬・積込み用等の運転",
      ),
      qualification(
        "st-shovel",
        "車両系建設機械運転技能講習",
        "対象機械・機体質量・作業内容に応じて確認",
      ),
    ],
    kyPrefill: {
      workDetail: "油圧ショベルによる掘削・積込みと周辺地上作業",
      risks: [
        {
          hazard: "作業者が後部旋回死角へ入りカウンターウエイトに挟まれる",
          reduction: "旋回範囲を物理分離し、全員退避まで重機を停止する",
        },
        {
          hazard: "資材で合図者の視界が遮られ停止合図を見落とす",
          reduction: "資材を移し、運転者と全員を見渡せる合図位置を決める",
        },
      ],
      humanReviewRequired: true,
      notice:
        "機種、旋回範囲、地形、歩行経路、合図、資格区分を現場で確認する未確定候補です。自動確定しません。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "運転者の死角と機械の旋回範囲を区別して説明できる",
        "物理分離・合図者・停止条件を優先順に選べる",
      ],
      openingQuestion:
        "運転者から最も見えにくく、逃げ場が少ない人はどこにいますか。",
      followUpQuestions: [
        "誘導者は運転者と作業者を同時に見られますか。",
        "合図が見えなくなった瞬間、機械はどうしますか。",
      ],
      revealCue:
        "『カウンターウエイト』『区画の開口』『視線遮断』のうち2つが出たら表示します。",
      commonMistakes: [
        "クラクションや高視認性ベストだけで接触を防げると考えること",
      ],
      summary:
        "死角へ入れない設備をつくり、見える合図者が全員の退避を確認するまで動かさない。",
    }),
    seasonalWeights: {
      default: 1.2,
      summer: 1,
      rainy: 1.2,
      typhoon: 1.1,
      winter: 1,
    },
    ...publication,
  },
  {
    id: "vkyt-004",
    slug: "rollbox-overturn",
    title: "かご台車の高積みと傾きによる転倒・挟まれを防ぐ",
    shortTitle: "かご台車の転倒",
    category: "load-handling",
    categoryTags: ["load-handling", "trip"],
    industry: ["運輸業", "倉庫業", "小売業"],
    difficulty: "入門",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/rollbox-overturn.webp",
      width: 1600,
      height: 900,
      alt: "高く不均等に積んだかご台車を2人で段差越しに動かし、扉が開き、作業者が倒れる側にいる合成安全教育イラスト",
      fullDescription:
        "倉庫の出入口で、2人の作業者が青いロールボックスパレットを移動しています。段ボール箱は目線より高く不均等に積まれ、右側へ傾いています。かごの扉は固定されず開いています。前輪の一つが床の継ぎ目と小さな段差へ斜めに入り、左側の作業者は台車が倒れた場合の進路側から押しています。右側作業者との視線も荷で遮られています。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-high-load",
        x: 52,
        y: 18,
        radius: 8,
        label: "目線より高く不均等な積荷",
        hazardId: "haz-high-load",
      },
      {
        id: "spot-open-door",
        x: 60,
        y: 43,
        radius: 6,
        label: "固定されていないかご扉",
        hazardId: "haz-open-door",
      },
      {
        id: "spot-caster-joint",
        x: 55,
        y: 79,
        radius: 5,
        label: "段差へ斜めに入るキャスター",
        hazardId: "haz-caster-joint",
      },
      {
        id: "spot-fall-line",
        x: 28,
        y: 55,
        radius: 7,
        label: "台車が倒れる側にいる作業者",
        hazardId: "haz-fall-line",
      },
      {
        id: "spot-parked-pallet-jack",
        x: 88,
        y: 56,
        radius: 5,
        label: "通路外に停止したハンドパレット",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-high-load",
        hotspotId: "spot-high-load",
        title: "高く偏った積荷",
        what: "荷が目線より高く、右側へ偏って積まれています。",
        why: "重心が高く偏るほど、わずかな段差・急操作・傾斜で台車が倒れやすくなります。",
        possibleAccident: "積荷の落下、台車の転倒による下敷き・挟まれ・足部負傷につながります。",
        firstAction: "移動を止め、視界と安定を確保できる高さ・重心へ積み直します。",
        engineeringControls: ["荷崩れ防止ベルト・カバーで積荷を固定する"],
        administrativeControls: [
          "許容積載量・積載高さ・重心の社内基準を定める",
        ],
        ppe: ["安全靴", "手袋", "保護帽"],
        stopEscalationConditions: [
          "積荷が視界を遮る、偏る、固定できないとき",
        ],
        sourceIds: [S.rollBox.id],
      },
      {
        id: "haz-open-door",
        hotspotId: "spot-open-door",
        title: "未固定の扉",
        what: "かご扉が開いたままで、移動中に振れたり荷が外へ出たりする状態です。",
        why: "扉が人や設備へ当たり、荷の支持を失って重心も変化します。",
        possibleAccident: "手指の挟まれ、扉との接触、荷崩れで作業者が被災します。",
        firstAction: "扉を正規の留め具で固定し、留め具の損傷を確認します。",
        engineeringControls: ["自動ロックまたは脱落しにくい扉固定具を使用する"],
        administrativeControls: ["移動前点検へ扉・固定具を含める"],
        ppe: ["手袋", "安全靴"],
        stopEscalationConditions: ["扉や固定具が変形・破損しているとき"],
        sourceIds: [S.rollBox.id],
      },
      {
        id: "haz-caster-joint",
        hotspotId: "spot-caster-joint",
        title: "キャスターと段差",
        what: "小径キャスターが床継ぎ目へ斜めに入り、急停止・傾斜しやすい状態です。",
        why: "台車上部は慣性で進み、キャスターだけが止まるため転倒モーメントが生じます。",
        possibleAccident: "台車の転倒、作業者の転倒、足部への乗り上げが起こります。",
        firstAction: "段差手前で停止し、平坦な経路または段差解消板を使用します。",
        engineeringControls: ["床の段差・継ぎ目を解消し、平坦な搬送路を整備する"],
        administrativeControls: ["事前に経路点検し、急操作をしない速度を決める"],
        ppe: ["滑りにくい安全靴"],
        stopEscalationConditions: [
          "段差・傾斜・濡れを安全に通過できる経路がないとき",
        ],
        sourceIds: [S.rollBox.id],
      },
      {
        id: "haz-fall-line",
        hotspotId: "spot-fall-line",
        title: "転倒方向への立入り",
        what: "作業者が傾いた台車の側面・倒れる側から力を加えています。",
        why: "台車が傾いたとき、人の力で支え切れず逃げ道もなくなります。",
        possibleAccident: "台車の下敷き、柱との挟まれ、無理に支えて腰や肩を負傷します。",
        firstAction: "倒れ得る側から離れ、押す位置と合図を二人で決め直します。",
        engineeringControls: ["安定性の高い搬送器具・電動補助機器へ変更する"],
        administrativeControls: ["複数人作業の役割と停止合図を決める"],
        ppe: ["安全靴", "手袋"],
        stopEscalationConditions: [
          "荷が傾き始めたときは支えようとせず退避する",
        ],
        sourceIds: [S.rollBox.id],
      },
    ],
    distractor: {
      hotspotId: "spot-parked-pallet-jack",
      label: "通路外に停止したハンドパレット",
      explanation:
        "画像右奥のハンドパレットは搬送経路から外れて停止しています。実際の現場ではフォークを最低位置にし、逸走しない保管を確認します。",
    },
    answerExplanation:
      "かご台車は『軽く見える大きな荷』ですが、重心と小径キャスターの影響で急に倒れます。積み直し、扉固定、平坦な経路、転倒線から離れた操作を先に整えます。",
    preventionHierarchy: {
      elimination: ["小口化・搬送回数の見直しで高積みをなくす"],
      substitution: ["低重心で制動装置付きの搬送器具へ変更する"],
      engineering: ["荷固定具、段差解消、平坦な専用搬送路を整備する"],
      administrative: ["積載基準、経路点検、役割・合図、退避ルールを定める"],
      ppe: ["安全靴", "手袋", "必要な場所で保護帽"],
    },
    countermeasureOptions: [
      {
        id: "measure-rollbox-restack",
        label: "視界と低重心を確保できる高さへ積み直す",
        hierarchy: "elimination",
        recommended: true,
        rationale: "転倒原因となる高い重心と視界不良を同時に減らします。",
      },
      {
        id: "measure-rollbox-route",
        label: "平坦な経路へ変更し、段差を解消する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "キャスターの急停止を設備側で防ぎます。",
      },
      {
        id: "measure-rollbox-door",
        label: "扉と積荷を正規の固定具で固定する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "扉の振れと荷崩れを抑えます。",
      },
      {
        id: "measure-rollbox-catch",
        label: "傾いたら二人で台車を支える",
        hierarchy: "administrative",
        recommended: false,
        rationale: "倒れる台車を支える行動は下敷き・挟まれを増やします。",
      },
    ],
    officialSources: [S.rollBox],
    relatedAccidents: [
      accident(
        "mhlw-100035",
        "大型の移動式保管ユニットが傾き作業者が被災",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-151-3",
        "労働安全衛生規則 第151条の3",
        "車両系荷役運搬機械 作業計画",
        "荷役運搬作業の安全",
      ),
    ],
    relatedQualifications: [
      qualification(
        "jc-standard",
        "職長等教育",
        "複数作業者の荷役を直接指揮する立場では業種・職務に応じて確認",
      ),
    ],
    kyPrefill: {
      workDetail: "ロールボックスパレットによる倉庫内搬送",
      risks: [
        {
          hazard: "高く偏った積荷で台車が転倒し下敷きになる",
          reduction: "低重心へ積み直し、積荷と扉を固定する",
        },
        {
          hazard: "キャスターが段差で止まり台車が転倒する",
          reduction: "平坦な経路へ変更し、段差を解消して低速で通過する",
        },
        {
          hazard: "倒れる側から支えようとして挟まれる",
          reduction: "転倒線から離れて操作し、傾いたら支えず退避する",
        },
      ],
      humanReviewRequired: true,
      notice:
        "積荷の質量・重心、台車仕様、床、勾配、搬送人数を現場で確認する未確定候補です。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "台車の重心・キャスター・転倒線を説明できる",
        "支える行動より積み直しと経路改善を優先できる",
      ],
      openingQuestion:
        "この台車が止まった瞬間、どちらへ倒れ、誰が逃げにくいでしょうか。",
      followUpQuestions: [
        "積荷を減らせない場合、何を固定しどの経路を選びますか。",
        "傾き始めたら支えるべきでしょうか。",
      ],
      revealCue:
        "『高い重心』『段差』『倒れる側』が出たら解答を表示します。",
      commonMistakes: ["二人いれば力で支えられると考えること"],
      summary:
        "低く安定して積み、扉を固定し、段差を避け、倒れる側へ入らない。",
    }),
    seasonalWeights: {
      default: 1.2,
      summer: 1,
      rainy: 1.5,
      typhoon: 1.3,
      winter: 1.2,
    },
    ...publication,
  },
  {
    id: "vkyt-005",
    slug: "tail-lift-loading",
    title: "トラック荷台とテールゲートリフターの墜落・挟まれを防ぐ",
    shortTitle: "荷台とテールゲート",
    category: "load-handling",
    categoryTags: ["load-handling", "fall", "traffic"],
    industry: ["運輸業", "倉庫業"],
    difficulty: "標準",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/tail-lift-loading.webp",
      width: 1600,
      height: 900,
      alt: "トラックのテールゲートリフター上で台車を扱い、端部、キャスター、足元の挟圧部、地上作業者の位置が見える合成安全教育イラスト",
      fullDescription:
        "配送ヤードでトラック後部のテールゲートリフターが荷台高さに静止しています。プラットフォーム上には作業者とキャスター付き台車があり、荷は端部近くにあります。車体側の機構と作業者の足の間隔が小さく、側端に転落防止ストッパーは見えません。地上の別作業者はプラットフォームの昇降・荷の落下範囲へ手を伸ばしています。車両や装置に文字・ロゴはありません。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-unsecured-caster",
        x: 54,
        y: 57,
        radius: 6,
        label: "固定されていない台車キャスター",
        hazardId: "haz-unsecured-caster",
      },
      {
        id: "spot-platform-edge",
        x: 29,
        y: 65,
        radius: 6,
        label: "ストッパーのないプラットフォーム端部",
        hazardId: "haz-platform-edge",
      },
      {
        id: "spot-foot-pinch",
        x: 58,
        y: 67,
        radius: 5,
        label: "車体とリフター機構に近い足元",
        hazardId: "haz-foot-pinch",
      },
      {
        id: "spot-ground-worker",
        x: 18,
        y: 51,
        radius: 7,
        label: "昇降・落下範囲内の地上作業者",
        hazardId: "haz-ground-worker",
      },
      {
        id: "spot-truck-side",
        x: 89,
        y: 50,
        radius: 5,
        label: "停止したトラック車体",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-unsecured-caster",
        hotspotId: "spot-unsecured-caster",
        title: "台車の逸走",
        what: "キャスター付き台車がプラットフォーム上で固定されず、端部近くにあります。",
        why: "リフターの傾き・振動・段差で荷が自走し、作業者が反射的に支えようとします。",
        possibleAccident: "荷の落下、台車と車体の挟まれ、作業者の墜落につながります。",
        firstAction: "装置を止め、キャスターを制動・固定して荷の位置を中央へ戻します。",
        engineeringControls: ["車輪止め・ストッパー・荷固定具を使用する"],
        administrativeControls: [
          "リフター昇降前に荷・キャスター・人員位置を指差確認する",
        ],
        ppe: ["安全靴", "手袋", "保護帽"],
        stopEscalationConditions: [
          "荷を固定できない、許容荷重・重心が確認できないとき",
        ],
        sourceIds: [S.tailgate.id],
      },
      {
        id: "haz-platform-edge",
        hotspotId: "spot-platform-edge",
        title: "プラットフォーム端部からの墜落",
        what: "外側端部に転落防止ストッパー等がなく、荷と人が端へ達し得ます。",
        why: "荷を見ながら後退する、台車に押される、段差につまずくと端部を越えます。",
        possibleAccident: "地上へ墜落して頭部・脊椎を負傷し、荷の下敷きにもなります。",
        firstAction: "端部へ近づかず、適合する転落防止機構を使用できる状態にします。",
        engineeringControls: ["サイドストッパー・車止め・転落防止設備を使用する"],
        administrativeControls: ["後退せず足元と端部を確認できる作業手順にする"],
        ppe: ["あご紐を締めた保護帽", "滑りにくい安全靴"],
        stopEscalationConditions: [
          "転落防止機構が故障・未装備で安全な代替手順がないとき",
        ],
        sourceIds: [S.tailgate.id],
      },
      {
        id: "haz-foot-pinch",
        hotspotId: "spot-foot-pinch",
        title: "足元の挟圧・せん断部",
        what: "作業者の足が車体と可動プラットフォームの境界近くにあります。",
        why: "昇降操作で隙間が変化し、足先を挟む・せん断する力が生じます。",
        possibleAccident: "足指・足部の骨折、切創、圧挫につながります。",
        firstAction: "操作を止め、全員の手足が可動範囲外にあることを確認します。",
        engineeringControls: ["挟圧防止ガード・安全装置を点検し使用する"],
        administrativeControls: ["操作者を定め、昇降中は荷に手を触れない"],
        ppe: ["先芯入り安全靴"],
        stopEscalationConditions: [
          "安全装置・操作スイッチ・可動部に異常があるとき",
        ],
        sourceIds: [S.tailgate.id],
      },
      {
        id: "haz-ground-worker",
        hotspotId: "spot-ground-worker",
        title: "昇降・落下範囲への立入り",
        what: "地上作業者がリフターと荷の移動・落下範囲へ入っています。",
        why: "装置が下降する、荷が逸走する、作業者が墜落した場合に退避できません。",
        possibleAccident: "リフターとの挟まれ、荷の直撃、作業者同士の衝突が生じます。",
        firstAction: "地上作業者を区画外へ退避させ、操作者だけが確認できる位置に立ちます。",
        engineeringControls: ["昇降範囲をコーン・柵で物理的に区画する"],
        administrativeControls: ["操作中立入禁止と停止合図を周知する"],
        ppe: ["高視認性安全服", "保護帽", "安全靴"],
        stopEscalationConditions: ["第三者が昇降範囲へ入ったとき"],
        sourceIds: [S.tailgate.id],
      },
    ],
    distractor: {
      hotspotId: "spot-truck-side",
      label: "停止した車体側面",
      explanation:
        "車体側面そのものを正解にはしていません。実際には駐車ブレーキ、輪止め、路面勾配、逸走防止も作業前に確認します。",
    },
    answerExplanation:
      "テールゲートリフターでは、荷の逸走、端部からの墜落、可動部の挟圧、地上の立入りが同時に起こり得ます。装置を止めた状態で荷・人・可動域を整えてから、一人の操作者が操作します。",
    preventionHierarchy: {
      elimination: ["地上設備やドックを使用しリフター上作業を減らす"],
      substitution: ["転落・逸走防止機能を備えた荷役設備へ変更する"],
      engineering: ["ストッパー、車輪止め、ガード、立入区画を使用する"],
      administrative: ["有資格者、操作専任、指差確認、停止合図を定める"],
      ppe: ["保護帽", "安全靴", "手袋", "高視認性安全服"],
    },
    countermeasureOptions: [
      {
        id: "measure-tailgate-secure",
        label: "台車を制動・固定し、荷を中央へ戻す",
        hierarchy: "engineering",
        recommended: true,
        rationale: "荷の逸走と端部への押し出しを防ぎます。",
      },
      {
        id: "measure-tailgate-zone",
        label: "昇降範囲を区画し、地上作業者を退避させる",
        hierarchy: "engineering",
        recommended: true,
        rationale: "装置・荷・人の落下範囲から第三者を除きます。",
      },
      {
        id: "measure-tailgate-operator",
        label: "特別教育を確認した一人の操作者が合図後に操作する",
        hierarchy: "administrative",
        recommended: true,
        rationale: "不意な操作と複数人の競合を防ぎます。",
      },
      {
        id: "measure-tailgate-hold",
        label: "地上作業者が荷を手で押さえながら昇降する",
        hierarchy: "administrative",
        recommended: false,
        rationale: "地上作業者を可動・落下範囲へ入れる危険な方法です。",
      },
    ],
    officialSources: [S.tailgate],
    relatedAccidents: [
      accident(
        "mhlw-102037",
        "トラック積み降ろし時に荷台から転落",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-36-5-4",
        "労働安全衛生規則 第36条第5号の4",
        "テールゲートリフター 特別教育",
        "特別教育を必要とする業務",
      ),
    ],
    relatedQualifications: [
      qualification(
        "se-36-5-4-tailgate",
        "テールゲートリフター操作特別教育",
        "荷の積卸しを伴うテールゲートリフターの操作",
      ),
    ],
    kyPrefill: {
      workDetail: "テールゲートリフターを使用した荷積み・荷卸し",
      risks: [
        {
          hazard: "固定していない台車が逸走し、荷とともに墜落する",
          reduction: "台車を制動・固定し、ストッパー内の中央へ配置する",
        },
        {
          hazard: "可動部へ足を置き挟圧・せん断される",
          reduction: "全員の手足を可動範囲外へ退避してから専任者が操作する",
        },
        {
          hazard: "地上作業者が昇降・落下範囲で被災する",
          reduction: "範囲を物理区画し、操作中は立入禁止にする",
        },
      ],
      humanReviewRequired: true,
      notice:
        "車両・リフターの取扱説明書、許容荷重、勾配、荷姿、教育修了、駐車措置を人が確認する候補です。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "荷の逸走、墜落、挟圧、地上立入りを別の危険として説明できる",
        "操作前の停止・固定・退避確認を選べる",
      ],
      openingQuestion:
        "この装置を動かす前に、荷・足・地上の人をどこへ置きますか。",
      followUpQuestions: [
        "台車のキャスターが自由に動くと何が起きますか。",
        "地上の補助者はどこに立つべきですか。",
      ],
      revealCue:
        "『台車固定』『端部』『可動部』『地上退避』から2つ以上が出たら表示します。",
      commonMistakes: ["地上から荷を手で支えることを安全な補助と考えること"],
      summary:
        "荷を固定し、人を可動・落下範囲から出し、教育を確認した専任者が操作する。",
    }),
    seasonalWeights: {
      default: 1.2,
      summer: 1,
      rainy: 1.4,
      typhoon: 1.2,
      winter: 1.1,
    },
    ...publication,
  },
  {
    id: "vkyt-006",
    slug: "stepladder-instability",
    title: "脚立の設置面と横乗り出しから転落を防ぐ",
    shortTitle: "脚立の不安定使用",
    category: "stepladder",
    categoryTags: ["stepladder", "fall", "trip"],
    industry: ["製造業", "設備工事業", "ビルメンテナンス"],
    difficulty: "入門",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/stepladder-instability.webp",
      width: 1600,
      height: 900,
      alt: "工場通路でマットと段差にまたがる脚立の上から作業者が横へ身を乗り出し、通路に工具箱がある合成安全教育イラスト",
      fullDescription:
        "工場の通路で、作業者がアルミ製のA形脚立を使って天井のケーブルトレーへ工具を当てています。作業者は上部の段に立ち、両手で工具を持って横へ身体を伸ばしています。脚立の脚は、波打つ黒いマットと出入口の段差へまたがっています。見える側の開き止めは十分に張られていません。脚立の下には工具箱が置かれ、別の作業者が通路を近づいています。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-high-lean",
        x: 57,
        y: 28,
        radius: 8,
        label: "上部段から横へ身を乗り出す作業者",
        hazardId: "haz-high-lean",
      },
      {
        id: "spot-uneven-feet",
        x: 60,
        y: 87,
        radius: 7,
        label: "マットと段差にまたがる脚立脚部",
        hazardId: "haz-uneven-feet",
      },
      {
        id: "spot-spreader",
        x: 63,
        y: 75,
        radius: 5,
        label: "十分に固定されていない開き止め",
        hazardId: "haz-spreader",
      },
      {
        id: "spot-toolcase",
        x: 40,
        y: 87,
        radius: 5,
        label: "通路に置かれた工具箱",
        hazardId: "haz-toolcase",
      },
      {
        id: "spot-coworker",
        x: 25,
        y: 55,
        radius: 6,
        label: "脚立から離れて近づく同僚",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-high-lean",
        hotspotId: "spot-high-lean",
        title: "上部段からの横乗り出し",
        what: "作業者が脚立上部へ立ち、両手で工具を持って支柱の外側へ上体を伸ばしています。",
        why: "身体の重心が脚立の支持範囲を外れ、横方向の反力で脚立が滑る・倒れるためです。",
        possibleAccident: "脚立ごと転倒、床への墜落、工具の落下で本人・通行者が負傷します。",
        firstAction: "工具を止めて安全に降り、対象の正面へ脚立を移すか、より適した作業台へ替えます。",
        engineeringControls: [
          "手すり付き可搬式作業台または適切な高所作業設備へ変更する",
        ],
        administrativeControls: [
          "天板・上部段の使用禁止と身体を支柱間に保つ手順を周知する",
        ],
        ppe: ["あご紐を締めた保護帽", "滑りにくい安全靴"],
        stopEscalationConditions: [
          "対象へ正対できず、横へ乗り出さなければ届かないとき",
        ],
        sourceIds: [S.ladder.id],
      },
      {
        id: "haz-uneven-feet",
        hotspotId: "spot-uneven-feet",
        title: "不均一な設置面",
        what: "脚立の脚が柔らかく波打つマットと硬い段差に分かれて載っています。",
        why: "荷重が変わると脚が沈む・滑る・段差から外れ、四脚が同時に支持されません。",
        possibleAccident: "脚立が急に傾き、作業者が床や設備へ転落・激突します。",
        firstAction: "脚立を降り、水平で堅固な床へ移動し、マットや障害物を除去します。",
        engineeringControls: ["水平で堅固な設置面を確保し、必要なら作業床を整備する"],
        administrativeControls: ["使用前に脚部・滑り止め・床を点検する"],
        ppe: ["滑りにくい安全靴"],
        stopEscalationConditions: [
          "四脚を水平・堅固に接地できないとき",
        ],
        sourceIds: [S.ladder.id],
      },
      {
        id: "haz-spreader",
        hotspotId: "spot-spreader",
        title: "開き止めの未固定",
        what: "脚立の開き止め金具が完全な使用位置へ固定されていません。",
        why: "作業中の荷重で脚が閉じ、支持幅を失います。",
        possibleAccident: "脚立が折り畳まれるように倒れ、手足を挟む・床へ転落します。",
        firstAction: "脚立から降り、開き止めを確実にロックし、損傷があれば使用を中止します。",
        engineeringControls: ["正常にロックできる適合脚立を使用する"],
        administrativeControls: ["始業前点検へヒンジ・開き止めを含める"],
        ppe: ["手袋", "安全靴"],
        stopEscalationConditions: [
          "開き止め・脚部・踏ざんに変形や損傷があるとき",
        ],
        sourceIds: [S.ladder.id],
      },
      {
        id: "haz-toolcase",
        hotspotId: "spot-toolcase",
        title: "通路と脚立周囲の障害物",
        what: "工具箱が通路上かつ脚立の昇降・転落範囲に置かれています。",
        why: "通行者がつまずくほか、作業者が降りる際の着地点を失います。",
        possibleAccident: "通行者の転倒、作業者の着地失敗、脚立との接触が生じます。",
        firstAction: "工具箱を通路外へ移し、脚立周囲を区画します。",
        engineeringControls: ["通路外に工具置場を設ける"],
        administrativeControls: ["作業範囲を区画し、通行を迂回させる"],
        ppe: ["安全靴", "保護帽"],
        stopEscalationConditions: [
          "作業範囲と通行経路を分離できないとき",
        ],
        sourceIds: [S.ladder.id, S.trip.id],
      },
    ],
    distractor: {
      hotspotId: "spot-coworker",
      label: "離れた位置から近づく同僚",
      explanation:
        "同僚がPPEを着用して離れた位置にいること自体は正解ではありません。ただし、通路を区画しないまま近づけば危険になるため、作業者側で通行を止めます。",
    },
    answerExplanation:
      "脚立は短時間でも、届かない位置へ身体を伸ばした時点で不適切な設備です。水平・堅固な設置面、開き止め、正対できる位置、通路分離を確認し、無理なら手すり付き作業台へ変更します。",
    preventionHierarchy: {
      elimination: ["地上で組立て・点検できる工程へ変更する"],
      substitution: ["手すり付き可搬式作業台・高所作業設備へ変更する"],
      engineering: ["水平な床、正常な開き止め、脚立周囲の区画を整える"],
      administrative: ["使用前点検、上部段禁止、正対、通行分離を徹底する"],
      ppe: ["保護帽", "滑りにくい安全靴"],
    },
    countermeasureOptions: [
      {
        id: "measure-ladder-platform",
        label: "対象へ正対できる手すり付き作業台へ変更する",
        hierarchy: "substitution",
        recommended: true,
        rationale: "横乗り出しと上部段使用を同時に取り除きます。",
      },
      {
        id: "measure-ladder-floor",
        label: "マットを除去し水平な床で開き止めを固定する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "脚立の支持条件を正常にします。",
      },
      {
        id: "measure-ladder-zone",
        label: "工具を通路外へ移し作業範囲を区画する",
        hierarchy: "administrative",
        recommended: true,
        rationale: "作業者の着地点と通行者を守ります。",
      },
      {
        id: "measure-ladder-helper",
        label: "同僚が脚立を手で押さえれば横乗り出しを続ける",
        hierarchy: "administrative",
        recommended: false,
        rationale: "不適切な高さ・姿勢・設置面は補助者の手では解消できません。",
      },
    ],
    officialSources: [S.ladder, S.trip],
    relatedAccidents: [
      accident("mhlw-102008", "脚立の最上段作業から転落し腰椎を骨折"),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-528",
        "労働安全衛生規則 第528条",
        "脚立 第528条",
        "移動はしご・脚立",
      ),
    ],
    relatedQualifications: [
      qualification(
        "jc-standard",
        "職長等教育",
        "脚立を含む作業方法を直接指揮する立場では対象業種・職務を確認",
      ),
    ],
    kyPrefill: {
      workDetail: "工場通路で脚立を使用した天井設備の点検・取付け",
      risks: [
        {
          hazard: "上部段から横へ乗り出し脚立ごと転倒する",
          reduction: "対象へ正対できる手すり付き作業台へ変更する",
        },
        {
          hazard: "マットと段差で脚立脚部が滑り・沈み転倒する",
          reduction: "水平で堅固な床へ移し開き止めを固定する",
        },
        {
          hazard: "通路の工具や脚立に通行者が接触・転倒する",
          reduction: "工具を移し作業範囲を区画して通行を迂回させる",
        },
      ],
      humanReviewRequired: true,
      notice:
        "脚立の型式、取扱説明書、床、作業高さ、通行状況を人が確認し、より安全な作業設備を選定してください。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "脚立の設置・姿勢・器具・通行の4要素を確認できる",
        "補助者より作業設備の変更を優先できる",
      ],
      openingQuestion:
        "作業者の身体の重心は、脚立の脚で囲まれた範囲にありますか。",
      followUpQuestions: [
        "脚立を30cm動かすだけで解消できる危険は何ですか。",
        "この作業に脚立が最適な設備でしょうか。",
      ],
      revealCue:
        "『横乗り出し』『床』『開き止め』が出たら解答を表示します。",
      commonMistakes: ["同僚が脚立を押さえればすべて解決すると考えること"],
      summary:
        "水平な床で完全に開き、正対して届く設備を選ぶ。届かなければ脚立を使わない。",
    }),
    seasonalWeights: {
      default: 1.15,
      summer: 1,
      rainy: 1.3,
      typhoon: 1,
      winter: 1.15,
    },
    ...publication,
  },
  {
    id: "vkyt-007",
    slug: "temporary-electric-shock",
    title: "仮設電源の損傷・過負荷・水濡れから感電を防ぐ",
    shortTitle: "仮設電源・感電",
    category: "electrical",
    categoryTags: ["electrical", "trip"],
    industry: ["建設業", "展示会施工", "製造業"],
    difficulty: "応用",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/temporary-electric-shock.webp",
      width: 1600,
      height: 900,
      alt: "仮設分電盤から複数の延長線が出て、水たまり近くのプラグ、過負荷の多口接続、未使用の漏電保護装置が見える合成安全教育イラスト",
      fullDescription:
        "屋内施工場所の仮設分電盤が開いており、複数の移動電線が床へ延びています。左の作業者は雨水が入った出入口近くで、濡れた床のプラグへ手を伸ばしています。中央には多口接続器へ複数の電動工具が接続されています。右には無地の可搬型漏電保護装置がありますが、回路へ接続されていません。もう一人は分電盤の遮断器へ手を伸ばしていますが、停電確認はまだ行われていません。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-wet-plug",
        x: 36,
        y: 80,
        radius: 7,
        label: "水たまり内のプラグと手",
        hazardId: "haz-wet-plug",
      },
      {
        id: "spot-overload",
        x: 59,
        y: 78,
        radius: 7,
        label: "複数工具を接続した多口接続器",
        hazardId: "haz-overload",
      },
      {
        id: "spot-open-board",
        x: 62,
        y: 24,
        radius: 7,
        label: "遮断確認前の開いた分電盤",
        hazardId: "haz-open-board",
      },
      {
        id: "spot-unused-rcd",
        x: 90,
        y: 67,
        radius: 5,
        label: "回路へ接続されていない漏電保護装置",
        hazardId: "haz-unused-rcd",
      },
      {
        id: "spot-blank-wall",
        x: 85,
        y: 25,
        radius: 5,
        label: "無地の仮設間仕切り",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-wet-plug",
        hotspotId: "spot-wet-plug",
        title: "水濡れした接続部",
        what: "プラグ接続部が水たまりにあり、作業者が濡れた手袋で触れようとしています。",
        why: "水分で絶縁性能が低下し、漏電電流が人体や金属部を流れる可能性があります。",
        possibleAccident: "感電、筋収縮による離脱不能、二次的な転倒・墜落、心停止につながります。",
        firstAction: "触れずに上流で電源を遮断し、立入を止め、乾燥・交換・絶縁確認を行います。",
        engineeringControls: [
          "防雨型接続器を床上へ保持し、配線を水濡れ経路から離す",
          "高感度高速形漏電遮断器と適切な接地を使用する",
        ],
        administrativeControls: [
          "雨水侵入・漏電・損傷時の停電と有資格者への連絡手順を定める",
        ],
        ppe: ["作業に適合する絶縁用保護具", "安全靴"],
        stopEscalationConditions: [
          "水濡れ、絶縁損傷、焦げ、異臭、遮断器作動を認めたとき",
        ],
        sourceIds: [S.electrical.id, S.electricalGuidance.id],
      },
      {
        id: "haz-overload",
        hotspotId: "spot-overload",
        title: "多口接続と過負荷",
        what: "複数の高負荷工具が一つの多口接続器へ集中しています。",
        why: "定格を超える電流や接続部の緩みで発熱し、被覆・周囲可燃物へ着火します。",
        possibleAccident: "感電、短絡、配線火災、作業場所全体の停電につながります。",
        firstAction: "使用を止め、各工具の定格と回路容量を電気担当者が確認します。",
        engineeringControls: ["適正容量の分岐回路と保護装置を設ける"],
        administrativeControls: ["接続機器と合計負荷を作業前に確認する"],
        ppe: ["電気作業に適合する保護具"],
        stopEscalationConditions: [
          "定格・回路容量・保護装置を確認できないとき",
        ],
        sourceIds: [S.electrical.id],
      },
      {
        id: "haz-open-board",
        hotspotId: "spot-open-board",
        title: "遮断・検電前の盤内作業",
        what: "分電盤を開き、停電・施錠・検電を確定する前に内部へ手を近づけています。",
        why: "表示やスイッチ位置だけでは無電圧を保証できず、誤投入も起こり得ます。",
        possibleAccident: "充電部への接触、アーク、感電、火傷につながります。",
        firstAction: "盤から離れ、権限ある電気担当者が遮断・ロックアウト・検電を行います。",
        engineeringControls: ["施錠可能な遮断装置と充電部の防護を設ける"],
        administrativeControls: ["停電、施錠、表示、検電、復電の手順と責任者を定める"],
        ppe: ["電圧区分に適合する絶縁用保護具", "保護面"],
        stopEscalationConditions: [
          "回路を特定できない、施錠できない、検電できないとき",
        ],
        sourceIds: [S.electrical.id, S.electricalGuidance.id],
      },
      {
        id: "haz-unused-rcd",
        hotspotId: "spot-unused-rcd",
        title: "漏電保護が回路に入っていない",
        what: "可搬型の漏電保護装置が近くにありますが、実際の工具回路へ接続されていません。",
        why: "装置が存在しても電流経路に入らなければ、漏電時に遮断しません。",
        possibleAccident: "漏電が継続し、作業者が触れた時点で感電します。",
        firstAction: "電源を切り、適合する漏電遮断器を正しい位置へ接続し作動試験します。",
        engineeringControls: ["回路ごとに適合する漏電遮断器を常設・接続する"],
        administrativeControls: ["接続とテストボタン作動を始業前点検へ入れる"],
        ppe: ["適合する絶縁用保護具"],
        stopEscalationConditions: [
          "漏電遮断器が未接続・作動不良・定格不明のとき",
        ],
        sourceIds: [S.electrical.id],
      },
    ],
    distractor: {
      hotspotId: "spot-blank-wall",
      label: "無地の仮設間仕切り",
      explanation:
        "間仕切りそのものはこの画像の主な危険ではありません。実現場では盤の前に必要な作業空間と避難経路があるか確認します。",
    },
    answerExplanation:
      "感電防止は『触らないで気を付ける』ではなく、上流遮断、施錠、検電、水濡れ分離、漏電遮断器、接地を回路として成立させます。異常を見つけた作業者は自分で触らず電気担当へエスカレーションします。",
    preventionHierarchy: {
      elimination: ["水濡れ区画の電気使用を停止し、乾燥した作業へ移す"],
      substitution: ["低電圧・充電式工具等の適切な代替を検討する"],
      engineering: ["遮断・施錠、漏電遮断器、接地、防雨接続、配線架空化を行う"],
      administrative: ["電気担当者、負荷管理、点検、異常時停止手順を定める"],
      ppe: ["電圧・作業に適合する絶縁用保護具", "保護面", "安全靴"],
    },
    countermeasureOptions: [
      {
        id: "measure-electric-isolate",
        label: "上流で遮断・施錠・検電してから異常部を扱う",
        hierarchy: "elimination",
        recommended: true,
        rationale: "人体が触れる前に危険な電気エネルギーを除きます。",
      },
      {
        id: "measure-electric-dry",
        label: "接続部を水濡れから離し防雨型へ交換する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "絶縁低下と漏電の起点を除きます。",
      },
      {
        id: "measure-electric-rcd",
        label: "適合する漏電遮断器を回路へ接続し作動確認する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "漏電時の遮断を実際の回路で機能させます。",
      },
      {
        id: "measure-electric-gloves",
        label: "乾いた軍手に替えてプラグを抜く",
        hierarchy: "ppe",
        recommended: false,
        rationale: "一般の手袋は絶縁用保護具ではなく、上流遮断前の接触は危険です。",
      },
    ],
    officialSources: [S.electrical, S.electricalGuidance],
    relatedAccidents: [
      accident(
        "mhlw-102015",
        "雨天後の濡れた足場で電動工具から感電・転落",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-333",
        "労働安全衛生規則 第333条",
        "漏電による感電 防止 第333条",
        "漏電による感電の防止",
      ),
    ],
    relatedQualifications: [
      qualification(
        "se-36-4-teiatsu",
        "低圧電気取扱業務特別教育",
        "低圧充電電路の敷設・修理、開閉器操作等の対象業務",
      ),
    ],
    kyPrefill: {
      workDetail: "仮設分電盤・延長線・電動工具を使用する施工",
      risks: [
        {
          hazard: "水濡れしたプラグ・損傷配線へ触れて感電する",
          reduction: "上流遮断・施錠・検電後に乾燥・交換し、接続部を床上へ保持する",
        },
        {
          hazard: "多口接続の過負荷で発熱・短絡・火災となる",
          reduction: "定格と回路容量を確認し、適正な分岐回路へ分散する",
        },
        {
          hazard: "漏電遮断器が未接続で漏電時に遮断しない",
          reduction: "適合器を回路へ接続し、始業前に作動試験する",
        },
      ],
      humanReviewRequired: true,
      notice:
        "電圧、回路、接地、漏電遮断器、作業資格は電気担当者が現地確認するまで確定しません。異常部へ触れないでください。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "遮断・施錠・検電の順序を説明できる",
        "水濡れ、過負荷、漏電保護の不成立を回路として確認できる",
      ],
      openingQuestion:
        "この場面で、最初に手を近づけてはいけない場所はどこですか。",
      followUpQuestions: [
        "漏電遮断器が置いてあるだけで守られますか。",
        "誰が遮断・検電し、誰が復電を許可しますか。",
      ],
      revealCue:
        "『上流遮断』『水濡れ』『過負荷』が出たら解答を表示します。",
      commonMistakes: ["乾いた手袋なら濡れたプラグへ触れてよいと考えること"],
      summary:
        "触る前に上流で止め、施錠・検電する。水と接続部を離し、保護装置を回路へ正しく入れる。",
    }),
    seasonalWeights: {
      default: 1.15,
      summer: 1,
      rainy: 1.8,
      typhoon: 1.5,
      winter: 1.1,
    },
    ...publication,
  },
  {
    id: "vkyt-008",
    slug: "hot-work-fire",
    title: "研削火花の先にある可燃物とガス容器を管理する",
    shortTitle: "火気作業",
    category: "fire-explosion",
    categoryTags: ["fire-explosion"],
    industry: ["製造業", "設備工事業", "建設業"],
    difficulty: "標準",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/hot-work-fire.webp",
      width: 1600,
      height: 900,
      alt: "工場でグラインダー作業を始める前に、段ボール、油付きウエス、未固定のガス容器、遮られた消火器がある合成安全教育イラスト",
      fullDescription:
        "工場の金属作業台で、フェイスシールドと保護具を着けた作業者がアングルグラインダーを鋼材へ当てる直前です。火花はまだ出ていません。作業台の下には段ボール、布、油の入ったトレーがあります。左のガス容器は鎖で固定されていません。右奥の消火器は資材棚の後ろにあり、すぐ取り出しにくい状態です。遠くの火気監視者は別方向を見ています。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-combustibles",
        x: 49,
        y: 74,
        radius: 7,
        label: "火花経路内の段ボールと布",
        hazardId: "haz-combustibles",
      },
      {
        id: "spot-gas-cylinder",
        x: 9,
        y: 50,
        radius: 6,
        label: "固定されていないガス容器",
        hazardId: "haz-gas-cylinder",
      },
      {
        id: "spot-blocked-extinguisher",
        x: 68,
        y: 52,
        radius: 5,
        label: "資材で取り出しにくい消火器",
        hazardId: "haz-blocked-extinguisher",
      },
      {
        id: "spot-fire-watch",
        x: 83,
        y: 30,
        radius: 6,
        label: "別方向を見ている火気監視者",
        hazardId: "haz-fire-watch",
      },
      {
        id: "spot-steel-rack",
        x: 61,
        y: 31,
        radius: 5,
        label: "鋼材を保管した金属棚",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-combustibles",
        hotspotId: "spot-combustibles",
        title: "火花経路内の可燃物",
        what: "段ボール、布、油付きウエスが研削火花の飛散範囲に残っています。",
        why: "小さな火花や高温粒子は見えない位置で着火し、作業終了後に燃え広がることがあります。",
        possibleAccident: "工場火災、煙の吸入、周囲設備・ガス容器を巻き込む火災・爆発につながります。",
        firstAction: "工具を始動せず、可燃物を除去し、除去できない物を不燃材で完全に遮へいします。",
        engineeringControls: ["不燃性火花受け・遮へい・局所排気を適正に設置する"],
        administrativeControls: ["火気許可、事前点検、終了後の残火確認を行う"],
        ppe: ["フェイスシールド", "保護眼鏡", "難燃性作業服", "手袋"],
        stopEscalationConditions: [
          "可燃物を除去・遮へいできない、可燃性蒸気のおそれがあるとき",
        ],
        sourceIds: [S.hotWork.id],
      },
      {
        id: "haz-gas-cylinder",
        hotspotId: "spot-gas-cylinder",
        title: "ガス容器の転倒・加熱",
        what: "ガス容器が鎖等で固定されず、火花・高温部に近い位置です。",
        why: "転倒でバルブが損傷し、加熱で圧力が上昇すると急激なガス放出が起こります。",
        possibleAccident: "容器の飛走、ガス漏れ、火災・爆発につながります。",
        firstAction: "作業を始めず、容器を所定位置へ立てて固定し、熱源から離します。",
        engineeringControls: ["容器スタンドと二点固定具を使用する"],
        administrativeControls: ["容器、ホース、バルブを使用前点検する"],
        ppe: ["保護帽", "安全靴", "手袋"],
        stopEscalationConditions: [
          "容器・バルブ・ホースの損傷、漏れ、固定不能があるとき",
        ],
        sourceIds: [S.hotWork.id],
      },
      {
        id: "haz-blocked-extinguisher",
        hotspotId: "spot-blocked-extinguisher",
        title: "消火器へのアクセス不良",
        what: "消火器が資材の後ろにあり、火災時にすぐ持ち出せません。",
        why: "初期消火の数十秒を失い、消火不能な規模へ拡大します。",
        possibleAccident: "延焼、避難遅れ、煙・熱による被災につながります。",
        firstAction: "消火器を火気監視者がすぐ取れる位置へ移し、種類・期限・圧力を確認します。",
        engineeringControls: ["消火器と防火設備の前を常時空ける配置にする"],
        administrativeControls: ["火気許可前に消火設備と避難経路を確認する"],
        ppe: ["作業に適合する保護具"],
        stopEscalationConditions: [
          "適合する消火設備・避難経路・連絡手段がないとき",
        ],
        sourceIds: [S.hotWork.id],
      },
      {
        id: "haz-fire-watch",
        hotspotId: "spot-fire-watch",
        title: "火気監視が機能していない",
        what: "監視者が作業点・火花の到達範囲を継続して見ていません。",
        why: "作業者から見えない裏側や落下先の着火を発見できません。",
        possibleAccident: "隠れた着火を見逃し、作業後に火災が拡大します。",
        firstAction: "作業を止め、専任監視者が作業点と周辺を見渡せる位置へ移動します。",
        engineeringControls: ["死角を減らす遮へい・監視配置を整える"],
        administrativeControls: ["監視範囲、終了後監視時間、通報・消火手順を定める"],
        ppe: ["監視者にも必要な眼・顔・身体保護具"],
        stopEscalationConditions: [
          "専任監視者が離席する、死角を確認できないとき",
        ],
        sourceIds: [S.hotWork.id],
      },
    ],
    distractor: {
      hotspotId: "spot-steel-rack",
      label: "鋼材を保管した金属棚",
      explanation:
        "鋼材棚そのものは主な正解ではありません。ただし、背後に可燃物がないか、倒壊・火花反射の危険がないかは現場で確認します。",
    },
    answerExplanation:
      "火気作業の対策は火花が出てからでは遅く、始動前に可燃物除去、容器固定、消火設備、専任監視を成立させます。除去や監視ができない場合は作業方法・場所を変えます。",
    preventionHierarchy: {
      elimination: ["火花を発生しない切断・接合方法へ変更する"],
      substitution: ["火気専用区画またはより低発熱の工具へ変更する"],
      engineering: ["不燃遮へい、火花受け、容器固定、消火設備を整える"],
      administrative: ["火気許可、監視者、周辺点検、終了後監視を実施する"],
      ppe: ["保護眼鏡", "フェイスシールド", "難燃性作業服", "手袋"],
    },
    countermeasureOptions: [
      {
        id: "measure-hot-remove",
        label: "火花範囲の可燃物を除去し不燃材で遮へいする",
        hierarchy: "elimination",
        recommended: true,
        rationale: "着火物を火花経路から除きます。",
      },
      {
        id: "measure-hot-cylinder",
        label: "ガス容器を熱源から離して二点固定する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "転倒・バルブ損傷・加熱を防ぎます。",
      },
      {
        id: "measure-hot-watch",
        label: "消火器を確保し専任監視者が終了後も確認する",
        hierarchy: "administrative",
        recommended: true,
        rationale: "隠れた着火の早期発見と初期消火を可能にします。",
      },
      {
        id: "measure-hot-fast",
        label: "短時間で終えるため監視者なしで開始する",
        hierarchy: "administrative",
        recommended: false,
        rationale: "火花による着火は作業時間の短さだけでは防げません。",
      },
    ],
    officialSources: [S.hotWork],
    relatedAccidents: [
      accident(
        "mhlw-102010",
        "グラインダー作業中に砥石が破裂し顔面を負傷",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-279",
        "労働安全衛生規則 第279条",
        "危険物がある場所 火気 第279条",
        "危険物等がある場所における火気等の使用禁止",
      ),
    ],
    relatedQualifications: [
      qualification(
        "se-36-1-kensaku",
        "研削といし取替え等特別教育",
        "研削といしの取替えまたは取替え時の試運転を行う場合",
      ),
    ],
    kyPrefill: {
      workDetail: "工場内でグラインダーを使用する火気作業",
      risks: [
        {
          hazard: "研削火花が段ボール・油付きウエスへ着火する",
          reduction: "始動前に可燃物を除去し、火花経路を不燃材で遮へいする",
        },
        {
          hazard: "未固定のガス容器が転倒・加熱されガスが放出する",
          reduction: "容器を熱源から離し二点固定してバルブ等を点検する",
        },
        {
          hazard: "監視・消火器が機能せず隠れた着火を見逃す",
          reduction: "専任監視者と取り出せる消火器を置き終了後も確認する",
        },
      ],
      humanReviewRequired: true,
      notice:
        "火気許可、可燃性雰囲気、周辺・裏面、消火設備、監視時間を現場責任者が確認する候補です。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "着火源・可燃物・酸素・監視の関係を説明できる",
        "火花が出る前に作業を止める条件を決められる",
      ],
      openingQuestion:
        "まだ火花が出ていない今、何を動かせば火災を防げますか。",
      followUpQuestions: [
        "作業台の裏側や下側へ火花が入る可能性はありますか。",
        "作業終了後、誰がどこを何分確認しますか。",
      ],
      revealCue:
        "『可燃物』『容器固定』『消火器』『監視』から2つ以上が出たら表示します。",
      commonMistakes: ["火花が小さい・作業が短いから監視不要と考えること"],
      summary:
        "始動前に燃える物をなくし、容器と消火設備を整え、専任監視を終了後まで続ける。",
    }),
    seasonalWeights: {
      default: 1.1,
      summer: 1.1,
      rainy: 1,
      typhoon: 1,
      winter: 1.4,
    },
    ...publication,
  },
  {
    id: "vkyt-009",
    slug: "chemical-transfer-sds",
    title: "化学品の移替えで容器・換気・流出・SDSを確認する",
    shortTitle: "化学物質・SDS",
    category: "chemical",
    categoryTags: ["chemical", "fire-explosion"],
    industry: ["製造業", "メンテナンス業"],
    difficulty: "応用",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/chemical-transfer-sds.webp",
      width: 1600,
      height: 900,
      alt: "化学品を無表示の飲料ボトル状容器へ移し替え、換気フード外、床排水口への流出、異種容器の混在が見える合成安全教育イラスト",
      fullDescription:
        "製造工場の作業台で、2人の作業者が無地の金属容器から透明な飲料ボトル形状の容器へ液体を開放移替えしようとしています。2人とも側面が開いた眼鏡・保護眼鏡で、密閉形ではありません。背面にスロット形の局所排気フードがありますが、物質、風量、注入点との位置関係が適合するかは画像だけでは確認できません。作業台の液体が床へ落ち、排水口へ向かっています。下棚には異なる形状の無表示容器が受け皿なしで混在し、右壁の文書ホルダーは空です。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-drink-bottle",
        x: 61,
        y: 49,
        radius: 6,
        label: "無表示の飲料ボトル状受け容器",
        hazardId: "haz-drink-bottle",
      },
      {
        id: "spot-eye-protection",
        x: 42,
        y: 31,
        radius: 9,
        label: "密閉形ではない眼鏡・保護眼鏡の2人",
        hazardId: "haz-eye-protection",
      },
      {
        id: "spot-hood-offset",
        x: 67,
        y: 42,
        radius: 9,
        label: "開放注入点と背面の局所排気フード",
        hazardId: "haz-hood-offset",
      },
      {
        id: "spot-spill-drain",
        x: 50,
        y: 86,
        radius: 7,
        label: "床排水口へ向かう液体",
        hazardId: "haz-spill-drain",
      },
      {
        id: "spot-mixed-storage",
        x: 69,
        y: 76,
        radius: 7,
        label: "受け皿なしで混在する無表示容器",
        hazardId: "haz-mixed-storage",
      },
      {
        id: "spot-empty-sds-holder",
        x: 91,
        y: 42,
        radius: 5,
        label: "空のSDS文書ホルダー",
        hazardId: "haz-empty-sds-holder",
      },
      {
        id: "spot-tool-cart",
        x: 7,
        y: 57,
        radius: 5,
        label: "作業台から離れた工具ワゴン",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-drink-bottle",
        hotspotId: "spot-drink-bottle",
        title: "誤認しやすい無表示容器",
        what: "化学品を飲料容器と誤認しやすい形状の無表示容器へ移そうとしています。",
        why: "内容物・危険有害性・禁止事項が伝わらず、飲用・混合・誤使用が起きます。",
        possibleAccident: "誤飲、中毒、皮膚・眼障害、反応による発熱・火災につながります。",
        firstAction: "移替えを止め、内容物に適合する専用容器と必要な表示を準備します。",
        engineeringControls: ["誤開封・漏えいを防ぐ適合専用容器を使用する"],
        administrativeControls: ["SDSとラベル情報を確認し、移替え後も内容表示を維持する"],
        ppe: ["化学防護手袋", "密閉形保護眼鏡", "必要な防護衣"],
        stopEscalationConditions: [
          "物質・濃度・容器適合性・SDSを確認できないとき",
        ],
        sourceIds: [S.chemical.id, S.chemicalRiskAssessment.id],
      },
      {
        id: "haz-eye-protection",
        hotspotId: "spot-eye-protection",
        title: "飛沫に対する眼保護不足",
        what: "2人とも側面が開いた眼鏡・保護眼鏡で、横・上・下からの飛沫を防ぐ密閉形ではありません。",
        why: "注ぎ始め・脈動・容器の滑りで液体が飛散し、眼鏡の隙間から眼へ入ります。",
        possibleAccident: "角膜損傷、化学熱傷、失明等につながります。",
        firstAction: "移替えを止め、SDSに基づく密閉形保護眼鏡・顔面保護具を全員へ用意します。",
        engineeringControls: ["密閉移送・ポンプ等で開放注入を減らす"],
        administrativeControls: ["SDSの保護具・応急措置・洗眼設備を作業前確認する"],
        ppe: ["密閉形保護眼鏡", "必要に応じフェイスシールド"],
        stopEscalationConditions: [
          "適合保護具・洗眼設備・応急手順がないとき",
        ],
        sourceIds: [S.chemical.id],
      },
      {
        id: "haz-hood-offset",
        hotspotId: "spot-hood-offset",
        title: "開放移替えと換気性能の未確認",
        what: "背面に局所排気フードはありますが、開放注入する物質・風量・注入点との位置関係が適合するか確認できていません。",
        why: "捕捉性能が不足すれば、発生した蒸気が作業者の呼吸域を通り、室内へ拡散します。",
        possibleAccident: "急性中毒、めまい、意識障害、可燃性蒸気の着火につながります。",
        firstAction: "物質を閉じ、SDSとリスクアセスメントに基づきフードの風量・位置を確認するか、密閉移送へ変更します。",
        engineeringControls: ["発生源を囲う局所排気・密閉移送を使用する"],
        administrativeControls: ["換気性能と物質の使用条件をリスクアセスメントで確認する"],
        ppe: ["評価に基づく呼吸用保護具"],
        stopEscalationConditions: [
          "換気性能・濃度・物質の可燃性を評価できないとき",
        ],
        sourceIds: [S.chemical.id, S.chemicalRiskAssessment.id],
      },
      {
        id: "haz-spill-drain",
        hotspotId: "spot-spill-drain",
        title: "流出液が排水口へ向かう",
        what: "こぼれた液が封じ込められず、床排水口へ広がっています。",
        why: "排水系や別区画へ拡散し、未知の物質と反応する可能性があります。",
        possibleAccident: "多数者のばく露、環境流出、火災・有毒ガス発生につながります。",
        firstAction: "安全にできる範囲で流出源を止め、区域を隔離し、手順に従って排水口への流入を防ぎます。",
        engineeringControls: ["二次受け・防液堤・排水口カバーを準備する"],
        administrativeControls: ["漏えい対応、通報、回収・廃棄手順を事前に定める"],
        ppe: ["SDSと濃度に適合する化学防護具"],
        stopEscalationConditions: [
          "物質不明、大量流出、反応・蒸気発生のおそれがあるときは退避・通報する",
        ],
        sourceIds: [S.chemical.id],
      },
      {
        id: "haz-mixed-storage",
        hotspotId: "spot-mixed-storage",
        title: "無表示容器の混在保管",
        what: "異なる材質・形状の無表示容器が受け皿なしで同じ棚へ置かれています。",
        why: "漏えい時に内容物を識別できず、不適合物質が混ざる可能性があります。",
        possibleAccident: "反応熱、ガス発生、火災、処理者のばく露につながります。",
        firstAction: "内容物を特定し、適合性に基づいて分離・表示・二次受け保管します。",
        engineeringControls: ["適合区分ごとの耐薬品性二次受けを設ける"],
        administrativeControls: ["容器台帳、ラベル、SDS、保管区分を一致させる"],
        ppe: ["内容確認作業に適合する化学防護具"],
        stopEscalationConditions: ["内容不明容器、膨れ、漏れ、変色を発見したとき"],
        sourceIds: [S.chemical.id],
      },
      {
        id: "haz-empty-sds-holder",
        hotspotId: "spot-empty-sds-holder",
        title: "作業場所でSDSを確認できない",
        what: "右壁の文書ホルダーが空で、作業者が物質のSDSをその場で確認できる状態か分かりません。",
        why: "物質名、危険有害性、換気、保護具、漏えい時措置を確認しないまま取扱いを始めるおそれがあります。",
        possibleAccident: "不適合な容器・換気・保護具を選び、ばく露、反応、火災、応急措置の遅れにつながります。",
        firstAction: "移替えを止め、対象物質の最新版SDSとラベルを作業者が確認できる状態にします。",
        engineeringControls: ["作業場所から確実に参照できるSDS閲覧端末・保管場所を整える"],
        administrativeControls: ["物質台帳、ラベル、最新版SDS、作業手順の一致を開始前に確認する"],
        ppe: ["SDS確認後に選定した適合保護具"],
        stopEscalationConditions: [
          "物質名、最新版SDS、緊急時措置を確認できないとき",
        ],
        sourceIds: [S.chemical.id, S.chemicalRiskAssessment.id],
      },
    ],
    distractor: {
      hotspotId: "spot-tool-cart",
      label: "離れた工具ワゴン",
      explanation:
        "左端の工具ワゴンはこの画像の主な危険ではありません。薬品専用区域へ不要な工具を持ち込まない整理は継続します。",
    },
    answerExplanation:
      "化学品は名前が分からないままPPEだけ選べません。SDSで物質・容器・換気・反応性・応急措置を確認し、密閉・局所排気・二次受けを先に整えます。物質不明や大量流出では近づかず退避・通報します。",
    preventionHierarchy: {
      elimination: ["より危険性の低い洗浄方法へ変更し開放移替えをなくす"],
      substitution: ["低有害性・低揮発性の物質へ代替する"],
      engineering: ["密閉移送、局所排気、専用容器、二次受けを使用する"],
      administrative: ["SDS、ラベル、リスクアセスメント、保管・漏えい手順を整える"],
      ppe: ["密閉形保護眼鏡", "化学防護手袋", "必要な防護衣・呼吸用保護具"],
    },
    countermeasureOptions: [
      {
        id: "measure-chemical-stop",
        label: "移替えを止め、SDSと物質・容器適合性を確認する",
        hierarchy: "elimination",
        recommended: true,
        rationale: "不明なままの取扱いを止め、対策選定の前提を確定します。",
      },
      {
        id: "measure-chemical-closed",
        label: "専用容器への密閉移送と局所排気へ変更する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "飛沫と蒸気の発生・拡散を発生源で抑えます。",
      },
      {
        id: "measure-chemical-spill",
        label: "流出を隔離し排水口を守り、手順どおり回収する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "別区画・排水系への拡散を防ぎます。",
      },
      {
        id: "measure-chemical-smell",
        label: "臭いが弱ければ通常眼鏡のまま続ける",
        hierarchy: "ppe",
        recommended: false,
        rationale: "臭いは危険性・濃度・眼への飛沫を判断する基準になりません。",
      },
    ],
    officialSources: [S.chemical, S.chemicalRiskAssessment],
    relatedAccidents: [
      accident(
        "mhlw-102012",
        "塗装ブースで換気不十分により有機溶剤中毒",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-ho-57-2",
        "労働安全衛生法 第57条の2",
        "SDS 第57条の2",
        "文書等による通知",
      ),
    ],
    relatedQualifications: [
      qualification(
        "st-yuki-chief",
        "有機溶剤作業主任者技能講習",
        "対象有機溶剤業務・作業場所・作業条件に該当する場合",
      ),
    ],
    kyPrefill: {
      workDetail: "洗浄用化学品の小分け・移替え・保管",
      risks: [
        {
          hazard: "無表示の飲料容器状ボトルへ移し誤飲・誤使用する",
          reduction: "SDS確認後、適合する専用容器へ表示を維持して移す",
        },
        {
          hazard: "換気性能未確認の開放移替えで蒸気・飛沫にばく露する",
          reduction: "SDSとリスク評価で局排の風量・位置を確認し、密閉移送を優先して適合保護具を使う",
        },
        {
          hazard: "流出液が排水口へ入り別区画へ拡散・反応する",
          reduction: "二次受けと排水口カバーで封じ込め、手順どおり回収する",
        },
      ],
      humanReviewRequired: true,
      notice:
        "物質名、SDS、濃度、反応性、換気性能、保護具、漏えい手順を化学物質管理者等が確認するまで未確定です。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "SDSがない状態では安全な容器・換気・PPEを決められないと説明できる",
        "密閉・換気・二次受けをPPEより先に選べる",
      ],
      openingQuestion:
        "この液体の名前が分からないまま、どの対策まで決められるでしょうか。",
      followUpQuestions: [
        "飲料ボトル形状がなぜ危険ですか。",
        "排水口へ入る前に誰が何をしますか。",
      ],
      revealCue:
        "『SDS』『専用容器』『換気』『流出』から2つ以上が出たら表示します。",
      commonMistakes: ["臭いの強さや通常眼鏡で危険性を判断すること"],
      summary:
        "まず物質とSDSを確定し、専用容器・密閉・換気・二次受けを整え、最後に適合PPEを選ぶ。",
    }),
    seasonalWeights: {
      default: 1.1,
      summer: 1.1,
      rainy: 1,
      typhoon: 1,
      winter: 1,
    },
    ...publication,
  },
  {
    id: "vkyt-010",
    slug: "heat-stress-summer",
    title: "熱中症の初期症状を見逃さず作業離脱・冷却へつなぐ",
    shortTitle: "熱中症",
    category: "heat",
    categoryTags: ["heat", "lone-work"],
    industry: ["建設業", "道路工事業", "屋外作業"],
    difficulty: "標準",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/heat-stress-summer.webp",
      width: 1600,
      height: 900,
      alt: "真夏の屋外現場で作業者が汗をかき不調を示し、同僚は背を向け、離れた休憩所と向きの悪い送風機がある合成安全教育イラスト",
      fullDescription:
        "強い日差しの屋外建設現場です。中央の作業者は大量に汗をかき、片手を膝、片手を頭に置いて不調を示しています。左の同僚は背を向けて作業を続け、異変に気付いていません。右の監督者は日陰でガン型の測定器を見ていますが、適合するWBGT計で作業位置を測っている場面とは確認できません。水分と椅子は少し離れた場所にあり、可搬式送風機は休憩位置へ正しく向いていません。倒れている人はいません。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-heat-symptoms",
        x: 39,
        y: 49,
        radius: 8,
        label: "発汗・ふらつき・頭部不快を示す作業者",
        hazardId: "haz-heat-symptoms",
      },
      {
        id: "spot-buddy-miss",
        x: 13,
        y: 54,
        radius: 7,
        label: "異変に気付かず作業を続ける同僚",
        hazardId: "haz-buddy-miss",
      },
      {
        id: "spot-distant-rest",
        x: 68,
        y: 61,
        radius: 7,
        label: "作業点から離れた水分・休憩場所",
        hazardId: "haz-distant-rest",
      },
      {
        id: "spot-fan-direction",
        x: 60,
        y: 87,
        radius: 5,
        label: "休憩位置へ向いていない送風機",
        hazardId: "haz-fan-direction",
      },
      {
        id: "spot-measurement-device",
        x: 85,
        y: 36,
        radius: 6,
        label: "WBGT計とは確認できないガン型機器を見る監督者",
        hazardId: "haz-measurement-device",
      },
      {
        id: "spot-shade-canopy",
        x: 85,
        y: 8,
        radius: 6,
        label: "日陰をつくる休憩テントの屋根",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-heat-symptoms",
        hotspotId: "spot-heat-symptoms",
        title: "熱中症を疑う初期症状",
        what: "作業者に大量発汗、ふらつき、頭部不快など熱中症を疑う変化があります。",
        why: "『少し休めば大丈夫』と作業を続けると、短時間で意識障害・重篤化することがあります。",
        possibleAccident: "転倒・墜落等の二次災害、意識障害、臓器障害、死亡につながります。",
        firstAction: "直ちに作業から離脱させ、涼しい場所で冷却し、定めた担当者へ報告します。一人にしません。",
        engineeringControls: ["日陰・冷房・送風・身体冷却設備を作業点近くへ設ける"],
        administrativeControls: [
          "報告体制、措置手順、医療・救急要請の判断を事前に定め周知する",
        ],
        ppe: ["暑熱を考慮した通気性作業服", "作業に必要な保護帽・保護具"],
        stopEscalationConditions: [
          "意識異常、受け答えの異常、自力で水分摂取できない、症状が改善しないときは救急要請する",
        ],
        sourceIds: [S.heat.id, S.heatRule2025.id],
      },
      {
        id: "haz-buddy-miss",
        hotspotId: "spot-buddy-miss",
        title: "相互確認が機能していない",
        what: "同僚が背を向け、作業者の体調変化を確認できていません。",
        why: "熱中症では本人が異常を認識・申告できない場合があり、発見が遅れます。",
        possibleAccident: "単独状態で重症化し、救助・冷却・搬送が遅れます。",
        firstAction: "作業を止め、声掛けと状態確認を行い、症状のある人を一人にしません。",
        engineeringControls: ["見守りしやすい配置・休憩場所・通信手段を整える"],
        administrativeControls: ["バディ制、定時確認、報告先を作業開始前に決める"],
        ppe: ["高視認性安全服"],
        stopEscalationConditions: [
          "一人作業で定時連絡・救援手段を確保できない暑熱作業",
        ],
        sourceIds: [S.heatRule2025.id],
      },
      {
        id: "haz-distant-rest",
        hotspotId: "spot-distant-rest",
        title: "休憩・飲料が作業点から遠い",
        what: "日陰、飲料、椅子が作業点から離れ、すぐ利用できる配置ではありません。",
        why: "忙しさや移動負担から休憩・水分摂取が先送りされます。",
        possibleAccident: "深部体温上昇と脱水が進み、判断力・身体機能が低下します。",
        firstAction: "作業を止め、近い日陰へ移動し、状態に応じて冷却・水分塩分・医療対応を行います。",
        engineeringControls: ["冷房・日陰・冷水・冷却材を作業場所近くへ配置する"],
        administrativeControls: ["WBGTと作業強度に応じた強制休憩・作業短縮を行う"],
        ppe: ["適切な冷却用品を作業計画に組み込む"],
        stopEscalationConditions: [
          "必要な休憩・冷却・飲料を直ちに利用できないとき",
        ],
        sourceIds: [S.heat.id],
      },
      {
        id: "haz-fan-direction",
        hotspotId: "spot-fan-direction",
        title: "冷却設備が有効に使われていない",
        what: "送風機が休憩者の位置へ向かず、実際の身体冷却へ寄与していません。",
        why: "設備が置いてあるだけでは冷却効果を得られず、休憩時間内の回復が不十分になります。",
        possibleAccident: "体温が下がらないまま再作業し、症状が再発・重症化します。",
        firstAction: "送風・冷房・冷却材を本人へ有効に使い、症状が改善するまで作業へ戻しません。",
        engineeringControls: ["冷風・冷房・水冷等を人体へ有効に当てられる休憩設備にする"],
        administrativeControls: ["回復確認と復帰判断者を決める"],
        ppe: ["冷却ベスト等は補助として適合性を確認する"],
        stopEscalationConditions: [
          "冷却しても症状が続く、悪化する、判断に迷うとき",
        ],
        sourceIds: [S.heat.id, S.heatRule2025.id],
      },
      {
        id: "haz-measurement-device",
        hotspotId: "spot-measurement-device",
        title: "WBGT管理と症状対応を代替できない測定",
        what: "監督者はガン型機器を見ていますが、適合するWBGT計で作業位置の暑さ指数を測定しているとは確認できず、症状のある作業者への対応も始まっていません。",
        why: "表面温度等を測る機器はWBGTの測定を代替できません。また、測定値の確認を優先すると、目の前の症状者の離脱・冷却・報告が遅れます。",
        possibleAccident: "暑熱リスクを過小評価して作業を継続し、症状者の熱中症が短時間で重症化します。",
        firstAction: "機器の確認より先に症状者を作業から離脱させ、冷却・報告・見守りを開始します。環境管理は適合するWBGT計を作業位置で正しく使用します。",
        engineeringControls: ["適合するWBGT計を作業位置・高さ・条件に合わせて配置する"],
        administrativeControls: [
          "WBGTの測定方法・記録・作業短縮基準と、症状発生時は測定より救護を優先する手順を定める",
        ],
        ppe: [
          "測定担当者も現場に必要な保護帽・安全靴・高視認性安全服を維持する（WBGT管理の代替にはしない）",
        ],
        stopEscalationConditions: [
          "適合するWBGT計や測定手順を確認できない暑熱作業、または症状者への初動が始まっていないとき",
        ],
        sourceIds: [S.heat.id, S.heatRule2025.id],
      },
    ],
    distractor: {
      hotspotId: "spot-shade-canopy",
      label: "日陰をつくる休憩テントの屋根",
      explanation:
        "日陰を設けること自体は適切な工学的対策です。ただし、作業点からの距離、冷却効果、利用しやすさを確認し、症状者には直ちに離脱・冷却・報告・見守りを行います。",
    },
    answerExplanation:
      "症状がある人への最優先行動は測定値の再確認ではなく、作業離脱、冷却、報告、一人にしないことです。2025年施行の措置では、対象作業で報告体制・実施手順・関係者への周知が必要です。",
    preventionHierarchy: {
      elimination: ["暑い時間帯・高負荷工程を避け、作業を延期・中止する"],
      substitution: ["機械化・遠隔化・軽作業へ変更し代謝負荷を下げる"],
      engineering: ["日陰、冷房、送風、冷水、身体冷却設備を近接配置する"],
      administrative: ["WBGT、順化、休憩、バディ、報告・救急手順を運用する"],
      ppe: ["暑熱適合の作業服・冷却用品と必要な安全PPEを両立する"],
    },
    countermeasureOptions: [
      {
        id: "measure-heat-remove",
        label: "直ちに作業から離脱させ、涼しい場所で身体を冷却する",
        hierarchy: "elimination",
        recommended: true,
        rationale: "暑熱ばく露を止め、重篤化を防ぐ最優先行動です。",
      },
      {
        id: "measure-heat-report",
        label: "担当者へ報告し一人にせず、手順に従い医療判断する",
        hierarchy: "administrative",
        recommended: true,
        rationale: "本人判断だけにせず、監視と救急対応を継続します。",
      },
      {
        id: "measure-heat-plan",
        label: "日陰・冷水を近接配置しWBGTに応じ作業を短縮する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "次の発症を設備と作業計画の両面で防ぎます。",
      },
      {
        id: "measure-heat-finish",
        label: "本人が大丈夫と言えば区切りまで作業を続ける",
        hierarchy: "administrative",
        recommended: false,
        rationale: "本人が異常を正しく判断できない場合があり、重症化を招きます。",
      },
    ],
    officialSources: [S.heat, S.heatRule2025],
    relatedAccidents: [
      accident(
        "mhlw-102009",
        "猛暑日の屋外建設現場で作業継続中に熱中症",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-612-2",
        "労働安全衛生規則 第612条の2",
        "熱中症 第612条の2",
        "熱中症のおそれがある作業者の報告体制・措置手順",
      ),
    ],
    relatedQualifications: [
      qualification(
        "jc-standard",
        "職長等教育",
        "作業者の配置・指揮・異常時対応を担う立場では対象業種・職務を確認",
      ),
    ],
    kyPrefill: {
      workDetail: "真夏の屋外で行う掘削・運搬等の身体負荷作業",
      risks: [
        {
          hazard: "初期症状を我慢して作業継続し熱中症が重症化する",
          reduction: "直ちに離脱・冷却・報告し、一人にせず手順どおり医療判断する",
        },
        {
          hazard: "相互確認がなく本人の申告前に状態が悪化する",
          reduction: "バディ制と定時確認を行い、異変を誰でも報告できるようにする",
        },
        {
          hazard: "休憩・冷却設備が遠く利用が遅れる",
          reduction: "作業点近くに日陰・冷水・冷却設備を置きWBGTで作業を短縮する",
        },
      ],
      humanReviewRequired: true,
      notice:
        "実測WBGT、作業強度、服装、順化、体調、緊急連絡・搬送手順を現場で確認し、法令対象を判断してください。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "初期症状時の作業離脱・冷却・報告・見守りを説明できる",
        "測定・設備を置くだけでなく作業計画へ反映できる",
      ],
      openingQuestion:
        "中央の作業者に、次の一分で最初に何をしますか。",
      followUpQuestions: [
        "本人が『大丈夫』と言った場合も一人にしてよいですか。",
        "この現場の報告先と救急要請の条件は決まっていますか。",
      ],
      revealCue:
        "『作業離脱』『冷却』『一人にしない』が出たら解答を表示します。",
      commonMistakes: ["水を渡して本人だけを休ませれば十分と考えること"],
      summary:
        "異変を見たら離脱・冷却・報告し、一人にしない。回復判断と救急手順を事前に決める。",
    }),
    seasonalWeights: {
      default: 0.8,
      summer: 5,
      rainy: 1.4,
      typhoon: 1,
      winter: 0.35,
    },
    ...publication,
  },
  {
    id: "vkyt-011",
    slug: "warehouse-trip",
    title: "倉庫通路のフィルム・配線・水濡れ・突出物を除く",
    shortTitle: "通路・転倒",
    category: "trip",
    categoryTags: ["trip", "load-handling"],
    industry: ["倉庫業", "運輸業", "製造業"],
    difficulty: "入門",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/warehouse-trip.webp",
      width: 1600,
      height: 900,
      alt: "倉庫通路で荷物により足元が見えない作業者の前に、垂れたフィルム、横断配線、水たまり、突出パレットがある合成安全教育イラスト",
      fullDescription:
        "倉庫の緑色歩行通路で、作業者が大きな箱を抱えて歩いています。箱で足元の一部が見えません。左の積荷から透明なストレッチフィルムが通路へ垂れています。黒い延長線が通路を横切り、右手前に水たまりがあります。右の木製パレットはラック線から通路へ突出しています。奥の別作業者は台車を押しながら棚の方を見ています。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-blocked-view",
        x: 47,
        y: 38,
        radius: 7,
        label: "箱で足元が見えにくい運搬姿勢",
        hazardId: "haz-blocked-view",
      },
      {
        id: "spot-trailing-film",
        x: 25,
        y: 64,
        radius: 6,
        label: "通路へ垂れたストレッチフィルム",
        hazardId: "haz-trailing-film",
      },
      {
        id: "spot-aisle-cable",
        x: 48,
        y: 85,
        radius: 7,
        label: "歩行通路を横断する配線",
        hazardId: "haz-aisle-cable",
      },
      {
        id: "spot-floor-spill",
        x: 78,
        y: 83,
        radius: 6,
        label: "区画されていない水たまり",
        hazardId: "haz-floor-spill",
      },
      {
        id: "spot-pallet-corner",
        x: 90,
        y: 70,
        radius: 6,
        label: "通路へ突出したパレット角",
        hazardId: "haz-pallet-corner",
      },
      {
        id: "spot-rack-upright",
        x: 90,
        y: 24,
        radius: 5,
        label: "ラックの支柱",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-blocked-view",
        hotspotId: "spot-blocked-view",
        title: "荷で足元が見えない運搬",
        what: "作業者が大きな箱を抱え、進行方向の足元と障害物を十分に見られません。",
        why: "つまずき・濡れ・接近者を発見してから回避する時間が短くなります。",
        possibleAccident: "本人の転倒、荷の落下、他の作業者との衝突・挟まれにつながります。",
        firstAction: "いったん安全な場所へ荷を置き、視界を確保できる台車・分割運搬へ変更します。",
        engineeringControls: ["適切な台車・運搬補助具を用意する"],
        administrativeControls: ["視界を遮る持ち方・過大な一人運搬を禁止する"],
        ppe: ["滑りにくい安全靴", "手袋"],
        stopEscalationConditions: [
          "足元・進行方向を見通せない荷姿や重量のとき",
        ],
        sourceIds: [S.trip.id],
      },
      {
        id: "haz-trailing-film",
        hotspotId: "spot-trailing-film",
        title: "通路へ垂れたフィルム",
        what: "透明な梱包フィルムが歩行通路へ伸びています。",
        why: "視認しにくく、足や台車キャスターへ絡み付きます。",
        possibleAccident: "つまずき転倒、台車の急停止、荷崩れにつながります。",
        firstAction: "通路を一時区画し、フィルムを回収・固定します。",
        engineeringControls: ["梱包材回収容器を作業点近くへ設ける"],
        administrativeControls: ["4Sと随時清掃の担当・頻度を決める"],
        ppe: ["安全靴"],
        stopEscalationConditions: ["透明材・紐・破片を通路から除去できないとき"],
        sourceIds: [S.trip.id],
      },
      {
        id: "haz-aisle-cable",
        hotspotId: "spot-aisle-cable",
        title: "通路横断配線",
        what: "延長線が歩行通路を低い位置で横切っています。",
        why: "足や台車が引っ掛かり、転倒だけでなくプラグ抜け・断線を生じます。",
        possibleAccident: "転倒、荷崩れ、配線損傷による感電・火災につながります。",
        firstAction: "通路を止め、配線を上方・側方へ移すか、適合するケーブル保護を使用します。",
        engineeringControls: ["配線を架空化し、やむを得ない横断部は固定カバーで保護する"],
        administrativeControls: ["仮設配線経路を作業前に計画する"],
        ppe: ["安全靴"],
        stopEscalationConditions: [
          "配線を安全に保護・迂回できない、被覆に損傷があるとき",
        ],
        sourceIds: [S.trip.id, S.electrical.id],
      },
      {
        id: "haz-floor-spill",
        hotspotId: "spot-floor-spill",
        title: "濡れた床",
        what: "水たまりが除去・区画されず、光の反射で境界も分かりにくい状態です。",
        why: "靴底・台車車輪の摩擦が低下し、汚れが他の床へ拡散します。",
        possibleAccident: "滑り転倒、台車の制動不能、二次的な接触事故につながります。",
        firstAction: "立入を区画し、漏れの発生源を止め、床を清掃・乾燥します。",
        engineeringControls: ["漏れ修理、排水改善、滑りにくい床材を検討する"],
        administrativeControls: ["発見時の区画・清掃・報告手順を定める"],
        ppe: ["作業床に適合する耐滑安全靴"],
        stopEscalationConditions: [
          "漏れが継続する、物質が不明、床を乾燥できないとき",
        ],
        sourceIds: [S.trip.id],
      },
      {
        id: "haz-pallet-corner",
        hotspotId: "spot-pallet-corner",
        title: "通路へ突出したパレット",
        what: "木製パレットの角が保管線を越えて歩行通路へ出ています。",
        why: "荷で足元が見えない人や台車が接触し、足を取られます。",
        possibleAccident: "つまずき、すね・足部負傷、台車衝突・荷崩れにつながります。",
        firstAction: "パレットを保管線内へ戻し、通路幅を復旧します。",
        engineeringControls: ["ラック・保管枠に物理ストッパーを設ける"],
        administrativeControls: ["通路幅の巡視と4Sを定着させる"],
        ppe: ["安全靴"],
        stopEscalationConditions: ["所定通路幅を確保できないとき"],
        sourceIds: [S.trip.id],
      },
    ],
    distractor: {
      hotspotId: "spot-rack-upright",
      label: "ラック支柱",
      explanation:
        "画像右奥の支柱そのものは正解ではありません。実際には変形・固定・許容荷重を別の点検で確認します。",
    },
    answerExplanation:
      "転倒対策は『足元注意』だけでなく、見える運搬、4S、濡れの発生源対策、配線経路、保管線の維持を設備・作業方法として行います。見つけたらまず区画し、次の人が踏む前に除去します。",
    preventionHierarchy: {
      elimination: ["通路から梱包材・配線・水・突出物をなくす"],
      substitution: ["視界を確保できる台車・小分け運搬へ変更する"],
      engineering: ["配線架空化、漏れ修理、保管ストッパー、耐滑床を整える"],
      administrative: ["4S、巡視、発見時区画、通路幅管理を行う"],
      ppe: ["作業床に適合する耐滑安全靴", "手袋"],
    },
    countermeasureOptions: [
      {
        id: "measure-trip-clear",
        label: "通路を止め、フィルム・配線・突出物を除去する",
        hierarchy: "elimination",
        recommended: true,
        rationale: "複数のつまずき原因を通行前に除きます。",
      },
      {
        id: "measure-trip-leak",
        label: "水濡れを区画し、漏れを止めて清掃・乾燥する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "滑り原因の発生源と床面の両方を改善します。",
      },
      {
        id: "measure-trip-cart",
        label: "足元が見える台車・小分け運搬へ変更する",
        hierarchy: "substitution",
        recommended: true,
        rationale: "障害物を早く認識し、荷の落下も減らします。",
      },
      {
        id: "measure-trip-sign",
        label: "注意表示だけ置いて同じ通路を使う",
        hierarchy: "administrative",
        recommended: false,
        rationale: "原因が残ったままで、荷で表示が見えない人もいます。",
      },
    ],
    officialSources: [S.trip, S.electrical],
    relatedAccidents: [
      accident(
        "mhlw-100060",
        "倉庫の狭い通路で床の突起物により転倒",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-540",
        "労働安全衛生規則 第540条",
        "通路 第540条",
        "通路",
      ),
    ],
    relatedQualifications: [
      qualification(
        "jc-standard",
        "職長等教育",
        "作業手順・配置・4Sを直接指揮する立場では対象業種・職務を確認",
      ),
    ],
    kyPrefill: {
      workDetail: "倉庫歩行通路での箱・台車の運搬",
      risks: [
        {
          hazard: "足元が見えない状態でフィルム・配線につまずき転倒する",
          reduction: "台車・小分け運搬へ変え、通路上の障害物を除去する",
        },
        {
          hazard: "床の水濡れで滑り転倒・台車が制動不能になる",
          reduction: "立入を区画し、漏れを止めて清掃・乾燥する",
        },
        {
          hazard: "通路へ突出したパレットへ接触し荷崩れする",
          reduction: "保管線内へ戻し、通路幅を巡視で維持する",
        },
      ],
      humanReviewRequired: true,
      notice:
        "通路幅、床材、漏れ物質、配線用途、荷の重量・視界を現場で確認する未確定候補です。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "滑り・つまずき・見えない運搬を別々に確認できる",
        "注意表示より原因除去を優先できる",
      ],
      openingQuestion:
        "箱を持つ作業者が次の3歩で触れるものを順に挙げてください。",
      followUpQuestions: [
        "透明フィルムは誰に見えにくいですか。",
        "水たまりを拭くだけで再発を防げますか。",
      ],
      revealCue:
        "『視界』『フィルム』『配線』『水』『パレット』から3つ出たら表示します。",
      commonMistakes: ["注意表示と耐滑靴だけで原因を残すこと"],
      summary:
        "通路は見える状態で使い、障害物・濡れ・突出物を発見した人が区画して除去する。",
    }),
    seasonalWeights: {
      default: 1.15,
      summer: 1,
      rainy: 2.2,
      typhoon: 1.5,
      winter: 1.5,
    },
    ...publication,
  },
  {
    id: "vkyt-012",
    slug: "lone-maintenance",
    title: "一人保守で遮断・連絡・救援・退路を確保する",
    shortTitle: "一人作業",
    category: "lone-work",
    categoryTags: ["lone-work", "electrical", "trip"],
    industry: ["製造業", "設備保全", "ビルメンテナンス"],
    difficulty: "応用",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/lone-maintenance.webp",
      width: 1600,
      height: 900,
      alt: "無人のポンプ室で一人の作業者が未遮断の設備を点検し、無線機が遠く、配線と台車が退路を妨げる合成安全教育イラスト",
      fullDescription:
        "暗めのポンプ室で、一人の作業者が大型ポンプと配管の低い位置を点検しています。大きな手動弁は操作可能な状態で、施錠・表示器具はありません。可搬式投光器のケーブルが唯一の出入口方向を横切っています。携帯無線機は右手前の離れた作業台に置かれています。出入口には保全台車があり、扉付近の移動を狭めています。室内にほかの人はいません。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-lone-position",
        x: 51,
        y: 56,
        radius: 8,
        label: "配管の陰で単独作業する作業者",
        hazardId: "haz-lone-position",
      },
      {
        id: "spot-unlocked-valve",
        x: 43,
        y: 33,
        radius: 6,
        label: "施錠されていない大型弁",
        hazardId: "haz-unlocked-valve",
      },
      {
        id: "spot-exit-cable",
        x: 68,
        y: 80,
        radius: 7,
        label: "退路を横切る投光器ケーブル",
        hazardId: "haz-exit-cable",
      },
      {
        id: "spot-distant-radio",
        x: 89,
        y: 63,
        radius: 5,
        label: "手の届かない場所の無線機",
        hazardId: "haz-distant-radio",
      },
      {
        id: "spot-door-cart",
        x: 82,
        y: 48,
        radius: 6,
        label: "出入口近くの保全台車",
        hazardId: "haz-door-cart",
      },
      {
        id: "spot-work-light",
        x: 72,
        y: 66,
        radius: 5,
        label: "点灯している可搬式投光器",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-lone-position",
        hotspotId: "spot-lone-position",
        title: "発見・救援が遅れる単独位置",
        what: "作業者が配管の陰で一人作業をし、出入口から姿勢・状態を確認できません。",
        why: "挟まれ、感電、体調不良、転倒が起きても自分で通報できない可能性があります。",
        possibleAccident: "負傷後の長時間放置、救命・停止操作の遅れ、救助者の二次災害につながります。",
        firstAction: "作業を始めず、対象作業の単独可否を再評価し、監視・定時連絡・救援体制を整えます。",
        engineeringControls: ["非常停止、状態監視、携帯通信、位置確認手段を整える"],
        administrativeControls: ["単独禁止作業、定時連絡、未応答時の救援手順を定める"],
        ppe: ["作業に必要なPPE", "常時携帯できる通信手段"],
        stopEscalationConditions: [
          "未応答時に直ちに確認・救援できないとき",
          "挟まれ・感電・酸欠等の高危険作業を単独で行う計画のとき",
        ],
        sourceIds: [S.loneWorkSafetyManagement.id],
      },
      {
        id: "haz-unlocked-valve",
        hotspotId: "spot-unlocked-valve",
        title: "エネルギー隔離の未実施",
        what: "設備へ流体・機械エネルギーを供給し得る弁に施錠・表示がありません。",
        why: "第三者操作、残圧、逆流、別系統からの供給で設備が動く可能性があります。",
        possibleAccident: "巻き込まれ、挟まれ、高温・高圧流体の噴出で重篤災害になります。",
        firstAction: "設備から離れ、全エネルギー源を特定し、遮断・施錠・残留エネルギー解放・ゼロ確認を行います。",
        engineeringControls: ["施錠可能な隔離点と残圧解放設備を設ける"],
        administrativeControls: ["ロックアウト・タグアウトと復旧許可手順を運用する"],
        ppe: ["流体・圧力・薬品に適合する保護具"],
        stopEscalationConditions: [
          "エネルギー源を特定・隔離・ゼロ確認できないとき",
        ],
        sourceIds: [S.machineryIsolation.id],
      },
      {
        id: "haz-exit-cable",
        hotspotId: "spot-exit-cable",
        title: "退路を横切るケーブル",
        what: "投光器ケーブルが作業位置と唯一の出入口の間を横切っています。",
        why: "緊急退避時に足を取られ、照明も同時に倒れる・消える可能性があります。",
        possibleAccident: "転倒、暗所での二次衝突、退避遅れにつながります。",
        firstAction: "配線を側方・上方へ移し、退路を連続して空けます。",
        engineeringControls: ["配線を架空化・固定し、独立した非常照明を確保する"],
        administrativeControls: ["作業開始前に退路と非常口を確認する"],
        ppe: ["安全靴", "携帯照明"],
        stopEscalationConditions: ["出入口・退路・照明を確保できないとき"],
        sourceIds: [S.trip.id, S.loneWorkSafetyManagement.id],
      },
      {
        id: "haz-distant-radio",
        hotspotId: "spot-distant-radio",
        title: "通信手段が手元にない",
        what: "無線機が作業者の手の届かない離れた場所にあります。",
        why: "転倒・挟まれ・体調不良で移動できないと、連絡手段を使えません。",
        possibleAccident: "通報と救援開始が遅れ、負傷・体調悪化が重篤化します。",
        firstAction: "無線機を身体へ確実に携帯し、通信試験と定時連絡を行います。",
        engineeringControls: ["ハンズフリー・自動警報等の通信補助を検討する"],
        administrativeControls: ["連絡間隔、呼出し先、未応答時の行動を決める"],
        ppe: ["身体へ固定できる通信機器"],
        stopEscalationConditions: ["通信不能・圏外・未応答対応者不在のとき"],
        sourceIds: [S.loneWorkSafetyManagement.id],
      },
      {
        id: "haz-door-cart",
        hotspotId: "spot-door-cart",
        title: "出入口の障害物",
        what: "保全台車が出入口付近を狭め、扉の操作・担架搬送を妨げます。",
        why: "本人の退避と救助者・救急隊の進入に時間がかかります。",
        possibleAccident: "避難・救援遅れ、台車との接触、扉の閉じ込めにつながります。",
        firstAction: "台車を所定位置へ移し、扉幅と救援経路を確保します。",
        engineeringControls: ["出入口前に物を置けない区画・ストッパーを設ける"],
        administrativeControls: ["救援経路を作業前点検へ含める"],
        ppe: ["安全靴"],
        stopEscalationConditions: ["本人・救助者の出入りを確保できないとき"],
        sourceIds: [S.trip.id, S.loneWorkSafetyManagement.id],
      },
    ],
    distractor: {
      hotspotId: "spot-work-light",
      label: "点灯している投光器",
      explanation:
        "投光器で作業点を照らすこと自体は良い要素です。まぶしさ、転倒、漏電、非常照明、配線経路を別に確認します。",
    },
    answerExplanation:
      "一人作業では事故を起こさない対策に加え、起きたときに発見・停止・救援できる設計が必要です。高危険作業は単独で行わず、隔離・携帯通信・定時連絡・未応答時行動・退路を開始前に成立させます。",
    preventionHierarchy: {
      elimination: ["高危険保守を単独で行わず、停止時間帯に複数名で実施する"],
      substitution: ["遠隔監視・外部点検へ変更し設備内部への接近を減らす"],
      engineering: ["隔離点、施錠、非常停止、通信、退路、非常照明を整える"],
      administrative: ["単独可否、定時連絡、未応答、救援・復電手順を定める"],
      ppe: ["作業危険に適合するPPE", "身体へ固定した通信・照明"],
    },
    countermeasureOptions: [
      {
        id: "measure-lone-pair",
        label: "高危険保守を単独から複数名・監視付き作業へ変更する",
        hierarchy: "elimination",
        recommended: true,
        rationale: "発見・停止・救援ができない単独状態を除きます。",
      },
      {
        id: "measure-lone-lockout",
        label: "全エネルギー源を遮断・施錠しゼロを確認する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "不意な起動・流体放出を発生源で防ぎます。",
      },
      {
        id: "measure-lone-contact",
        label: "無線を携帯し定時連絡と未応答時救援を決める",
        hierarchy: "administrative",
        recommended: true,
        rationale: "動けない場合にも異常を早く検知できます。",
      },
      {
        id: "measure-lone-door",
        label: "扉を開けたままなら無線機は離れた机でよい",
        hierarchy: "administrative",
        recommended: false,
        rationale: "配管の死角や移動不能時には、開いた扉だけでは連絡できません。",
      },
    ],
    officialSources: [
      S.loneWorkSafetyManagement,
      S.machineryIsolation,
      S.trip,
    ],
    relatedAccidents: [
      accident(
        "mhlw-100500",
        "保守作業中の機械挟まれを編集再構成した事故参考例",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-107",
        "労働安全衛生規則 第107条",
        "機械 掃除 修理 運転停止 第107条",
        "掃除等の場合の運転停止等",
      ),
    ],
    relatedQualifications: [
      qualification(
        "jc-standard",
        "職長等教育",
        "保守作業の配置・指揮・異常時対応を担う立場では対象業種・職務を確認",
      ),
    ],
    kyPrefill: {
      workDetail: "ポンプ室での単独点検・保守作業",
      risks: [
        {
          hazard: "単独で設備事故・体調不良となり発見と救援が遅れる",
          reduction: "単独可否を見直し、複数名または監視・定時連絡・未応答救援を設ける",
        },
        {
          hazard: "弁・電源が未隔離で設備が動き挟まれる",
          reduction: "全エネルギーを遮断・施錠・残圧解放しゼロ確認する",
        },
        {
          hazard: "配線・台車が退路と救援経路を塞ぐ",
          reduction: "配線を架空化し、出入口・担架経路を空ける",
        },
      ],
      humanReviewRequired: true,
      notice:
        "単独禁止基準、設備エネルギー、通信、圏外、救援時間、救助者の安全を責任者が確認する候補です。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "一人作業で必要な予防と救援の両方を説明できる",
        "隔離・通信・未応答・退路を開始前に確認できる",
      ],
      openingQuestion:
        "この作業者が動けなくなったら、何分で誰が気付きますか。",
      followUpQuestions: [
        "弁を閉じただけでエネルギーはゼロでしょうか。",
        "救助者が安全に入れる経路はありますか。",
      ],
      revealCue:
        "『遮断』『無線』『定時連絡』『退路』から2つ以上が出たら表示します。",
      commonMistakes: ["扉を開けておけば単独作業の救援体制になると考えること"],
      summary:
        "単独可否を先に決め、隔離、携帯通信、未応答時行動、救援経路が成立しなければ始めない。",
    }),
    seasonalWeights: {
      default: 1.1,
      summer: 1.2,
      rainy: 1,
      typhoon: 1,
      winter: 1.2,
    },
    ...publication,
  },
  {
    id: "vkyt-013",
    slug: "new-entrant-route",
    title: "新規入場者を吊荷・車両経路へ迷い込ませない",
    shortTitle: "新規入場者",
    category: "newcomer",
    categoryTags: ["newcomer", "load-handling", "traffic"],
    industry: ["建設業", "展示会施工"],
    difficulty: "標準",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/new-entrant-route.webp",
      width: 1600,
      height: 900,
      alt: "展示会施工中の会場で新規入場者が配置図を持ち、開いた区画から吊荷経路へ向かい、監督者と同行者が離れている合成安全教育イラスト",
      fullDescription:
        "展示会場の設営中、左手前の新規入場者が無地の配置図を持ち、緑と黄の床経路の分岐で迷っています。中央では監督者が先を指していますが、新規入場者と一緒に歩いていません。開いた仮設パネルの先では、小さなトラスがチェーンで安定して吊られています。積み上げたパネルが先の視界を遮り、吊荷区画の入口は閉じられていません。右の経験者も吊荷側を見ており、新規入場者を近くで案内していません。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-new-entrant",
        x: 15,
        y: 49,
        radius: 8,
        label: "分岐で迷う新規入場者",
        hazardId: "haz-new-entrant",
      },
      {
        id: "spot-open-barrier",
        x: 53,
        y: 66,
        radius: 6,
        label: "閉鎖されていない区画入口",
        hazardId: "haz-open-barrier",
      },
      {
        id: "spot-suspended-load",
        x: 64,
        y: 28,
        radius: 8,
        label: "経路上方の吊荷",
        hazardId: "haz-suspended-load",
      },
      {
        id: "spot-blocked-route",
        x: 72,
        y: 57,
        radius: 7,
        label: "先の見通しを遮る積みパネル",
        hazardId: "haz-blocked-route",
      },
      {
        id: "spot-distant-supervisor",
        x: 52,
        y: 46,
        radius: 6,
        label: "離れて方向だけ示す監督者",
        hazardId: "haz-distant-supervisor",
      },
      {
        id: "spot-blank-booth",
        x: 25,
        y: 18,
        radius: 5,
        label: "無地の仮設間仕切り",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-new-entrant",
        hotspotId: "spot-new-entrant",
        title: "現場固有ルールを理解できないまま移動",
        what: "新規入場者が経路・作業区域・吊荷範囲を判断できず、一人で進もうとしています。",
        why: "一般的な経験があっても、現場固有の配置・合図・退避場所は初見では分かりません。",
        possibleAccident: "吊荷・車両との接触、立入禁止区域への侵入、緊急時の誤退避につながります。",
        firstAction: "移動を止め、現場状況・危険箇所・ルールを理解確認付きで説明し、同行者を付けます。",
        engineeringControls: ["歩行路と危険区域を連続した物理区画で分ける"],
        administrativeControls: ["新規入場者教育、現地案内、理解確認、識別方法を行う"],
        ppe: ["現場指定PPE", "高視認性安全服"],
        stopEscalationConditions: [
          "教育・理解確認・同行者・安全な経路が整っていないとき",
        ],
        sourceIds: [S.newcomer.id],
      },
      {
        id: "haz-open-barrier",
        hotspotId: "spot-open-barrier",
        title: "危険区域入口の開口",
        what: "仮設パネルの入口が開き、吊荷経路へ容易に入れる状態です。",
        why: "表示を知らない人や来場者が、近道・正規経路と誤認します。",
        possibleAccident: "吊荷落下範囲への侵入、車両・資材との接触につながります。",
        firstAction: "吊荷作業を止め、入口を物理的に閉鎖し、監視できる出入口へ集約します。",
        engineeringControls: ["容易に開放できない連続柵・ゲートを設ける"],
        administrativeControls: ["入退場権限と監視者を定める"],
        ppe: ["高視認性安全服", "保護帽"],
        stopEscalationConditions: ["第三者が吊荷範囲へ入れる状態のとき"],
        sourceIds: [S.newcomer.id],
      },
      {
        id: "haz-suspended-load",
        hotspotId: "spot-suspended-load",
        title: "吊荷経路との交差",
        what: "新規入場者の進行先上方に吊荷があります。",
        why: "吊具・荷の異常や荷振れが起きたとき、真下・近傍では退避できません。",
        possibleAccident: "飛来・落下、荷との接触、挟まれにより死亡・重傷となります。",
        firstAction: "吊荷作業を停止するか、人の経路を吊荷範囲外へ完全分離します。",
        engineeringControls: ["吊荷範囲を物理区画し、歩行路と交差させない"],
        administrativeControls: ["吊荷下立入禁止、合図者、作業時間分離を徹底する"],
        ppe: ["保護帽", "安全靴", "高視認性安全服"],
        stopEscalationConditions: [
          "吊荷範囲と人の経路を分離できないとき",
        ],
        sourceIds: [S.newcomer.id],
      },
      {
        id: "haz-blocked-route",
        hotspotId: "spot-blocked-route",
        title: "積みパネルによる見通し不良",
        what: "高く積んだパネルが交差部・作業区域の先を見えなくしています。",
        why: "歩行者・車両・吊荷の接近を互いに発見できません。",
        possibleAccident: "交差部での衝突、荷との接触、パネルの転倒・挟まれにつながります。",
        firstAction: "資材を移動・低く保管し、交差部の見通しを確保します。",
        engineeringControls: ["交差部に資材を置けない保管区画を設ける"],
        administrativeControls: ["見通し基準と資材置場を施工計画へ入れる"],
        ppe: ["高視認性安全服", "安全靴"],
        stopEscalationConditions: ["交差部の相互視認を確保できないとき"],
        sourceIds: [S.newcomer.id],
      },
      {
        id: "haz-distant-supervisor",
        hotspotId: "spot-distant-supervisor",
        title: "方向指示だけで同行・理解確認がない",
        what: "監督者は離れた位置から方向だけを示し、危険箇所の現地説明・復唱確認をしていません。",
        why: "本人は指示を正しく理解したか確認できず、分からないことを質問しにくくなります。",
        possibleAccident: "誤経路、禁止作業、緊急時の不適切行動につながります。",
        firstAction: "作業を止め、同行して現地点を示し、本人の言葉で復唱・実演してもらいます。",
        engineeringControls: ["色に依存しない連続した経路・ゲートを整える"],
        administrativeControls: ["理解確認、質問先、当日作業範囲を記録・共有する"],
        ppe: ["現場指定PPE"],
        stopEscalationConditions: [
          "言語・経験・現場理解に合わせた説明と確認ができないとき",
        ],
        sourceIds: [S.newcomer.id],
      },
    ],
    distractor: {
      hotspotId: "spot-blank-booth",
      label: "無地の仮設間仕切り",
      explanation:
        "左奥の間仕切り自体は主な正解ではありません。固定・転倒防止・避難幅は施工計画で別に点検します。",
    },
    answerExplanation:
      "新規入場者教育は紙を渡すだけでなく、現場の状況・危険箇所・ルールを現地で示し、本人の言葉や動作で理解を確認します。教育が終わるまでは同行させ、人の経路を吊荷・車両から物理分離します。",
    preventionHierarchy: {
      elimination: ["教育完了前は危険作業区域へ入場させない"],
      substitution: ["吊荷作業と新規入場者の移動時間を分離する"],
      engineering: ["連続歩行路、ゲート、見通しの良い資材配置を整える"],
      administrative: ["現地教育、同行、復唱・実演、質問先を運用する"],
      ppe: ["現場指定PPE", "高視認性安全服", "保護帽", "安全靴"],
    },
    countermeasureOptions: [
      {
        id: "measure-newcomer-stop",
        label: "教育・理解確認が終わるまで危険区域への移動を止める",
        hierarchy: "elimination",
        recommended: true,
        rationale: "現場固有危険を知らない状態での立入りをなくします。",
      },
      {
        id: "measure-newcomer-route",
        label: "吊荷と交差しない連続歩行路・ゲートを設ける",
        hierarchy: "engineering",
        recommended: true,
        rationale: "誤経路でも吊荷範囲へ入りにくくします。",
      },
      {
        id: "measure-newcomer-guide",
        label: "同行して危険箇所を示し、復唱・実演で確認する",
        hierarchy: "administrative",
        recommended: true,
        rationale: "方向指示だけでなく、本人の理解を確認できます。",
      },
      {
        id: "measure-newcomer-map",
        label: "配置図を渡したので一人で経路を探してもらう",
        hierarchy: "administrative",
        recommended: false,
        rationale: "図だけでは変化する現場と吊荷範囲を理解できません。",
      },
    ],
    officialSources: [S.newcomer],
    relatedAccidents: [
      accident(
        "mhlw-100020",
        "新規採用者への指導が不十分な溶接作業中の墜落",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-ho-59",
        "労働安全衛生法 第59条",
        "雇入れ時 安全衛生教育 第59条",
        "安全衛生教育",
      ),
    ],
    relatedQualifications: [
      qualification(
        "jc-construction",
        "建設業の職長等教育",
        "新規入場者を含む作業者を直接指揮する対象職務の場合",
      ),
    ],
    kyPrefill: {
      workDetail: "展示会設営現場への新規入場と作業場所への移動",
      risks: [
        {
          hazard: "現場ルール未理解のまま吊荷・車両区域へ迷い込む",
          reduction: "教育・理解確認完了まで立入を止め、同行者を付ける",
        },
        {
          hazard: "開いた区画入口から吊荷経路へ入る",
          reduction: "入口を連続ゲートで閉じ、人の歩行路を吊荷範囲外へ分離する",
        },
        {
          hazard: "積みパネルで交差部が見えず車両・人と接触する",
          reduction: "資材を移し交差部の相互視認を確保する",
        },
      ],
      humanReviewRequired: true,
      notice:
        "当日の配置、作業変更、言語・経験、立入権限、教育内容、理解確認を元方・職長等が確認する候補です。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "新規入場者教育を現地説明と理解確認まで含めて説明できる",
        "教育と歩車・吊荷分離を組み合わせられる",
      ],
      openingQuestion:
        "初めて来た人には、この床の色と開口がどう見えるでしょうか。",
      followUpQuestions: [
        "配置図だけで今日の吊荷範囲まで分かりますか。",
        "『分かりました』以外にどう理解を確認しますか。",
      ],
      revealCue:
        "『同行』『吊荷』『入口』『見通し』から2つ以上が出たら表示します。",
      commonMistakes: ["書面を渡して署名を得れば理解確認が完了すると考えること"],
      summary:
        "教育前は入れず、現地で示して本人に復唱・実演してもらい、危険経路は設備で分ける。",
    }),
    seasonalWeights: {
      default: 1.2,
      summer: 1,
      rainy: 1,
      typhoon: 1,
      winter: 1.2,
    },
    ...publication,
  },
  {
    id: "vkyt-014",
    slug: "night-roadwork",
    title: "夜間道路作業の眩惑・影・開口・規制帯を見直す",
    shortTitle: "夜間作業",
    category: "night",
    categoryTags: ["night", "traffic", "trip"],
    industry: ["道路工事業", "設備保全", "建設業"],
    difficulty: "応用",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/night-roadwork.webp",
      width: 1600,
      height: 900,
      alt: "夜間道路工事で投光器の眩しさと濃い影、通路横断ケーブル、開いたピット、途切れたコーン規制が見える合成安全教育イラスト",
      fullDescription:
        "夜間の道路上で3人が保守作業をしています。左の強い投光器は道路側へ向き、近づく車両と作業者へ眩しさを与えています。投光器のケーブルが歩行経路を横断しています。右手前では工具箱を持つ作業者が足元を見ないまま、開いた矩形ピットの縁沿いへ進んでいます。中央の誘導者は道路側を見ていますが、開口へ近づく作業者を見ていません。コーンのテーパーは途中が開き、車両のライトで強い明暗差があります。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-glare-light",
        x: 30,
        y: 22,
        radius: 7,
        label: "道路側へ向いた強い投光器",
        hazardId: "haz-glare-light",
      },
      {
        id: "spot-shadow-pit",
        x: 82,
        y: 71,
        radius: 8,
        label: "影の中の開口縁へ進む作業者",
        hazardId: "haz-shadow-pit",
      },
      {
        id: "spot-night-cable",
        x: 47,
        y: 78,
        radius: 7,
        label: "歩行経路を横断する投光器ケーブル",
        hazardId: "haz-night-cable",
      },
      {
        id: "spot-cone-gap",
        x: 66,
        y: 48,
        radius: 7,
        label: "途中で開いたコーン規制",
        hazardId: "haz-cone-gap",
      },
      {
        id: "spot-spotter-attention",
        x: 52,
        y: 43,
        radius: 6,
        label: "開口へ近づく作業者を見ていない誘導者",
        hazardId: "haz-spotter-attention",
      },
      {
        id: "spot-parked-truck",
        x: 38,
        y: 47,
        radius: 6,
        label: "規制帯内に停止した作業車",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-glare-light",
        hotspotId: "spot-glare-light",
        title: "投光器の眩惑",
        what: "強い投光器が作業面ではなく道路・人の視線方向へ向いています。",
        why: "瞳孔が明るさへ順応し、暗部の人・開口・障害物を一時的に認識しにくくします。",
        possibleAccident: "車両の規制帯侵入、作業者同士の接触、開口への転落につながります。",
        firstAction: "交通と作業を止められる状態にし、遮光・角度・高さを調整して作業面だけを均一に照らします。",
        engineeringControls: ["防眩フード、複数の低出力照明、均斉度の高い配置にする"],
        administrativeControls: ["照明計画を作成し、運転者・作業者双方の視点で確認する"],
        ppe: ["高視認性安全服", "必要な眼保護具"],
        stopEscalationConditions: [
          "必要照度と防眩を両立できず、暗部を安全確認できないとき",
        ],
        sourceIds: [S.lighting.id],
      },
      {
        id: "haz-shadow-pit",
        hotspotId: "spot-shadow-pit",
        title: "影の中の無防護開口へ接近",
        what: "工具箱を持つ作業者が足元を見ないまま、暗い影と区画不足の開口縁沿いへ進んでいます。",
        why: "明るい方向を見た直後は開口縁を認識しにくく、工具箱で身体の向きも制限されます。",
        possibleAccident: "ピットへの墜落、頭部・脊椎損傷、工具の落下につながります。",
        firstAction: "開口側への進入を止め、開口を堅固に覆うか手すり・区画を設け、周囲を均一に照らします。",
        engineeringControls: ["固定蓋または手すり・幅木付き開口防護を設ける"],
        administrativeControls: ["開口側への進入禁止、合図者、開口点検を作業手順へ入れる"],
        ppe: ["保護帽", "安全靴", "高視認性安全服"],
        stopEscalationConditions: ["開口防護・照明・安全経路を確保できないとき"],
        sourceIds: [S.lighting.id, S.fallPlan.id],
      },
      {
        id: "haz-night-cable",
        hotspotId: "spot-night-cable",
        title: "暗所の通路横断ケーブル",
        what: "投光器ケーブルが明暗境界の歩行経路を横切っています。",
        why: "視認しにくい上、引っ掛けると照明が倒れる・消える二次危険があります。",
        possibleAccident: "転倒、感電、照明喪失による連鎖事故につながります。",
        firstAction: "配線を通路外・上方へ移し、やむを得ない部分は固定保護します。",
        engineeringControls: ["配線架空化、固定カバー、独立非常照明を使用する"],
        administrativeControls: ["夜間の配線経路を作業前巡視で確認する"],
        ppe: ["安全靴"],
        stopEscalationConditions: [
          "配線と歩行路を分離できない、被覆・接続部が濡れているとき",
        ],
        sourceIds: [S.lighting.id, S.trip.id],
      },
      {
        id: "haz-cone-gap",
        hotspotId: "spot-cone-gap",
        title: "規制帯の開口",
        what: "コーンのテーパー・規制帯が途中で途切れ、車両が作業側へ入り得ます。",
        why: "夜間は距離・進路判断が難しく、単独コーンの隙間を走行線と誤認します。",
        possibleAccident: "一般車両が作業区域へ進入し、誘導者・作業者へ接触します。",
        firstAction: "作業を止め、交通規制計画どおり連続した誘導・防護設備を復旧します。",
        engineeringControls: ["連続規制材、衝撃緩衝車、防護車両等を計画に応じ配置する"],
        administrativeControls: ["交通規制図、巡視、退避場所、侵入時合図を共有する"],
        ppe: ["JIS等に適合する高視認性安全服", "保護帽"],
        stopEscalationConditions: ["規制帯・退避場所・交通誘導を維持できないとき"],
        sourceIds: [S.lighting.id],
      },
      {
        id: "haz-spotter-attention",
        hotspotId: "spot-spotter-attention",
        title: "監視対象の分散",
        what: "誘導者が道路側だけを見て、開口縁沿いへ進む作業者を確認していません。",
        why: "一人で交通と作業者の両方を監視すると、どちらかが死角になります。",
        possibleAccident: "作業者の墜落または車両侵入への警告が遅れます。",
        firstAction: "作業を止め、交通監視と作業監視の役割・位置を分けます。",
        engineeringControls: ["見通しと退避を確保できる防護配置にする"],
        administrativeControls: ["監視役割、停止合図、無線連絡を一意にする"],
        ppe: ["高視認性安全服", "誘導用具"],
        stopEscalationConditions: ["一人で複数の死角を監視しなければならないとき"],
        sourceIds: [S.lighting.id],
      },
    ],
    distractor: {
      hotspotId: "spot-parked-truck",
      label: "規制帯内の作業車",
      explanation:
        "作業車が規制帯内に停止していること自体は正解にしていません。輪止め、警光灯、防護位置、一般車への向きは交通規制計画で確認します。",
    },
    answerExplanation:
      "夜間は照度の数字だけでなく、眩惑・影・均斉度・反射を確認します。開口を設備で塞ぎ、配線と歩行路を分け、交通監視と作業監視を一人へ集中させません。",
    preventionHierarchy: {
      elimination: ["交通量の少ない時間でも危険が大きければ作業を延期・通行止めにする"],
      substitution: ["路上作業を減らせる遠隔点検・昼間作業へ変更する"],
      engineering: ["防眩照明、開口防護、配線分離、連続規制・防護車両を整える"],
      administrative: ["照明・規制計画、役割分離、合図、退避訓練を行う"],
      ppe: ["高視認性安全服", "保護帽", "安全靴"],
    },
    countermeasureOptions: [
      {
        id: "measure-night-light",
        label: "防眩と均一照明へ配置を直し、暗部をなくす",
        hierarchy: "engineering",
        recommended: true,
        rationale: "眩惑と深い影を同時に減らします。",
      },
      {
        id: "measure-night-cover",
        label: "開口を固定蓋・手すりで防護し後退経路から外す",
        hierarchy: "engineering",
        recommended: true,
        rationale: "視認に依存せず墜落経路を閉じます。",
      },
      {
        id: "measure-night-roles",
        label: "規制帯を復旧し交通監視と作業監視を分ける",
        hierarchy: "administrative",
        recommended: true,
        rationale: "一人の監視者に複数の死角を負わせません。",
      },
      {
        id: "measure-night-brighter",
        label: "投光器をさらに明るく道路へ向ける",
        hierarchy: "engineering",
        recommended: false,
        rationale: "眩惑と明暗差を大きくし、交通・作業双方の視認性を悪化させます。",
      },
    ],
    officialSources: [S.lighting, S.trip, S.fallPlan],
    relatedAccidents: [
      accident(
        "mhlw-102047",
        "夜間道路工事で視認性不足により車両と接触",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-604",
        "労働安全衛生規則 第604条",
        "照度 第604条",
        "作業場所の照度",
      ),
    ],
    relatedQualifications: [
      qualification(
        "jc-standard",
        "職長等教育",
        "夜間作業の配置・指揮・異常時対応を担う立場では対象業種・職務を確認",
      ),
    ],
    kyPrefill: {
      workDetail: "夜間道路上での設備点検・開口部周辺作業",
      risks: [
        {
          hazard: "投光器の眩惑と影で車両・開口を見落とす",
          reduction: "防眩・均一照明へ調整し、運転者と作業者双方の視点で確認する",
        },
        {
          hazard: "後退中に暗い開口へ墜落する",
          reduction: "固定蓋・手すりで開口を防護し、後退しない経路を設定する",
        },
        {
          hazard: "規制帯の開口から一般車が作業区域へ進入する",
          reduction: "連続規制を復旧し、交通監視と作業監視を分ける",
        },
      ],
      humanReviewRequired: true,
      notice:
        "道路使用・交通規制計画、照度、眩惑、開口、防護車両、退避場所を発注者・道路管理者・責任者と確認する候補です。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "明るさだけでなく眩惑・影・均斉度を確認できる",
        "交通監視と作業監視を役割分離できる",
      ],
      openingQuestion:
        "最も明るい場所を見た直後、最も見えなくなるものは何ですか。",
      followUpQuestions: [
        "投光器は車両運転者からどう見えますか。",
        "一般車が規制帯へ入ったときの退避場所はどこですか。",
      ],
      revealCue:
        "『眩惑』『影』『開口』『規制帯』から2つ以上が出たら表示します。",
      commonMistakes: ["照明を強くすれば必ず安全になると考えること"],
      summary:
        "均一に照らし、開口と配線を設備で処理し、交通と作業の監視役を分ける。",
    }),
    seasonalWeights: {
      default: 1.15,
      summer: 1,
      rainy: 1.3,
      typhoon: 1.4,
      winter: 1.8,
    },
    ...publication,
  },
  {
    id: "vkyt-015",
    slug: "rain-wind-delivery",
    title: "雨天・強風時の搬入で後退車両と風荷重を分離する",
    shortTitle: "雨天・強風",
    category: "traffic",
    categoryTags: ["traffic", "trip", "load-handling"],
    industry: ["建設業", "運輸業", "展示会施工"],
    difficulty: "応用",
    estimatedMinutes: 5,
    image: {
      src: "/visual-ky/scenarios/rain-wind-delivery.webp",
      width: 1600,
      height: 900,
      alt: "強い雨風の搬入口でトラックが後退し、傘の作業者、風を受ける大判パネル、濡れた通路、倒れたコーンがある合成安全教育イラスト",
      fullDescription:
        "強い雨と横風の建設現場搬入口です。小型トラックがゆっくり後退し、左手前の誘導者が運転者から見える位置で停止合図を出しています。トラック後方には透明傘を差した作業者が歩いています。右側では別の作業者が大判パネルを載せた台車を押さえていますが、パネルは風を受けて傾いています。緑の歩行路には水がたまり、手前のコーンとバーが倒れて歩車分離に開口ができています。",
      rightsStatus: "generated-for-this-project",
    },
    hotspots: [
      {
        id: "spot-reversing-truck",
        x: 52,
        y: 48,
        radius: 8,
        label: "後退中のトラックと後方死角",
        hazardId: "haz-reversing-truck",
      },
      {
        id: "spot-umbrella-worker",
        x: 69,
        y: 37,
        radius: 7,
        label: "傘で視界が狭い後方作業者",
        hazardId: "haz-umbrella-worker",
      },
      {
        id: "spot-wind-panel",
        x: 81,
        y: 38,
        radius: 8,
        label: "風を受けて傾く大判パネル",
        hazardId: "haz-wind-panel",
      },
      {
        id: "spot-wet-route",
        x: 67,
        y: 69,
        radius: 7,
        label: "雨水がたまる歩行路",
        hazardId: "haz-wet-route",
      },
      {
        id: "spot-fallen-barrier",
        x: 81,
        y: 83,
        radius: 7,
        label: "倒れたコーンと開いた歩車分離",
        hazardId: "haz-fallen-barrier",
      },
      {
        id: "spot-safe-signal",
        x: 18,
        y: 37,
        radius: 7,
        label: "運転者から見える位置の誘導者",
        hazardId: null,
      },
    ],
    hazards: [
      {
        id: "haz-reversing-truck",
        hotspotId: "spot-reversing-truck",
        title: "後退車両の死角",
        what: "トラックが後退し、荷台・車体で真後ろの人と障害物が運転者から見えにくい状態です。",
        why: "雨滴、ミラーの濡れ、騒音、フードで視界・聴覚がさらに低下します。",
        possibleAccident: "後方作業者との衝突、車両と構造物の間への挟まれにつながります。",
        firstAction: "車両を停止し、誘導者が後方の全員退避と経路を確認してから一つの合図で再開します。",
        engineeringControls: ["車両経路と歩行路を連続した物理柵で分離する"],
        administrativeControls: ["誘導者を一名に定め、見失ったら停止する"],
        ppe: ["防水高視認性安全服", "あご紐を締めた保護帽"],
        stopEscalationConditions: [
          "運転者と誘導者が互いに見えない、後方を無人確認できないとき",
        ],
        sourceIds: [S.badWeather.id, S.vehicleMachinery.id],
      },
      {
        id: "haz-umbrella-worker",
        hotspotId: "spot-umbrella-worker",
        title: "傘による視界・片手の制限",
        what: "作業者が傘を差して後退車両の近くを歩き、周辺視野と片手の自由を失っています。",
        why: "強風で傘があおられ、車両・誘導者・足元を同時に確認できません。",
        possibleAccident: "車両との接触、転倒、傘や資材との接触につながります。",
        firstAction: "車両を止め、作業者を歩行路外へ退避させ、作業用防雨具へ替えます。",
        engineeringControls: ["屋根付き待機場所・分離歩行路を設ける"],
        administrativeControls: ["車両後退中は歩行者通行を止める"],
        ppe: ["両手が使える防水作業着", "高視認性安全服", "安全靴"],
        stopEscalationConditions: ["歩行者と後退車両を時間・空間で分離できないとき"],
        sourceIds: [S.badWeather.id],
      },
      {
        id: "haz-wind-panel",
        hotspotId: "spot-wind-panel",
        title: "大判パネルへの風荷重",
        what: "面積の大きいパネルが横風を受け、台車ごと傾いています。",
        why: "人が支えられる力を急に超え、風向変化で予測不能に回転・転倒します。",
        possibleAccident: "パネルの下敷き、門柱との挟まれ、飛来・落下で周囲が被災します。",
        firstAction: "支え続けず作業を中止し、安全な方向へ退避してパネルを低く固定します。",
        engineeringControls: ["風を受けない屋内搬入、低姿勢台車、適合固定具を使用する"],
        administrativeControls: ["風速・突風の中止基準と資材養生手順を定める"],
        ppe: ["あご紐を締めた保護帽", "手袋", "安全靴"],
        stopEscalationConditions: [
          "強風・突風で資材を安全に固定・制御できないとき",
        ],
        sourceIds: [S.badWeather.id],
      },
      {
        id: "haz-wet-route",
        hotspotId: "spot-wet-route",
        title: "冠水した歩行路",
        what: "歩行路に雨水がたまり、段差・排水溝・路面状態が見えにくくなっています。",
        why: "耐滑性が低下し、水中の障害物や穴を見落とします。",
        possibleAccident: "滑り・つまずき転倒、台車の逸走、車道側への転倒につながります。",
        firstAction: "通路を区画し、排水・清掃するか安全な代替経路へ変更します。",
        engineeringControls: ["排水改善、滑りにくい仮設通路、屋根を設ける"],
        administrativeControls: ["降雨時の経路巡視と閉鎖基準を定める"],
        ppe: ["防水・耐滑安全靴"],
        stopEscalationConditions: ["水深・路面・段差を確認できず安全経路がないとき"],
        sourceIds: [S.badWeather.id, S.trip.id],
      },
      {
        id: "haz-fallen-barrier",
        hotspotId: "spot-fallen-barrier",
        title: "歩車分離の破綻",
        what: "コーンとバーが倒れ、歩行路と車両経路の境界に開口があります。",
        why: "運転者・歩行者とも雨で線を認識しにくく、短い経路へ逸脱します。",
        possibleAccident: "車両と歩行者の接触、台車・資材との衝突につながります。",
        firstAction: "後退を止め、風雨に耐える物理柵で境界を復旧します。",
        engineeringControls: ["十分な重量・固定を持つ連続バリケードを使用する"],
        administrativeControls: ["悪天候中の巡視と破損時停止を定める"],
        ppe: ["高視認性防水服"],
        stopEscalationConditions: ["歩車分離を維持できないとき"],
        sourceIds: [S.badWeather.id],
      },
    ],
    distractor: {
      hotspotId: "spot-safe-signal",
      label: "見える位置から合図する誘導者",
      explanation:
        "運転者から見える位置で一人の誘導者が合図することは良い要素です。ただし、後方の全員退避、合図統一、見失ったら停止まで成立させます。",
    },
    answerExplanation:
      "悪天候では通常手順へ注意を追加するだけでなく、作業中止・搬入延期を第一候補にします。続ける場合も、車両と人の分離、風を受ける資材の固定、排水、風雨に耐える区画が維持できなければ停止します。",
    preventionHierarchy: {
      elimination: ["強風・大雨が収まるまで搬入・屋外運搬を延期・中止する"],
      substitution: ["屋内搬入、低姿勢・小型化した資材、別時間帯へ変更する"],
      engineering: ["連続歩車分離、資材固定、排水・屋根付き通路を整える"],
      administrative: ["風雨の中止基準、誘導者、巡視、退避・養生手順を定める"],
      ppe: ["あご紐を締めた保護帽", "高視認性防水服", "耐滑安全靴"],
    },
    countermeasureOptions: [
      {
        id: "measure-rain-stop",
        label: "風雨が中止基準に達したら搬入を延期・中止する",
        hierarchy: "elimination",
        recommended: true,
        rationale: "後退・風荷重・滑りを同時に悪化させる環境ばく露を除きます。",
      },
      {
        id: "measure-rain-separate",
        label: "車両を停止し、歩行者退避と連続歩車分離を復旧する",
        hierarchy: "engineering",
        recommended: true,
        rationale: "後退車両の死角へ人が入る経路を閉じます。",
      },
      {
        id: "measure-rain-panel",
        label: "大判パネルを低く固定し屋内・低風時の搬入へ変える",
        hierarchy: "substitution",
        recommended: true,
        rationale: "風を受ける面積と人が支える作業を減らします。",
      },
      {
        id: "measure-rain-morepeople",
        label: "人を増やして傾いたパネルを力で押さえる",
        hierarchy: "administrative",
        recommended: false,
        rationale: "突風荷重は急変し、多人数を転倒・挟まれ範囲へ入れます。",
      },
    ],
    officialSources: [S.badWeather, S.vehicleMachinery, S.trip],
    relatedAccidents: [
      accident(
        "mhlw-103760",
        "強風でコンテナが倒壊し点検作業者が被災",
      ),
    ],
    relatedLaws: [
      law(
        "anzen-eisei-kisoku-522",
        "労働安全衛生規則 第522条",
        "悪天候 強風 大雨 作業禁止 第522条",
        "悪天候時の高所作業禁止",
      ),
    ],
    relatedQualifications: [
      qualification(
        "jc-standard",
        "職長等教育",
        "悪天候時の中止・配置・誘導を直接判断する立場では対象業種・職務を確認",
      ),
    ],
    kyPrefill: {
      workDetail: "雨天・強風時の建設現場搬入口での車両後退・資材搬入",
      risks: [
        {
          hazard: "雨で視界が悪い後退車両の死角へ歩行者が入る",
          reduction: "車両を止め全員退避を確認し、連続歩車分離と単一誘導を復旧する",
        },
        {
          hazard: "大判パネルが突風で転倒・飛来し作業者を挟む",
          reduction: "作業を中止し、低く固定して屋内・低風時搬入へ変更する",
        },
        {
          hazard: "冠水通路で滑り車両側へ転倒する",
          reduction: "通路を閉鎖し排水・耐滑経路を整える",
        },
      ],
      humanReviewRequired: true,
      notice:
        "現地風速・降雨、警報、資材面積・固定、車両、路面、法定中止対象を責任者が確認するまで未確定です。",
    },
    facilitator: facilitator({
      learningObjectives: [
        "悪天候時は作業中止を最初の選択肢にできる",
        "後退死角・風荷重・濡れ・区画破綻を組み合わせて説明できる",
      ],
      openingQuestion:
        "人を増やす前に、この搬入を今やめる基準は決まっていますか。",
      followUpQuestions: [
        "パネルへかかる力は風速・面積でどう変わりますか。",
        "誘導者が運転者から見えなくなったら車両はどうしますか。",
      ],
      revealCue:
        "『中止』『後退死角』『パネル』『歩車分離』から2つ以上が出たら表示します。",
      commonMistakes: ["人数を増やせば強風下でも資材を押さえられると考えること"],
      summary:
        "中止基準を先に使い、続けるなら人と車を分け、風を受ける物を固定し、濡れた経路を閉じる。",
    }),
    seasonalWeights: {
      default: 0.9,
      summer: 1,
      rainy: 3.5,
      typhoon: 5,
      winter: 1.2,
    },
    ...publication,
  },
];

export const VISUAL_KY_SCENARIOS: readonly VisualKyScenario[] =
  rawScenarios.map((scenario) => visualKyScenarioSchema.parse(scenario));

export const PUBLIC_VISUAL_KY_SCENARIOS = VISUAL_KY_SCENARIOS.filter(
  (scenario) =>
    scenario.reviewStatus === "reviewed" &&
    scenario.indexability === "index" &&
    (scenario.rightsStatus === "generated-for-this-project" ||
      scenario.rightsStatus === "approved-user-owned"),
);

export function getVisualKyScenarioBySlug(
  slug: string,
): VisualKyScenario | undefined {
  return PUBLIC_VISUAL_KY_SCENARIOS.find(
    (scenario) => scenario.slug === slug,
  );
}

export function getVisualKyScenarioById(
  id: string,
): VisualKyScenario | undefined {
  return PUBLIC_VISUAL_KY_SCENARIOS.find((scenario) => scenario.id === id);
}

export function getVisualKyScenariosByAccidentId(
  accidentId: string,
): VisualKyScenario[] {
  return PUBLIC_VISUAL_KY_SCENARIOS.filter((scenario) =>
    scenario.relatedAccidents.some((accidentItem) => accidentItem.id === accidentId),
  );
}

export function getVisualKyScenariosByLawArticle(
  lawFullName: string,
  articleNum: string,
): VisualKyScenario[] {
  return PUBLIC_VISUAL_KY_SCENARIOS.filter((scenario) =>
    scenario.relatedLaws.some(
      (lawItem) =>
        lawItem.label.includes(lawFullName) &&
        lawItem.label.includes(articleNum),
    ),
  );
}

export function getVisualKyScenariosByQualificationId(
  qualificationId: string,
): VisualKyScenario[] {
  return PUBLIC_VISUAL_KY_SCENARIOS.filter((scenario) =>
    scenario.relatedQualifications.some(
      (qualificationItem) =>
        qualificationItem.id === qualificationId,
    ),
  );
}

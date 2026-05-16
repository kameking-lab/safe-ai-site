import type { ResidenceStatusRule } from "@/types/foreign-worker";

/**
 * 技能実習1号 — first-year trainees. The most restrictive band: dispatch is
 * prohibited, work category is fixed at acceptance time, and the OTIT
 * supervisory body enforces the training-plan compliance.
 */
export const TECHNICAL_INTERN_1: ResidenceStatusRule = {
  id: "technical-intern-1",
  category: "training",
  labelJa: "技能実習1号",
  labelEn: "Technical Intern Training (i)",
  summary:
    "入国1年目の技能実習生。技能実習計画に従って職種・作業に限定された実習を行う。派遣禁止。",
  periodOfStay: "1年以内（在留期間は1年・6月・3月）",
  workScope:
    "技能実習計画に明記された移行対象職種・作業のみ。事業所変更・職種変更は原則不可。",
  unlimitedWorkScope: false,
  transferAllowed: false,
  relevantSafetyLaws: [
    {
      name: "労働基準法",
      summary:
        "国籍に関わらず適用。賃金・労働時間・休日・年次有給休暇は日本人実習生と同一基準を確保する。",
    },
    {
      name: "労働安全衛生法",
      summary:
        "雇入れ時教育（第59条）、危険有害業務への特別教育（第59条3項）、就業制限業務の資格確認（第61条）が国籍を問わず適用される。",
      articles: ["第59条", "第61条", "第66条"],
    },
    {
      name: "労働者派遣法",
      summary:
        "技能実習生の派遣は原則禁止。実習実施者の事業所での直接雇用に限る。",
    },
    {
      name: "技能実習法",
      summary:
        "実習計画の認定・実施・報告、OTITによる監査、人権侵害行為（旅券取り上げ、私生活制限）の禁止を規定。",
      articles: ["第8条", "第48条", "第49条"],
    },
    {
      name: "最低賃金法",
      summary:
        "都道府県別地域別最低賃金および特定（産業別）最低賃金は実習生にも適用。",
    },
  ],
  employerObligations: [
    {
      id: "training-plan",
      title: "認定実習計画どおりの実習実施",
      detail:
        "OTIT認定を受けた実習計画に沿って実習を行う。計画外作業や移行対象外職種への配置転換は技能実習法違反となる。",
      law: { name: "技能実習法", articles: ["第8条", "第16条"], summary: "計画認定と計画通り実施義務" },
    },
    {
      id: "safety-education",
      title: "母国語または分かる言語での安全衛生教育",
      detail:
        "雇入れ時教育（安衛法第59条1項）は理解可能な言語で実施し、実習生が内容を理解したことを確認する。やさしい日本語・母国語パンフレットの併用を推奨。",
      law: { name: "労働安全衛生法", articles: ["第59条"], summary: "雇入れ時等の安全衛生教育" },
    },
    {
      id: "no-passport-taking",
      title: "旅券・在留カードの取り上げ禁止",
      detail:
        "実習生の旅券、在留カード、預貯金通帳、印鑑を会社が保管する行為は禁止。違反は監理団体への許可取消・実習認定取消の対象。",
      law: { name: "技能実習法", articles: ["第48条"], summary: "人権侵害行為の禁止" },
    },
    {
      id: "wage-equality",
      title: "日本人同等以上の報酬",
      detail:
        "同等の業務に従事する日本人と同等以上の報酬。地域別最低賃金との比較ではなく、同等業務日本人賃金との比較が原則。",
      law: { name: "技能実習法", articles: ["第9条"], summary: "報酬要件" },
    },
    {
      id: "monthly-report",
      title: "監理団体への定期報告・面談受入れ",
      detail:
        "監理団体による3か月に1回以上の監査・実習生本人面談への協力義務。",
    },
    {
      id: "accident-report",
      title: "労災発生時の報告",
      detail:
        "労災発生時は労働者死傷病報告（休業4日以上）を遅滞なく労基署へ提出。あわせてOTIT・監理団体への報告も必要。",
      law: { name: "労働安全衛生規則", articles: ["第97条"], summary: "労働者死傷病報告" },
    },
  ],
  workerRights: [
    {
      id: "min-wage",
      title: "最低賃金以上の賃金",
      detail:
        "都道府県別最低賃金以上を受け取る権利。違反賃金は労基署または労働局に申告できる。",
    },
    {
      id: "leave",
      title: "年次有給休暇",
      detail:
        "6か月継続勤務・8割出勤で10日付与。請求は所定の手続きで可能で、取得を理由とした不利益取扱いは禁止。",
      law: { name: "労働基準法", articles: ["第39条"], summary: "年次有給休暇" },
    },
    {
      id: "report-violation",
      title: "違反申告・通報の権利",
      detail:
        "労基署、OTIT母国語相談ホットライン、入管庁外国人在留支援センター（FRESC）等に違反を申告できる。",
    },
    {
      id: "medical-checkup",
      title: "健康診断の受診",
      detail:
        "雇入れ時健診・定期健診（年1回以上）・特定業務従事者健診を、事業者負担で受診できる。",
      law: { name: "労働安全衛生規則", articles: ["第43条", "第44条"], summary: "健康診断" },
    },
    {
      id: "transfer-on-misconduct",
      title: "実習実施者変更の権利",
      detail:
        "実習実施者の倒産・人権侵害・実習困難事案では、監理団体経由で別実習実施者への変更が認められる。",
    },
  ],
  commonTroubles: [
    {
      id: "language-gap-accident",
      title: "言語の壁による作業手順誤解",
      detail:
        "日本語のみの作業手順書を理解できず、適切な保護具未着用や手順省略による被災が発生する。",
      mitigation:
        "やさしい日本語＋母国語の対訳教材を併用し、実技指導と確認テストで理解度を確認する。",
    },
    {
      id: "scope-deviation",
      title: "計画外作業への配置",
      detail:
        "繁忙期に計画外の職種（例：簡易な清掃・配送）に従事させ、技能実習法違反となるケース。",
      mitigation:
        "実習計画記載の作業範囲を現場リーダーに周知。配置転換を要する場合は計画変更申請を先行。",
    },
    {
      id: "deduction-trouble",
      title: "違法な賃金控除",
      detail:
        "寮費・光熱費・食費の過大控除、罰金的控除（遅刻30分で1時間分など）が発生し賃金不払いとなる事例。",
      mitigation:
        "控除は労使協定の範囲・実費の範囲に限定。賃金台帳・控除明細を毎月本人に交付。",
    },
  ],
  sources: [
    { name: "外国人技能実習機構（OTIT）" },
    { name: "厚生労働省 技能実習制度運用要領" },
    { name: "出入国在留管理庁 在留資格『技能実習』" },
  ],
};

/**
 * 技能実習2号 — workers in their second or third year, having completed the
 * Year-1 skill exam (基礎級). Authorised tasks expand within the same
 *移行対象職種・作業.
 */
export const TECHNICAL_INTERN_2: ResidenceStatusRule = {
  id: "technical-intern-2",
  category: "training",
  labelJa: "技能実習2号",
  labelEn: "Technical Intern Training (ii)",
  summary:
    "1号修了かつ技能検定基礎級合格者。同一実習実施者で同一職種・作業の実習を継続する2〜3年目。",
  periodOfStay: "2年以内（在留期間は2年・1年・6月）",
  workScope:
    "1号と同一の移行対象職種・作業。実習計画の認定範囲を超える業務には従事できない。",
  unlimitedWorkScope: false,
  transferAllowed: false,
  relevantSafetyLaws: [
    {
      name: "労働安全衛生法",
      summary:
        "1号より作業範囲が広がるため、特別教育（足場・玉掛け・アーク溶接等）の追加受講が必要なケースが多い。資格証は事業場で携帯可能な状態に。",
      articles: ["第59条3項", "第61条"],
    },
    {
      name: "技能実習法",
      summary:
        "2号移行時には技能検定基礎級合格と実習計画の再認定が必要。在留期間更新時は実習評価試験への合格が条件。",
    },
    { name: "労働基準法", summary: "1号と同様に国籍に関わらず適用。" },
    { name: "最低賃金法", summary: "地域別・特定最低賃金が引き続き適用。" },
  ],
  employerObligations: [
    {
      id: "special-edu",
      title: "拡大作業範囲に対応する特別教育・資格",
      detail:
        "高所作業車運転、玉掛け、足場の組立て等解体、有機溶剤作業主任者業務補助など、2号で従事する作業に必要な特別教育・技能講習を受講させる。",
      law: { name: "労働安全衛生規則", articles: ["第36条"], summary: "特別教育を要する業務" },
    },
    {
      id: "skills-test",
      title: "技能検定3級受検機会の提供",
      detail:
        "2号修了・3号移行の前提となる技能検定3級（または同等の評価試験）受検に必要な時間・費用を確保する。",
    },
    {
      id: "annual-checkup",
      title: "定期健康診断・追加健診",
      detail:
        "粉じん・有機溶剤・特化物・騒音等を取り扱う場合は特殊健診の対象。受診結果は5〜30年の保存義務が業務により異なる。",
      law: { name: "労働安全衛生規則", articles: ["第44条"], summary: "定期健康診断" },
    },
    {
      id: "harassment-prevention",
      title: "ハラスメント防止措置",
      detail:
        "セクハラ・パワハラ・マタハラ防止のため、相談窓口設置と母国語対応を整える。技能実習生は被害申告が遅れる傾向があり、定期面談での早期把握が肝要。",
    },
  ],
  workerRights: [
    {
      id: "skill-test",
      title: "技能検定の受検機会",
      detail:
        "2号修了時の技能検定3級受検は事業主の協力が必要。受検料・通勤費は事業者負担が望ましい。",
    },
    {
      id: "private-life",
      title: "私生活の自由",
      detail:
        "外出制限、携帯電話・SNS利用の禁止、恋愛禁止規定は人権侵害として無効。",
      law: { name: "技能実習法", articles: ["第48条"], summary: "私生活の自由侵害禁止" },
    },
    {
      id: "report-harass",
      title: "ハラスメント相談・救済",
      detail:
        "OTIT母国語ホットラインに加え、都道府県労働局雇用環境・均等部にも申告できる。",
    },
  ],
  commonTroubles: [
    {
      id: "scope-expansion-without-edu",
      title: "教育未了のまま作業範囲を拡大",
      detail:
        "2号移行で取扱い設備が増えるが、必要な特別教育・技能講習を受講させずに従事させ、被災時に教育未実施が判明する。",
      mitigation:
        "実習計画の作業項目と必要資格をマッピングし、移行前に教育を完了させるチェックリストを運用。",
    },
    {
      id: "overtime-trouble",
      title: "違法な長時間残業",
      detail:
        "36協定未締結・上限超え残業、年720時間超の長時間労働。健康障害につながる。",
      mitigation:
        "労働時間管理を客観的記録で実施し、月80時間超過時は産業医面接指導を実施。",
    },
  ],
  sources: [
    { name: "外国人技能実習機構（OTIT）" },
    { name: "厚生労働省 技能実習制度運用要領" },
  ],
};

/**
 * 技能実習3号 — fourth- and fifth-year trainees at "excellent" implementing
 * organisations (優良な実習実施者・監理団体). After one-month return to home
 * country, the worker may resume training for up to two more years.
 */
export const TECHNICAL_INTERN_3: ResidenceStatusRule = {
  id: "technical-intern-3",
  category: "training",
  labelJa: "技能実習3号",
  labelEn: "Technical Intern Training (iii)",
  summary:
    "2号修了・技能検定3級合格者で、優良な実習実施者・監理団体に限り受入可能な4〜5年目の実習生。",
  periodOfStay: "2年以内",
  workScope:
    "2号と同一職種・作業。優良要件を満たさない事業所では3号受入不可。",
  unlimitedWorkScope: false,
  transferAllowed: false,
  relevantSafetyLaws: [
    {
      name: "技能実習法",
      summary:
        "優良要件（技能等の修得状況・法令遵守・指導体制等）の点数評価で6割以上の事業所のみ3号受入が認められる。",
    },
    { name: "労働安全衛生法", summary: "1号・2号と同様、国籍を問わず全規定が適用。" },
  ],
  employerObligations: [
    {
      id: "excellent-status",
      title: "優良な実習実施者要件の維持",
      detail:
        "3号受入期間中も優良ポイント（実習成果・法令遵守・指導体制・適正な処遇等）を継続的に満たす必要がある。",
    },
    {
      id: "re-enter-support",
      title: "一時帰国・再入国の支援",
      detail:
        "2号修了後の1か月以上の一時帰国、3号開始時の再入国手続きで実習生に経済的負担を負わせない。",
    },
    {
      id: "career-path",
      title: "特定技能への接続支援（任意）",
      detail:
        "3号修了は特定技能1号の技能水準・日本語水準を満たすとみなされる。希望者には特定技能ビザ申請を支援。",
    },
  ],
  workerRights: [
    {
      id: "ssw-eligibility",
      title: "特定技能1号への移行資格",
      detail:
        "3号修了（または2号良好修了）は特定技能1号の試験免除事由。引き続き日本で就労を希望できる。",
    },
    {
      id: "skills-test-2",
      title: "技能検定2級受検の機会",
      detail:
        "3号修了時の技能検定2級（または同等試験）受検に必要な時間を確保される。",
    },
  ],
  commonTroubles: [
    {
      id: "excellent-loss",
      title: "優良要件喪失による途中帰国",
      detail:
        "事業所の労災発生・法令違反で優良要件を満たさなくなり、3号実習が継続できなくなる。",
      mitigation:
        "労災ゼロを優良要件評価の最重要指標と認識し、安全衛生委員会で日常的に管理。",
    },
  ],
  sources: [
    { name: "外国人技能実習機構（OTIT）" },
    { name: "厚生労働省 優良な実習実施者の要件" },
  ],
};

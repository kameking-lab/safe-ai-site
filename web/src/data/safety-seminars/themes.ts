export const SAFETY_SEMINAR_HUB_PATH = "/training/safety-seminars";
export const FALL_PREVENTION_SEMINAR_PATH =
  "/training/safety-seminars/fall-prevention";

export type PublishedSafetySeminar = {
  id: string;
  status: "published";
  title: string;
  audience: string;
  standardDuration: string;
  slideCount: number;
  hasAudio: true;
  formats: readonly ["PowerPoint", "PDF"];
  href: string;
};

export type ComingSoonSafetySeminar = {
  id: string;
  status: "coming-soon";
  title: string;
  audience: string;
};

export type SafetySeminar =
  | PublishedSafetySeminar
  | ComingSoonSafetySeminar;

export const SAFETY_SEMINARS: readonly SafetySeminar[] = [
  {
    id: "fall-prevention",
    status: "published",
    title: "墜落・転落防止とフルハーネスの実務",
    audience: "建設現場の作業者・職長・安全衛生担当者",
    standardDuration: "約35〜50分（演習込み約60分）",
    slideCount: 20,
    hasAudio: true,
    formats: ["PowerPoint", "PDF"],
    href: FALL_PREVENTION_SEMINAR_PATH,
  },
  {
    id: "heat-illness-implementation",
    status: "coming-soon",
    title: "熱中症対策の実装",
    audience: "作業者・職長・安全衛生担当者",
  },
  {
    id: "scaffolds-ladders-openings",
    status: "coming-soon",
    title: "足場・脚立・開口部の安全",
    audience: "建設現場の作業者・職長",
  },
  {
    id: "heavy-equipment-contact",
    status: "coming-soon",
    title: "重機・車両との接触防止",
    audience: "オペレーター・誘導者・職長",
  },
  {
    id: "crane-rigging",
    status: "coming-soon",
    title: "クレーン・玉掛け・吊り荷周辺の安全",
    audience: "玉掛け作業者・合図者・職長",
  },
  {
    id: "chemicals-sds-risk-assessment",
    status: "coming-soon",
    title: "化学物質・SDS・リスクアセスメント入門",
    audience: "化学物質を扱う作業者・管理者",
  },
  {
    id: "electrical-work",
    status: "coming-soon",
    title: "電気作業・感電防止の実務",
    audience: "電気作業者・職長・安全衛生担当者",
  },
  {
    id: "hot-work-fire-prevention",
    status: "coming-soon",
    title: "火気・溶接作業の火災防止",
    audience: "火気作業者・監視人・職長",
  },
  {
    id: "visual-kyt",
    status: "coming-soon",
    title: "Visual KYT・伝わるKYの進め方",
    audience: "職長・KY進行者・安全衛生担当者",
  },
  {
    id: "incident-learning",
    status: "coming-soon",
    title: "事故・ヒヤリハットから学ぶ再発防止",
    audience: "全作業者・職長・管理者",
  },
  {
    id: "cargo-forklift-tailgate",
    status: "coming-soon",
    title: "荷役・フォークリフト・テールゲートの安全",
    audience: "荷役作業者・運転者・職長",
  },
  {
    id: "traffic-control-third-party",
    status: "coming-soon",
    title: "交通規制・第三者災害防止",
    audience: "道路作業者・誘導員・職長",
  },
  {
    id: "oxygen-deficiency-confined-spaces",
    status: "coming-soon",
    title: "酸欠・閉所作業の管理者向け基礎",
    audience: "作業責任者・職長・安全衛生担当者",
  },
  {
    id: "asbestos-dust-solvents",
    status: "coming-soon",
    title: "石綿・粉じん・有機溶剤の管理ポイント",
    audience: "作業責任者・職長・安全衛生担当者",
  },
  {
    id: "severe-weather-decisions",
    status: "coming-soon",
    title: "強風・雷・大雨・凍結時の作業判断",
    audience: "職長・現場責任者・安全衛生担当者",
  },
  {
    id: "first-aid-aed-emergency",
    status: "coming-soon",
    title: "応急手当・AED・緊急連絡体制",
    audience: "全作業者・職長・現場責任者",
  },
  {
    id: "new-site-entrants",
    status: "coming-soon",
    title: "新規入場者向け「現場の基本10項目」",
    audience: "新規入場者・教育担当者",
  },
  {
    id: "foreign-worker-communication",
    status: "coming-soon",
    title: "外国人作業員へ伝わる安全教育",
    audience: "職長・教育担当者・通訳担当者",
  },
  {
    id: "older-workers",
    status: "coming-soon",
    title: "高年齢作業者の転倒・腰痛・無理な動作防止",
    audience: "高年齢作業者・職長・安全衛生担当者",
  },
  {
    id: "ppe-selection-inspection",
    status: "coming-soon",
    title: "保護具の選び方・点検・交換",
    audience: "作業者・保護具管理者・職長",
  },
  {
    id: "safety-patrol",
    status: "coming-soon",
    title: "安全パトロールの見方・指摘の書き方",
    audience: "安全衛生担当者・職長・現場責任者",
  },
  {
    id: "construction-plan-review",
    status: "coming-soon",
    title: "施工計画書の安全チェック",
    audience: "工事担当者・現場責任者・安全衛生担当者",
  },
  {
    id: "safe-work-procedures",
    status: "coming-soon",
    title: "作業手順書を安全にする方法",
    audience: "職長・手順書作成者・安全衛生担当者",
  },
  {
    id: "law-changes-to-action",
    status: "coming-soon",
    title: "法改正を現場の行動へ変える研修",
    audience: "安全衛生担当者・管理者・教育担当者",
  },
  {
    id: "contractor-safety-rules",
    status: "coming-soon",
    title: "協力会社へ安全ルールを浸透させる方法",
    audience: "元方担当者・現場責任者・職長",
  },
  {
    id: "incident-investigation-report",
    status: "coming-soon",
    title: "事故調査と再発防止報告書の作り方",
    audience: "事故調査担当者・管理者・安全衛生担当者",
  },
  {
    id: "safety-board-signage",
    status: "coming-soon",
    title: "安全掲示板・サイネージの作り方",
    audience: "安全衛生担当者・職長・教育担当者",
  },
  {
    id: "ai-safety-management-rules",
    status: "coming-soon",
    title: "AIを安全管理へ使う時のルール",
    audience: "安全衛生担当者・管理者・AI利用者",
  },
] as const;

export const PUBLISHED_SAFETY_SEMINARS = SAFETY_SEMINARS.filter(
  (seminar): seminar is PublishedSafetySeminar =>
    seminar.status === "published",
);

export const COMING_SOON_SAFETY_SEMINARS = SAFETY_SEMINARS.filter(
  (seminar): seminar is ComingSoonSafetySeminar =>
    seminar.status === "coming-soon",
);

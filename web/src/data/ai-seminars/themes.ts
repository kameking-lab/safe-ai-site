export type AiSeminarTheme = {
  id: string;
  title: string;
  audience: string;
  status: "published" | "coming-soon";
  href?: string;
  standardDuration?: string;
  slideCount?: number;
  formats?: readonly string[];
};

export const AI_SEMINAR_HUB_PATH = "/training/ai-seminars";
export const AI_CHAT_WORK_PATH = `${AI_SEMINAR_HUB_PATH}/ai-chat-work`;

export const AI_SEMINAR_THEMES: readonly AiSeminarTheme[] = [
  {
    id: "ai-chat-work",
    title: "AIチャット仕事術",
    audience: "生成AIの初心者・利用者・管理職・導入担当者",
    status: "published",
    href: AI_CHAT_WORK_PATH,
    standardDuration: "音声約35〜50分／演習込み約60分",
    slideCount: 20,
    formats: ["PowerPoint", "PDF"],
  },
  { id: "prompt-practice", title: "仕事で使えるプロンプト実践", audience: "生成AIを日常業務で使う人", status: "coming-soon" },
  { id: "ai-research", title: "AIで調査・情報収集する方法", audience: "調査・企画・管理部門", status: "coming-soon" },
  { id: "ai-documents", title: "AIで文書・報告書を作る", audience: "文書作成を行う全職種", status: "coming-soon" },
  { id: "ai-excel", title: "AIでExcel・データ分析", audience: "集計・分析担当者", status: "coming-soon" },
  { id: "ai-powerpoint", title: "AIでPowerPoint・研修資料を作る", audience: "企画・教育担当者", status: "coming-soon" },
  { id: "ai-images", title: "AI画像生成の実務利用", audience: "広報・資料作成担当者", status: "coming-soon" },
  { id: "vibe-coding-basics", title: "バイブコーディング入門", audience: "非エンジニア・初学者", status: "coming-soon" },
  { id: "vibe-coding-practice", title: "バイブコーディング実践", audience: "AIで試作を進めたい人", status: "coming-soon" },
  { id: "no-code-app", title: "非エンジニアの業務アプリ作成", audience: "業務改善担当者", status: "coming-soon" },
  { id: "ai-automation", title: "AIで業務自動化", audience: "定型業務を減らしたい人", status: "coming-soon" },
  { id: "ai-agents", title: "AIエージェント入門", audience: "AI導入・業務設計担当者", status: "coming-soon" },
  { id: "rag-basics", title: "社内データをAIで検索するRAG入門", audience: "情報システム・導入担当者", status: "coming-soon" },
  { id: "spot-ai-errors", title: "AIの間違いを見抜く方法", audience: "AIの回答を業務利用する人", status: "coming-soon" },
  { id: "ai-privacy", title: "生成AIと個人情報・機密情報", audience: "全利用者・管理部門", status: "coming-soon" },
  { id: "ai-copyright", title: "生成AIと著作権", audience: "企画・広報・制作担当者", status: "coming-soon" },
  { id: "ai-policy", title: "会社のAI利用ルールを作る", audience: "管理職・法務・情報システム", status: "coming-soon" },
  { id: "ai-for-managers", title: "管理職向け生成AI研修", audience: "管理職・チーム責任者", status: "coming-soon" },
  { id: "ai-for-executives", title: "経営者向けAI活用研修", audience: "経営者・事業責任者", status: "coming-soon" },
  { id: "ai-implementation", title: "AI導入担当者向け実践研修", audience: "AI導入プロジェクト担当者", status: "coming-soon" },
  { id: "ai-safety-health", title: "AI×安全衛生業務", audience: "安全衛生担当者", status: "coming-soon" },
  { id: "ai-construction", title: "AI×建設業務", audience: "建設業の実務担当者", status: "coming-soon" },
  { id: "ai-manuals", title: "AIで社内マニュアルを作る", audience: "教育・業務標準化担当者", status: "coming-soon" },
  { id: "ai-video-learning", title: "AIで動画・eラーニングを作る", audience: "教育・研修担当者", status: "coming-soon" },
  { id: "agentic-automation", title: "AIエージェントで仕事を全自動化する", audience: "業務自動化・管理担当者", status: "coming-soon" },
] as const;

export const PUBLISHED_AI_SEMINARS = AI_SEMINAR_THEMES.filter(
  (theme) => theme.status === "published",
);

export const COMING_SOON_AI_SEMINARS = AI_SEMINAR_THEMES.filter(
  (theme) => theme.status === "coming-soon",
);

export type WorkSupportService = {
  id: string;
  title: string;
  summary: string;
  /** 公開済みのココナラサービスだけを設定する。 */
  listings: readonly {
    title: string;
    url: string;
  }[];
};

export const WORK_SUPPORT_SERVICES: readonly WorkSupportService[] = [
  {
    id: "excel-automation",
    title: "Excel・帳票自動化",
    summary: "転記、集計、CSV取込、PDF出力など、範囲を固定した定型作業の改善。",
    listings: [
      {
        title: "AI・Excel自動化診断",
        url: "https://coconala.com/services/4349455",
      },
      {
        title: "Excel定型作業を1つ自動化",
        url: "https://coconala.com/services/4349467",
      },
      {
        title: "CSV・PDF・ファイル整理自動化",
        url: "https://coconala.com/services/4349671",
      },
    ],
  },
  {
    id: "safety-materials",
    title: "安全教育資料",
    summary: "安全大会資料、読み上げ原稿、確認クイズなどの定型資料制作。",
    listings: [
      {
        title: "安全大会スライド・読み上げ原稿",
        url: "https://coconala.com/services/4349680",
      },
      {
        title: "建設・安全書類レビュー",
        url: "https://coconala.com/services/4349684",
      },
    ],
  },
  {
    id: "kyt-materials",
    title: "KYT資料",
    summary: "利用権を確認できる写真を基に、危険ポイントと対策を整理。",
    listings: [
      {
        title: "現場写真からKYTシートを作成",
        url: "https://coconala.com/services/4349672",
      },
    ],
  },
  {
    id: "ai-beginner-lesson",
    title: "AI初心者レッスン",
    summary: "画面共有を中心に、個人情報を入力しない使い方から説明。",
    listings: [
      {
        title: "ChatGPT超初心者レッスン",
        url: "https://coconala.com/services/3883056",
      },
      {
        title: "オリジナルAIプロンプト10本",
        url: "https://coconala.com/services/4349664",
      },
    ],
  },
  {
    id: "claude-code-setup",
    title: "Claude Code導入支援",
    summary: "Windows環境確認、初期設定、定型作業1件と操作説明。",
    listings: [
      {
        title: "Claude Code導入支援",
        url: "https://coconala.com/services/4349470",
      },
    ],
  },
] as const;

export function getPublishedMarketplaceUrl(
  value: string | null,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      host !== "coconala.com" ||
      !/^\/services\/\d+\/?$/u.test(url.pathname) ||
      url.search !== "" ||
      url.hash !== "" ||
      url.username !== "" ||
      url.password !== ""
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

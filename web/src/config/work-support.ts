export type WorkSupportService = {
  id: string;
  title: string;
  summary: string;
  /** 公開済みのココナラサービスURLだけを設定する。未確定時はnull。 */
  marketplaceUrl: string | null;
};

export const WORK_SUPPORT_SERVICES: readonly WorkSupportService[] = [
  {
    id: "excel-automation",
    title: "Excel・帳票自動化",
    summary: "転記、集計、CSV取込、PDF出力など、範囲を固定した定型作業の改善。",
    marketplaceUrl: null,
  },
  {
    id: "safety-materials",
    title: "安全教育資料",
    summary: "安全大会資料、読み上げ原稿、確認クイズなどの定型資料制作。",
    marketplaceUrl: null,
  },
  {
    id: "kyt-materials",
    title: "KYT資料",
    summary: "利用権を確認できる写真を基に、危険ポイントと対策を整理。",
    marketplaceUrl: null,
  },
  {
    id: "ai-beginner-lesson",
    title: "AI初心者レッスン",
    summary: "画面共有を中心に、個人情報を入力しない使い方から説明。",
    marketplaceUrl: null,
  },
  {
    id: "claude-code-setup",
    title: "Claude Code導入支援",
    summary: "Windows環境確認、初期設定、定型作業1件と操作説明。",
    marketplaceUrl: null,
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
      !(host === "coconala.com" || host.endsWith(".coconala.com"))
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

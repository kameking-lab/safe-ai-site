/**
 * P0-016 (usability-audit-day3-2026-05-24):
 * 法令条文・通達のお気に入り (お気に入り = ブックマーク) を端末内に保存する
 * 共通ストア。
 *
 * 監査で「現場で参照する条文を保存できない、報告書に貼り付けるユースケース
 * 不可」と指摘された問題への対処。/law-search・/circulars の両方で使用する
 * ことを前提に、種別ごと (article / notice) に名前空間を分離する。
 *
 * 設計:
 * - キー: `safe-ai:favorites:v1`
 * - 保存数上限: 50 件 (article + notice 合計)
 * - 各 record: kind + id + title + subtitle + href + addedAt
 * - 重複追加 (同一 kind+id) はスキップ
 * - SSR 対応 (typeof window チェック)
 */

const STORAGE_KEY = "safe-ai:favorites:v1";
const MAX_FAVORITES = 50;

export type FavoriteKind = "article" | "notice" | "accident";

export type FavoriteEntry = {
  kind: FavoriteKind;
  /** kind 内でユニーク。article は `${law}|${articleNum}` を推奨、notice は notice.id */
  id: string;
  /** 表示用見出し (条文タイトル or 通達タイトル) */
  title: string;
  /** 1 行のメタ情報 (法令短縮名+条番号、発出機関+日付など) */
  subtitle: string;
  /** クリックで開く先 (本文ページや e-Gov など) */
  href: string;
  /** お気に入り追加日時 ISO */
  addedAt: string;
};

function safeRead(): FavoriteEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is FavoriteEntry =>
        e !== null &&
        typeof e === "object" &&
        (e.kind === "article" || e.kind === "notice" || e.kind === "accident") &&
        typeof e.id === "string" &&
        typeof e.title === "string" &&
        typeof e.href === "string",
    );
  } catch {
    return [];
  }
}

function safeWrite(entries: FavoriteEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota / disabled
  }
}

export function loadFavorites(): FavoriteEntry[] {
  return safeRead().sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function loadFavoritesByKind(kind: FavoriteKind): FavoriteEntry[] {
  return loadFavorites().filter((e) => e.kind === kind);
}

export function isFavorited(kind: FavoriteKind, id: string): boolean {
  if (typeof window === "undefined") return false;
  return safeRead().some((e) => e.kind === kind && e.id === id);
}

export function toggleFavorite(entry: Omit<FavoriteEntry, "addedAt">): {
  added: boolean;
  list: FavoriteEntry[];
} {
  const current = safeRead();
  const idx = current.findIndex(
    (e) => e.kind === entry.kind && e.id === entry.id,
  );
  if (idx >= 0) {
    const next = current.filter((_, i) => i !== idx);
    safeWrite(next);
    return { added: false, list: next };
  }
  const newEntry: FavoriteEntry = {
    ...entry,
    addedAt: new Date().toISOString(),
  };
  const next = [newEntry, ...current].slice(0, MAX_FAVORITES);
  safeWrite(next);
  return { added: true, list: next };
}

export function removeFavorite(kind: FavoriteKind, id: string) {
  const current = safeRead();
  const next = current.filter((e) => !(e.kind === kind && e.id === id));
  safeWrite(next);
}

export function clearFavorites() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * P0-016: 引用テキストの整形ヘルパー。
 * 条文用フォーマット:
 *   「{条文本文}」（{法令名(短縮名)}第{条番号}、{出典URL}）
 *
 * 通達用フォーマット:
 *   「{通達タイトル}」（{発出機関}、{通達番号}、{出典URL}）
 */
export function formatArticleCitation(input: {
  text: string;
  lawShort: string;
  lawFull?: string;
  articleNum: string;
  egovUrl?: string;
}): string {
  const law = input.lawFull ? `${input.lawFull}（${input.lawShort}）` : input.lawShort;
  const meta = `${law}${input.articleNum}`;
  const url = input.egovUrl ? `、出典: ${input.egovUrl}` : "";
  return `「${input.text.trim()}」（${meta}${url}）`;
}

export function formatNoticeCitation(input: {
  title: string;
  issuer?: string;
  noticeNumber?: string;
  issuedDate?: string;
  url?: string;
}): string {
  const parts: string[] = [];
  if (input.issuer) parts.push(input.issuer);
  if (input.noticeNumber) parts.push(input.noticeNumber);
  if (input.issuedDate) parts.push(input.issuedDate);
  if (input.url) parts.push(`出典: ${input.url}`);
  const meta = parts.length > 0 ? `（${parts.join("、")}）` : "";
  return `「${input.title.trim()}」${meta}`;
}

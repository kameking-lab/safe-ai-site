import approvedJson from "@/data/news-feed/approved/index.json";
import type { NewsFeedDataset, NewsFeedEntry } from "@/lib/types/domain";

/**
 * Loader for news-feed entries that passed explicit human review.
 *
 * The dataset is produced by the daily GitHub Actions workflow
 * (`.github/workflows/news-feed-daily.yml`) which runs:
 *   1. scripts/etl/fetch-news-feed.mjs  — RSS fetch + keyword pre-filter
 *   2. scripts/etl/news-ai-judge.mjs    — deterministic filter + review queue
 *
 * UI surfaces:
 *   - /accidents 「報道・自動収集」 section (warning-styled box)
 *
 * The data is intentionally excluded from the 25-axis statistics dashboard
 * at /accidents-analytics — these entries are headline-level only and
 * lack the structured fields (industry, severity, age, prefecture) that
 * aggregations depend on. The count is surfaced separately on /accidents.
 */
const dataset = approvedJson as NewsFeedDataset;

export function getNewsFeedEntries(): readonly NewsFeedEntry[] {
  return (dataset.entries ?? []).filter(
    (entry) =>
      entry.approved === true &&
      (entry as NewsFeedEntry & { humanReviewed?: boolean }).humanReviewed === true,
  );
}

export function getNewsFeedUpdatedAt(): string {
  return dataset.updatedAt ?? "1970-01-01T00:00:00.000Z";
}

export function getNewsFeedCount(): number {
  return getNewsFeedEntries().length;
}

/**
 * Most-recent N approved entries for surface-level UI cards.
 * Caller is expected to cap further if the section is tighter than 20.
 */
export function getRecentNewsFeedEntries(limit = 20): readonly NewsFeedEntry[] {
  return getNewsFeedEntries().slice(0, limit);
}

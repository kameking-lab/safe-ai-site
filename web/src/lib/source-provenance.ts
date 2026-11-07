/** Public source facts. An absent field stays absent; timestamps are never inferred. */
export type SourceProvenance = {
  url?: string;
  version?: string;
  fetchedAt?: string;
  checkedAt?: string;
  checkKind?: "revision" | "publication-excerpt";
};

export function isSourceTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.toISOString().slice(0, 10) !== value.slice(0, 10)) return false;
  if (value.length > 10 && (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59)) return false;
  return Number.isFinite(Date.parse(value));
}

export function normalizeSourceProvenance(value: unknown): SourceProvenance | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Record<string, unknown>;
  const output: SourceProvenance = {};
  if (typeof input.url === "string" && input.url.length <= 2048) {
    try {
      const url = new URL(input.url);
      if (url.protocol === "https:" && url.hostname.endsWith(".go.jp") && !url.username && !url.password) output.url = input.url;
    } catch { /* Leave an invalid source URL unregistered. */ }
  }
  if (typeof input.version === "string" && /^(?:[0-9A-Z]{15}_)?\d{8}_[0-9A-Z]{15}$/.test(input.version)) output.version = input.version;
  if (isSourceTimestamp(input.fetchedAt)) output.fetchedAt = input.fetchedAt;
  if (isSourceTimestamp(input.checkedAt) && (input.checkKind === "revision" || input.checkKind === "publication-excerpt")) {
    output.checkedAt = input.checkedAt;
    output.checkKind = input.checkKind;
  }
  return Object.keys(output).length ? output : undefined;
}

export function sourceDateLabel(value: string): string {
  if (value.length === 10) return value;
  return `${new Date(Date.parse(value) + 9 * 3_600_000).toISOString().slice(0, 10)}（JST）`;
}

export function sourceCheckLabel(kind: SourceProvenance["checkKind"]): string {
  return kind === "revision" ? "原典版の照合" : "原典抜粋の照合";
}

export function formatSourceProvenance(value: SourceProvenance | undefined): string {
  const source = normalizeSourceProvenance(value);
  if (!source) return "";
  return [
    source.url ? `原典URL: ${source.url}` : undefined,
    source.version ? `原典版: ${source.version}` : undefined,
    source.fetchedAt ? `取得日: ${sourceDateLabel(source.fetchedAt)}` : undefined,
    source.checkedAt ? `最終確認: ${sourceDateLabel(source.checkedAt)}（${sourceCheckLabel(source.checkKind)}）` : undefined,
  ].filter(Boolean).join("\n");
}

export type LegacyEditorSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type LegacyEditorPageProps = {
  searchParams?: Promise<LegacyEditorSearchParams>;
};

/** Keep non-routing context from retired diary URLs while forcing the current editor. */
export async function buildLegacyEditorHref(
  searchParams?: Promise<LegacyEditorSearchParams>,
): Promise<string> {
  const source = (await searchParams) ?? {};
  const target = new URLSearchParams();

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string") {
      target.append(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) target.append(key, item);
    }
  }
  target.set("edit", "1");
  return `/safety-diary?${target.toString()}`;
}

/** Accept official XML or JSON law AST without changing the existing import gates. */
export function lawResponseXml(body: string, lawId: string): string {
  if (!body.trimStart().startsWith("{")) return body;
  const payload: unknown = JSON.parse(body);
  const record = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("invalid e-Gov response object");
    }
    return value as Record<string, unknown>;
  };
  const response = record(payload);
  const revision = record(response.revision_info).law_revision_id;
  if (typeof revision !== "string" || !revision.startsWith(`${lawId}_`)) {
    throw new Error("e-Gov response law/revision mismatch");
  }
  const escape = (value: string) => value.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const serialize = (value: unknown): string => {
    if (typeof value === "string") return escape(value);
    const node = record(value);
    if (typeof node.tag !== "string" || !/^[A-Za-z][A-Za-z0-9]*$/.test(node.tag)) {
      throw new Error("invalid e-Gov AST tag");
    }
    const attrs = node.attr === undefined ? {} : record(node.attr);
    const attributes = Object.entries(attrs).map(([key, val]) => {
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key) || !["string", "number", "boolean"].includes(typeof val)) {
        throw new Error("invalid e-Gov AST attribute");
      }
      return ` ${key}="${escape(String(val))}"`;
    }).join("");
    if (node.children !== undefined && !Array.isArray(node.children)) {
      throw new Error("invalid e-Gov AST children");
    }
    const children = (node.children ?? []) as unknown[];
    return `<${node.tag}${attributes}>${children.map(serialize).join("")}</${node.tag}>`;
  };
  const law = record(response.law_full_text);
  if (law.tag !== "Law") throw new Error("missing e-Gov Law AST");
  return `<law_revision_id>${escape(revision)}</law_revision_id>${serialize(law)}`;
}

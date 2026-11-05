import type { SupplementDataset, SupplementDocument, XmlNode } from "./types";

const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function renderXmlNode(node: XmlNode): string {
  if (node.tag.startsWith("#")) return "";
  const content = escape(node.text ?? "") + node.children.map(renderXmlNode).join("");
  const tail = escape(node.tail ?? "");
  if (node.tag === "Fig") return `<p class="warning">図・様式画像は未取得です。この表示だけでは確認を完結できません。</p>${tail}`;
  const tag = ({ Table: "table", TableRow: "tr", TableHeaderRow: "tr", TableColumn: "td",
    TableHeaderColumn: "th", Ruby: "ruby", Rt: "rt", Sentence: "span", Line: "span",
    Sup: "sup", Sub: "sub", ArithFormula: "span" } as Record<string, string>)[node.tag] ?? "div";
  const spans = tag === "td" || tag === "th" ? ["rowspan", "colspan"].map(name =>
    /^[1-9][0-9]{0,2}$/.test(node.attributes[name] ?? "") ? ` ${name}="${node.attributes[name]}"` : "").join("") : "";
  return `<${tag}${spans}>${content}</${tag}>${tail}`;
}

export function renderSupplementDocument(dataset: SupplementDataset, document: SupplementDocument): string {
  const law = dataset.laws.find(item => item.lawId === document.lawId)!;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(law.title)} ${escape(document.label)}</title><style>body{font-family:system-ui,sans-serif;max-width:70rem;margin:auto;padding:1rem;line-height:1.8}main{overflow-wrap:anywhere}.original{overflow-x:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #64748b;padding:.5rem;vertical-align:top}ruby rt{font-size:.65em}.warning{padding:.6rem;background:#fff4ce}details{margin-block:1rem}div{margin-block:.25rem}a{color:#0645ad}</style></head><body><main><h1>${escape(law.title)} ${escape(document.label)}</h1><p>資料対象日 ${escape(dataset.asOf)} / 取得日時 ${escape(law.retrievedAt)}</p><p class="warning">取得した原文を確認するための表示です。改正附則の経過措置・施行条件・準用の適用判断は未確認です。</p>${document.hasFigures ? '<p class="warning">参照画像を取得していないため、図や様式の確認は未完了です。</p>' : ""}<p><a href="${escape(law.sourceUrl)}" rel="noopener noreferrer">取得元の公式資料</a></p><details><summary>原典の版と本文位置</summary><p>履歴ID: ${escape(law.revisionId)}</p><p>本文位置: ${escape(document.path)}</p><p>原XML SHA256: ${escape(law.xmlSha256)}</p></details><section class="original" aria-label="取得した原文">${renderXmlNode(document.node)}</section></main></body></html>`;
}

export function escapeAutomationConsultHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function multilineAutomationConsultHtml(value: string): string {
  return escapeAutomationConsultHtml(value).replaceAll("\n", "<br>");
}

export function sanitizeAutomationConsultSourcePage(value: string): string {
  return value === "/services/automation" ? value : "/services/automation";
}

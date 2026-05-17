import fs from "node:fs/promises";
const file = "audit-out/audit-before.json";
// strip MSYS-induced path prefix (Git Bash converts leading "/" to "C:/Program Files/Git/")
const stripMsys = (v) => v?.replace(/^[A-Z]:\/Program Files\/Git\//i, "/") || "";
const url = stripMsys(process.env.AUDIT_URL) || "/";
const viewport = process.env.AUDIT_VP || "iphone-se";
const r = JSON.parse(await fs.readFile(file, "utf8"));
const run = r.runs.find((x) => x.url === url && x.viewport === viewport);
if (!run) {
  console.log("no run", url, viewport);
  process.exit(0);
}
console.log(`# ${url} @ ${viewport}`);
console.log(JSON.stringify(run.issues, null, 2));

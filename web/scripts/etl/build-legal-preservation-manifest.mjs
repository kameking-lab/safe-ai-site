// Inventory checked-in source bytes after an intentional, verified ETL update.
// This inventory is a preservation check, not expert review or proof of legal applicability.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const path = resolve(root, "web/src/data/legal-source-preservation-manifest-current.json");
const manifest = JSON.parse(readFileSync(path, "utf8"));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const collect = (dir) => statSync(dir).isFile() ? [dir] : readdirSync(dir, { withFileTypes: true })
  .flatMap((entry) => entry.isDirectory() ? collect(join(dir, entry.name)) : entry.isFile() ? [join(dir, entry.name)] : []);
const canonical = (bytes, name) => {
  if (!/\.(json|jsonl|ts)$/.test(name)) return bytes;
  const output = Buffer.allocUnsafe(bytes.length);
  let offset = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 13 && bytes[index + 1] === 10) continue;
    output[offset++] = bytes[index];
  }
  return output.subarray(0, offset);
};
for (const corpus of manifest.corpora) {
  const files = corpus.roots.flatMap((dir) => collect(resolve(root, dir)))
    .map((file) => ({ file, name: relative(root, file).replaceAll("\\", "/") }))
    .filter(({ name }) => !/\.(?:spec|test)\.[^/]+$/.test(name))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const contents = files.map(({ file, name }) => ({ name, bytes: canonical(readFileSync(file), name) }));
  corpus.fileCount = files.length;
  corpus.bytes = contents.reduce((sum, { bytes }) => sum + bytes.length, 0);
  corpus.manifestSha256 = sha(contents.map(({ name, bytes }) => `${sha(bytes)}  ${name}\n`).join(""));
}
manifest.generatedAtJst = new Date(Date.now() + 9 * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "+09:00");
writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest.corpora.map(({ id, fileCount }) => ({ id, fileCount }))));
